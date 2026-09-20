"""Single entry point for new events (device sync and the simulator): screen, store, reward, alert."""

from datetime import timedelta

from .. import db
from ..util import new_id, now
from . import alerts, food, gamification, integrity

MAX_FUTURE_SKEW = timedelta(minutes=5)


def _meal_data(data: dict, trusted: bool) -> dict:
    """Carbs are worked out here, from the food cards and words the child sent, and never on the device.

    A parent (or an older log that already carries grams) keeps the number they entered.
    """
    if trusted and data.get("carbs_g") is not None:
        return {**data, "carbs_source": data.get("carbs_source", "parent")}
    items = data.get("items") or []
    resolved = food.resolve_items(items)
    return {
        **{k: v for k, v in data.items() if k != "carbs_g"},
        "carbs_g": resolved["carbs_g"],
        "items": resolved["items"],
        "carbs_source": resolved["carbs_source"],
        "needs_parent": resolved["needs_parent"] or bool(data.get("help")),
    }


def ingest(patient_id: str, raw_events: list[dict], actor_role: str | None = None) -> dict:
    """Idempotently store events (unique on client_id) and apply gamification and alerts to the new ones.

    raw_events: dicts with client_id, type, ts (aware datetime), source and data.
    Returns {accepted_ids, new_events, pet, rewards}. `pet` is the raw pet document.
    """
    at = now()
    accepted: list[str] = []
    new_events: list[dict] = []
    fam = db.families.find_one({"child_id": patient_id}) or {}
    trusted = actor_role != "child"  # the simulator and the parent's own logs are taken at face value

    pending: list[dict] = []
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
        data = e.get("data", {})
        if e["type"] == "meal":
            data = _meal_data(data, trusted)
        pending.append(
            {
                "_id": new_id(),
                "client_id": e["client_id"],
                "patient_id": patient_id,
                "type": e["type"],
                "ts": ts,
                "source": source,
                "data": data,
                "created_at": at,
            }
        )

    if not trusted:
        integrity.screen(patient_id, pending, fam.get("tz"), at)

    for doc in pending:
        res = db.events.update_one(
            {"client_id": doc["client_id"]},
            {"$setOnInsert": {k: v for k, v in doc.items() if k != "client_id"}},
            upsert=True,
        )
        accepted.append(doc["client_id"])
        if res.upserted_id:
            new_events.append(doc)

    for e in new_events:
        # Safety comes before anti-cheat: a spammed low is still reported. Only an exact repeat is skipped,
        # because the parent was already told about the first one.
        if e["type"] == "reading" and "duplicate" not in e.get("flags", []):
            alerts.check_reading(patient_id, e["data"]["bg_mgdl"], e["ts"])
        if e["type"] == "meal" and e["data"].get("needs_parent") and not e.get("suspect"):
            alerts.food_help(patient_id, e)
    note = integrity.summarise(new_events)
    if note:
        alerts.flagged_logs(patient_id, note, at)

    pet, rewards = gamification.get_pet(patient_id), []
    if any(e["source"] != "simulator" for e in new_events):
        pet, rewards = gamification.process_events(patient_id, new_events, fam.get("tz"), at)
    return {"accepted_ids": accepted, "new_events": new_events, "pet": pet, "rewards": rewards}
