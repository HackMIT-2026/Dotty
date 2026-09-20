from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from .. import db
from ..auth import check_access, current_user, family_of_patient, require_role
from ..models import NoteIn, PlanIn
from ..services.alerts import notify, recipients
from ..services import tasks as care
from ..util import new_id, now, pub, zone

router = APIRouter(tags=["patients"])

SUMMARY_DAYS = 14


def _summary(pid: str) -> dict:
    child = db.users.find_one({"_id": pid}, {"name": 1})
    since = now() - timedelta(days=SUMMARY_DAYS)
    readings = list(
        db.events.find({"patient_id": pid, "type": "reading", **db.CHECKED, "ts": {"$gte": since}}, {"ts": 1, "data": 1}).sort("ts", 1)
    )
    values = [r["data"]["bg_mgdl"] for r in readings]
    plan = db.plans.find_one({"patient_id": pid})
    low, high = (plan["target"]["low"], plan["target"]["high"]) if plan else (70, 180)
    in_range = sum(1 for v in values if low <= v <= high)
    last = readings[-1] if readings else None
    fam = family_of_patient(pid) or {}
    return {
        "id": pid,
        "name": child["name"] if child else "?",
        "family_code": fam.get("code"),
        "glucose_unit": fam.get("glucose_unit", "mg/dL"),
        "tir_pct": round(100 * in_range / len(values)) if values else None,
        "avg_mgdl": round(sum(values) / len(values)) if values else None,
        "readings_count": len(values),
        "last_reading": {"bg_mgdl": last["data"]["bg_mgdl"], "ts": last["ts"]} if last else None,
        "plan_version": plan["version"] if plan else None,
        "adherence_pct": care.adherence(pid, SUMMARY_DAYS, zone(fam.get("tz")), now())["rate_pct"],
        "tasks_count": len(care.active_tasks(pid)),
        "open_alerts": db.notifications.count_documents(
            {"user_id": fam.get("clinician_id"), "read_at": None, "data.patient_id": pid}
        ),
    }


@router.get("/patients")
def list_patients(user: dict = Depends(require_role("clinician"))):
    return [_summary(pid) for pid in user.get("patient_ids", [])]


@router.get("/patients/{patient_id}/events")
def patient_events(
    patient_id: str,
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = None,
    type: str | None = None,
    flagged: bool = False,
    user: dict = Depends(current_user),
):
    check_access(user, patient_id)
    # Flagged logs are left out of the clinical picture by default; `flagged=true` shows them for a look.
    query: dict = {"patient_id": patient_id} if flagged else {"patient_id": patient_id, **db.CHECKED}
    if from_ or to:
        query["ts"] = {**({"$gte": from_} if from_ else {}), **({"$lte": to} if to else {})}
    if type:
        query["type"] = type
    return [pub(e) for e in db.events.find(query).sort("ts", 1).limit(5000)]


@router.post("/patients/{patient_id}/events/{event_id}/discard")
def discard_event(patient_id: str, event_id: str, user: dict = Depends(require_role("clinician", "parent"))):
    """Set aside a log the care team doesn't believe — a mistyped meter reading, a meal logged twice.

    Nothing is erased: the event keeps its place in the log with who set it aside and when, and it can be put
    back. It is marked the same way spammed logs are (services/integrity.py), so from here on it stays out of
    every chart, total and care-plan task. Dots already paid for it are left alone — those are the child's.
    """
    check_access(user, patient_id)
    event = db.events.find_one({"_id": event_id, "patient_id": patient_id})
    if not event:
        raise HTTPException(404, "No such event")
    db.events.update_one(
        {"_id": event_id},
        {
            "$set": {"suspect": True, "flags": ["discarded"], "discarded_by": user["_id"], "discarded_at": now()},
            "$unset": {"restored_by": ""},
        },
    )
    return pub(db.events.find_one({"_id": event_id}))


@router.post("/patients/{patient_id}/events/{event_id}/restore")
def restore_event(patient_id: str, event_id: str, user: dict = Depends(require_role("clinician", "parent"))):
    """Put a log back: the care team's judgement also overrules the spam check."""
    check_access(user, patient_id)
    event = db.events.find_one({"_id": event_id, "patient_id": patient_id})
    if not event:
        raise HTTPException(404, "No such event")
    db.events.update_one(
        {"_id": event_id},
        {"$set": {"restored_by": user["_id"]}, "$unset": {"suspect": "", "flags": "", "discarded_by": "", "discarded_at": ""}},
    )
    return pub(db.events.find_one({"_id": event_id}))


@router.get("/patients/{patient_id}/plan")
def get_plan(patient_id: str, user: dict = Depends(current_user)):
    check_access(user, patient_id)
    plan = db.plans.find_one({"patient_id": patient_id})
    if not plan:
        raise HTTPException(404, "No treatment plan yet")
    return pub(plan)


@router.put("/patients/{patient_id}/plan")
def put_plan(patient_id: str, body: PlanIn, user: dict = Depends(require_role("clinician"))):
    check_access(user, patient_id)
    existing = db.plans.find_one({"patient_id": patient_id})
    version = (existing["version"] + 1) if existing else 1
    plan = {
        "_id": existing["_id"] if existing else new_id(),
        "patient_id": patient_id,
        "clinician_id": user["_id"],
        **body.model_dump(),
        "version": version,
        "updated_at": now(),
    }
    db.plans.replace_one({"patient_id": patient_id}, plan, upsert=True)
    _, parents, _ = recipients(patient_id)
    for uid in parents:
        notify(
            uid,
            "clinician_note",
            f"Treatment plan updated (v{version})",
            f"{user['name']} updated the treatment plan.",
            {"patient_id": patient_id, "plan_version": version},
        )
    return pub(plan)


@router.get("/patients/{patient_id}/notes")
def list_notes(patient_id: str, user: dict = Depends(current_user)):
    check_access(user, patient_id)
    return [pub(n) for n in db.notes.find({"patient_id": patient_id}).sort("created_at", -1).limit(100)]


@router.delete("/patients/{patient_id}/notes/{note_id}")
def delete_note(patient_id: str, note_id: str, user: dict = Depends(require_role("clinician"))):
    """Take a note back. The parent's notification for it goes too, so a mistake does not linger on their phone."""
    check_access(user, patient_id)
    note = db.notes.find_one({"_id": note_id, "patient_id": patient_id})
    if not note:
        raise HTTPException(404, "No such note")
    if note["clinician_id"] != user["_id"]:
        raise HTTPException(403, "Only the clinician who wrote the note can remove it")
    db.notes.delete_one({"_id": note_id})
    db.notifications.delete_many({"data.note_id": note_id})
    return {"ok": True}


@router.post("/patients/{patient_id}/notes")
def add_note(patient_id: str, body: NoteIn, user: dict = Depends(require_role("clinician"))):
    check_access(user, patient_id)
    note = {
        "_id": new_id(),
        "patient_id": patient_id,
        "clinician_id": user["_id"],
        "author_id": user["_id"],
        "author_role": "clinician",
        "author_name": user["name"],
        "text": body.text.strip(),
        "created_at": now(),
    }
    db.notes.insert_one(note)
    _, parents, _ = recipients(patient_id)
    for uid in parents:
        notify(uid, "clinician_note", f"Note from {user['name']}", note["text"], {"patient_id": patient_id, "note_id": note["_id"]})
    return pub(note)


@router.post("/patients/{patient_id}/notes/from-parent")
def add_parent_note(patient_id: str, body: NoteIn, user: dict = Depends(require_role("parent"))):
    check_access(user, patient_id)
    family = family_of_patient(patient_id)
    clinician_id = family.get("clinician_id") if family else None
    if not clinician_id:
        raise HTTPException(409, "This family does not have a clinician yet")
    child = db.users.find_one({"_id": patient_id}, {"name": 1})
    patient_name = child["name"] if child else "Patient"
    clinician = db.users.find_one({"_id": clinician_id}, {"name": 1})
    clinician_name = clinician["name"] if clinician else "your doctor"
    note = {
        "_id": new_id(),
        "patient_id": patient_id,
        "clinician_id": clinician_id,
        "author_id": user["_id"],
        "author_role": "parent",
        "author_name": user["name"],
        "text": body.text.strip(),
        "created_at": now(),
    }
    db.notes.insert_one(note)
    notify(
        clinician_id,
        "parent_note",
        f"{user['name']} ({patient_name})",
        note["text"],
        {"patient_id": patient_id, "note_id": note["_id"]},
    )
    parent_notification_id = notify(
        user["_id"],
        "parent_note",
        f"You sent to {clinician_name}",
        note["text"],
        {"patient_id": patient_id, "note_id": note["_id"]},
    )
    if parent_notification_id:
        db.notifications.update_one({"_id": parent_notification_id}, {"$set": {"read_at": now()}})
    return pub(note)
