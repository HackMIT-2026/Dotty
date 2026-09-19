from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from .. import db
from ..auth import check_access, current_user, family_of_patient, require_role
from ..models import NoteIn, PlanIn
from ..services.alerts import notify, recipients
from ..util import new_id, now, pub

router = APIRouter(tags=["patients"])

SUMMARY_DAYS = 14


def _summary(pid: str) -> dict:
    child = db.users.find_one({"_id": pid}, {"name": 1})
    since = now() - timedelta(days=SUMMARY_DAYS)
    readings = list(db.events.find({"patient_id": pid, "type": "reading", "ts": {"$gte": since}}, {"ts": 1, "data": 1}).sort("ts", 1))
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
        "tir_pct": round(100 * in_range / len(values)) if values else None,
        "avg_mgdl": round(sum(values) / len(values)) if values else None,
        "readings_count": len(values),
        "last_reading": {"bg_mgdl": last["data"]["bg_mgdl"], "ts": last["ts"]} if last else None,
        "plan_version": plan["version"] if plan else None,
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
    user: dict = Depends(current_user),
):
    check_access(user, patient_id)
    query: dict = {"patient_id": patient_id}
    if from_ or to:
        query["ts"] = {**({"$gte": from_} if from_ else {}), **({"$lte": to} if to else {})}
    if type:
        query["type"] = type
    return [pub(e) for e in db.events.find(query).sort("ts", 1).limit(5000)]


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


@router.post("/patients/{patient_id}/notes")
def add_note(patient_id: str, body: NoteIn, user: dict = Depends(require_role("clinician"))):
    check_access(user, patient_id)
    note = {"_id": new_id(), "patient_id": patient_id, "clinician_id": user["_id"], "text": body.text.strip(), "created_at": now()}
    db.notes.insert_one(note)
    _, parents, _ = recipients(patient_id)
    for uid in parents:
        notify(uid, "clinician_note", f"Note from {user['name']}", note["text"], {"patient_id": patient_id, "note_id": note["_id"]})
    return pub(note)
