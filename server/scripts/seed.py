"""Reset the database and load the demo family: Maya (9, child), Alex (parent), Dr. Lee (clinician).

    python -m scripts.seed

WARNING: drops every Dotty collection in $MONGO_DB (default "dotty") first.

The history deliberately has post-breakfast highs: parents dose exactly as the plan says (1:10) but Maya is more
insulin resistant in the morning (breakfast carbs count 1.5x in the glucose model). That is the story the
clinician acts on in the demo: tighten the breakfast ratio to 1:8.
"""

import random
from datetime import datetime, timedelta

from app import db
from app.auth import hash_password
from app.services import gamification, shop
from app.services import tasks as care
from app.services.dosing import round_half
from app.services.simulator import glucose_model
from app.util import at_local, new_id, now, zone

FAMILY_CODE = "DEMO42"
PASSWORD = "demo1234"  # parents and clinicians
CHILD_PIN = "1234"  # the child signs in with the family code + this PIN, never an email
TZ = "America/New_York"
HISTORY_DAYS = 14
QUIET_HOURS = 5  # the history ends this long ago so Dotty starts out sleepy
MORNING_RESISTANCE = 1.5

DEFAULT_PLAN = {
    "icr": [{"start": "00:00", "g_per_unit": 10}, {"start": "05:00", "g_per_unit": 10}],
    "isf_mgdl_per_unit": 50,
    "target": {"low": 70, "high": 180},
    "correction_target": 120,
    "max_bolus": 10,
    "basal": [{"time": "21:00", "units": 12}],
    "reminders": [],  # reminders now come from the care-plan tasks below
    "activity_rules": {"light": 0, "moderate": 25, "vigorous": 50},
    "notes": "Demo plan. Placeholder values, not medical advice.",
}


# The doctor's daily care plan: parent wording + instructions, and the child's quest wording.
DEFAULT_TASKS = [
    {"title": "Morning glucose check", "instructions": "Fingerstick before breakfast.", "kind": "check", "time": "07:00", "importance": 2},
    {"title": "Lunch glucose check", "instructions": "Check before lunch, then give the lunch bolus per the carb ratio.",
     "kind": "check", "time": "12:00", "importance": 2},
    {"title": "Dinner glucose check", "instructions": "Check before dinner.", "kind": "check", "time": "18:00", "importance": 2},
    {"title": "Bedtime basal insulin", "instructions": "12 u Lantus. Rotate injection sites.", "kind": "medicine", "time": "21:00",
     "importance": 3},
]


def _user(role: str, name: str, email: str | None, secret: str = PASSWORD, **extra) -> dict:
    return {
        "_id": new_id(),
        "role": role,
        "name": name,
        "email": email,
        "password_hash": hash_password(secret),
        "family_id": None,
        "patient_ids": [],
        "created_at": now(),
        **extra,
    }


def _event(patient_id: str, type_: str, ts: datetime, data: dict, source: str = "manual") -> dict:
    return {
        "_id": new_id(),
        "client_id": f"seed-{new_id()}",
        "patient_id": patient_id,
        "type": type_,
        "ts": ts,
        "source": source,
        "data": data,
        "created_at": ts,
    }


def build_history(patient_id: str, at: datetime, rng: random.Random) -> list[dict]:
    tz = zone(TZ)
    cutoff = at - timedelta(hours=QUIET_HOURS)
    out: list[dict] = []
    today = at.astimezone(tz).date()

    for back in range(HISTORY_DAYS, -1, -1):
        day = today - timedelta(days=back)
        t = lambda hhmm, jitter=20: at_local(day, hhmm, tz) + timedelta(minutes=rng.randint(-jitter, jitter))  # noqa: E731

        meals, boluses, acts = [], [], []
        for hhmm, carbs, resistance in (("07:30", 50, MORNING_RESISTANCE), ("12:15", 45, 1.0), ("18:15", 55, 1.0)):
            ts = t(hhmm)
            carbs = carbs + rng.randint(-8, 8)
            units = round_half(carbs / 10)  # parents follow the plan's 1:10
            meals.append((ts, carbs * resistance))
            boluses.append((ts + timedelta(minutes=2), units))
            out.append(_event(patient_id, "meal", ts, {"carbs_g": carbs, "items": [], "carbs_source": "parent"}))
            out.append(_event(patient_id, "bolus", ts + timedelta(minutes=2), {"units": units, "reason": "meal", "carbs_g": carbs}, "parent"))
        if rng.random() < 0.7:
            ts, minutes = t("16:30", 45), rng.choice([30, 45, 60])
            acts.append((ts, minutes))
            out.append(_event(patient_id, "activity", ts, {"kind": "soccer", "minutes": minutes, "intensity": "moderate"}))
        out.append(_event(patient_id, "basal", t("21:00", 10), {"units": 12}, "parent"))

        # readings before each meal, after breakfast and lunch, and at bedtime; the child skips a few
        for hhmm in ("07:00", "08:45", "12:00", "14:00", "18:00", "21:00"):
            if rng.random() < 0.12:
                continue
            ts = t(hhmm, 15)
            bg = glucose_model(ts, meals, boluses, acts) + rng.gauss(0, 9)
            out.append(_event(patient_id, "reading", ts, {"bg_mgdl": int(max(48, min(380, round(bg)))), "context": "fingerstick"}))

    return [e for e in out if e["ts"] <= cutoff]


def main() -> None:
    rng = random.Random(42)
    at = now()
    for name in db.COLLECTIONS:
        db.db[name].drop()
    db.ensure_indexes()
    shop.ensure_items()

    clinician = _user("clinician", "Dr. Lee", "lee@dotty.demo")
    parent = _user("parent", "Alex", "parent@dotty.demo")
    child = _user("child", "Maya", None, CHILD_PIN)
    family = {
        "_id": new_id(),
        "code": FAMILY_CODE,
        "child_id": child["_id"],
        "parent_ids": [parent["_id"]],
        "clinician_id": clinician["_id"],
        "tz": TZ,
        "created_at": at,
    }
    for u in (parent, child):
        u["family_id"] = family["_id"]
    clinician["patient_ids"] = [child["_id"]]
    db.users.insert_many([clinician, parent, child])
    db.families.insert_one(family)
    db.plans.insert_one({"_id": new_id(), "patient_id": child["_id"], "clinician_id": clinician["_id"], **DEFAULT_PLAN, "version": 1, "updated_at": at})

    history_start = at - timedelta(days=HISTORY_DAYS + 1)  # tasks existed for the whole history, so adherence is full
    db.tasks.insert_many(
        [
            {"_id": new_id(), "patient_id": child["_id"], "clinician_id": clinician["_id"], "window_min": 60, "days": [],
             "target_minutes": None, "active": True, "created_at": history_start, "updated_at": history_start, **t,
             "quest_title": care.quest_title_for(t["kind"], t["time"]), "reward_dots": care.reward_for(t["importance"])}
            for t in DEFAULT_TASKS
        ]
    )

    events = build_history(child["_id"], at, rng)
    db.events.insert_many(events)

    pet = gamification.new_pet(child["_id"])
    pet["dots"] = pet["xp"] = 150  # enough for a first purchase in the demo
    db.pets.insert_one(pet)
    gamification.process_events(child["_id"], [], TZ, at)  # derive streak + badges from the history
    db.notifications.delete_many({})  # nothing "new" the first time the apps open

    pet = db.pets.find_one({"_id": child["_id"]})
    print(f"Seeded {len(events)} events over {HISTORY_DAYS} days into '{db.db.name}'.")
    print(f"  streak: {pet['streak_days']} days | badges: {pet['badges'] or 'none'} | dots: {pet['dots']}")
    print(f"  care plan: {', '.join(t['title'] + ' ' + t['time'] for t in DEFAULT_TASKS)}")
    print(f"  family code: {FAMILY_CODE}   (all demo passwords: {PASSWORD})")
    print(f"  child     family code {FAMILY_CODE} + PIN {CHILD_PIN}  (Maya \u2014 no email)")
    print("  parent    parent@dotty.demo  (Alex)")
    print("  clinician lee@dotty.demo     (Dr. Lee)")


if __name__ == "__main__":
    main()
