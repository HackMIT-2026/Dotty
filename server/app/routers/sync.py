from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import family_of, patient_for, require_role
from ..models import SyncPushIn
from ..services import gamification
from ..services import tasks as care
from ..services.ingest import ingest
from ..util import now, pub

router = APIRouter(tags=["sync"])

INITIAL_PULL_DAYS = 14

# Carb counting and doses are the grown-ups' job: the child's app is never sent the numbers, so no screen can
# leak them and no "how many grams is a cookie?" habit can start. Flags stay hidden too — a child who can see
# what tripped the spam check can work around it.
CHILD_HIDDEN_DATA = ("carbs_g", "carbs_source", "needs_parent", "units", "note")


def _event_view(event: dict, role: str) -> dict:
    if role != "child":
        return pub(event)
    data = event["data"]
    if event["type"] in ("meal", "bolus", "basal"):
        data = {k: v for k, v in data.items() if k not in CHILD_HIDDEN_DATA}
        if data.get("items"):
            data["items"] = [{k: v for k, v in i.items() if k not in ("carbs", "note", "source")} for i in data["items"]]
    out = pub({**event, "data": data})
    out.pop("flags", None)
    out.pop("suspect", None)
    return out


def _tz(user: dict) -> str | None:
    fam = family_of(user)
    return fam.get("tz") if fam else None


def _need_patient(user: dict) -> str:
    pid = patient_for(user)
    if not pid:
        raise HTTPException(400, "There is no child in this family yet")
    return pid


@router.post("/sync/push")
def push(body: SyncPushIn, user: dict = Depends(require_role("child", "parent"))):
    """Idempotent upload of offline events. Safe to retry: events are unique on client_id."""
    pid = _need_patient(user)
    result = ingest(pid, [e.model_dump() for e in body.events], actor_role=user["role"])
    return {
        "accepted_ids": result["accepted_ids"],
        "new_count": len(result["new_events"]),
        "rewards": result["rewards"],
        "pet": gamification.pet_view(result["pet"], _tz(user)),
    }


@router.get("/sync/pull")
def pull(since: datetime | None = None, user: dict = Depends(require_role("child", "parent"))):
    """Everything new since the cursor: events, the current plan, notifications and the pet."""
    server_time = now()
    pid = _need_patient(user)

    if since is None:
        event_query = {"patient_id": pid, "ts": {"$gte": server_time - timedelta(days=INITIAL_PULL_DAYS)}}
    else:
        event_query = {"patient_id": pid, "created_at": {"$gt": since}}
    events = list(db.events.find(event_query).sort("ts", 1).limit(3000))

    notif_query = {"user_id": user["_id"]}
    if since is not None:
        notif_query["created_at"] = {"$gt": since}
    notifications = list(db.notifications.find(notif_query).sort("created_at", -1).limit(100))

    child = db.users.find_one({"_id": pid}, {"name": 1})
    fam = family_of(user) or {}
    return {
        "server_time": server_time,
        "settings": {"glucose_unit": fam.get("glucose_unit", "mg/dL")},
        "patient": {"id": pid, "name": child["name"]},
        "events": [_event_view(e, user["role"]) for e in events],
        "plan": pub(db.plans.find_one({"patient_id": pid})),
        # the doctor's care plan: full detail for the parent, the game view only for the child
        "tasks": [(care.child_view if user["role"] == "child" else care.full_view)(t) for t in care.active_tasks(pid)],
        "notifications": [pub(n) for n in notifications],
        "pet": gamification.pet_view(gamification.get_pet(pid), _tz(user)),
    }
