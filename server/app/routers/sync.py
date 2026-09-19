from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import family_of, patient_for, require_role
from ..models import SyncPushIn
from ..services import gamification
from ..services.ingest import ingest
from ..util import now, pub

router = APIRouter(tags=["sync"])

INITIAL_PULL_DAYS = 14


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
        "events": [pub(e) for e in events],
        "plan": pub(db.plans.find_one({"patient_id": pid})),
        "notifications": [pub(n) for n in notifications],
        "pet": gamification.pet_view(gamification.get_pet(pid), _tz(user)),
    }
