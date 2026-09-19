"""Single entry point for new events (device sync and the simulator): store, reward, alert."""

from datetime import timedelta

from .. import db
from ..util import new_id, now
from . import alerts, gamification

MAX_FUTURE_SKEW = timedelta(minutes=5)


def ingest(patient_id: str, raw_events: list[dict], actor_role: str | None = None) -> dict:
    """Idempotently store events (unique on client_id) and apply gamification and alerts to the new ones.

    raw_events: dicts with client_id, type, ts (aware datetime), source and data.
    Returns {accepted_ids, new_events, pet, rewards}. `pet` is the raw pet document.
    """
    at = now()
    accepted: list[str] = []
    new_events: list[dict] = []

    for e in raw_events:
        # actor_role None = trusted internal caller (simulator). Devices can't claim to be the simulator,
        # and anything a parent logs is sourced as the parent.
        if actor_role is None:
            source = e["source"]
        elif actor_role == "parent":
            source = "parent"
        else:
            source = e["source"] if e["source"] in ("manual", "camera") else "manual"
        ts = e["ts"] if e["ts"].tzinfo else e["ts"].replace(tzinfo=at.tzinfo)
        ts = min(ts, at)  # clamp clock skew so the future can't be farmed
        doc = {
            "_id": new_id(),
            "client_id": e["client_id"],
            "patient_id": patient_id,
            "type": e["type"],
            "ts": ts,
            "source": source,
            "data": e.get("data", {}),
            "created_at": at,
        }
        res = db.events.update_one(
            {"client_id": e["client_id"]},
            {"$setOnInsert": {k: v for k, v in doc.items() if k != "client_id"}},
            upsert=True,
        )
        accepted.append(e["client_id"])
        if res.upserted_id:
            new_events.append(doc)

    fam = db.families.find_one({"child_id": patient_id}) or {}
    for e in new_events:
        if e["type"] == "reading":
            alerts.check_reading(patient_id, e["data"]["bg_mgdl"], e["ts"])

    pet, rewards = gamification.get_pet(patient_id), []
    if any(e["source"] != "simulator" for e in new_events):
        pet, rewards = gamification.process_events(patient_id, new_events, fam.get("tz"), at)
    return {"accepted_ids": accepted, "new_events": new_events, "pet": pet, "rewards": rewards}
