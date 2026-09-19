"""Notifications: creation helpers, per-reading alerts and the periodic missed-treatment checks."""

import logging
import os
import threading
from datetime import timedelta

from .. import db
from ..util import at_local, new_id, now, zone

log = logging.getLogger("dotty.alerts")

OUT_OF_RANGE_LOW = 70
OUT_OF_RANGE_HIGH = 250
URGENT_LOW = 54
SUSTAINED_HIGH = 300
MISSED_LOOKBACK = timedelta(hours=3)  # only alert about reminders that lapsed recently
STALE_READING = timedelta(hours=3)  # readings synced long after the fact don't alert


def notify(user_id: str, kind: str, title: str, body: str, data: dict | None = None, dedupe: str | None = None) -> str | None:
    """Create a notification. With `dedupe`, an identical key for the same user is a no-op (returns None)."""
    doc = {
        "_id": new_id(),
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "body": body,
        "data": data or {},
        "created_at": now(),
        "read_at": None,
    }
    if dedupe is None:
        db.notifications.insert_one(doc)
        return doc["_id"]
    doc["dedupe"] = dedupe
    res = db.notifications.update_one(
        {"user_id": user_id, "dedupe": dedupe},
        {"$setOnInsert": {k: v for k, v in doc.items() if k not in ("user_id", "dedupe")}},
        upsert=True,
    )
    return doc["_id"] if res.upserted_id else None


def recipients(patient_id: str) -> tuple[dict, list[str], str | None]:
    """(family, parent ids, clinician id) for a patient."""
    child = db.users.find_one({"_id": patient_id}) or {}
    fam = db.families.find_one({"_id": child.get("family_id")}) or {}
    return fam, fam.get("parent_ids", []), fam.get("clinician_id")


def _name(patient_id: str) -> str:
    child = db.users.find_one({"_id": patient_id}, {"name": 1})
    return child["name"] if child else "Your child"


def check_reading(patient_id: str, bg: float, ts) -> None:
    """Alert parents (and the clinician when urgent) about an out-of-range reading."""
    if now() - ts > STALE_READING:
        return
    _, parents, clinician = recipients(patient_id)
    name = _name(patient_id)
    bucket = int(ts.timestamp() // 1800)  # at most one alert per band per 30 minutes
    data = {"patient_id": patient_id, "bg_mgdl": bg, "ts": ts.isoformat()}

    if bg < URGENT_LOW:
        title, body = f"Urgent: {name} is very low", f"{name}'s glucose is {bg:g} mg/dL. Treat the low now: 15 g of fast carbs, then recheck in 15 minutes."
        targets = parents + ([clinician] if clinician else [])
        key = f"oor:{patient_id}:urgent:{bucket}"
    elif bg < OUT_OF_RANGE_LOW:
        title, body = f"{name} is low", f"{name}'s glucose is {bg:g} mg/dL. Treat the low and recheck in 15 minutes."
        targets, key = parents, f"oor:{patient_id}:low:{bucket}"
    elif bg > OUT_OF_RANGE_HIGH:
        title, body = f"{name} is high", f"{name}'s glucose is {bg:g} mg/dL. Check the care plan for what to do."
        targets, key = parents, f"oor:{patient_id}:high:{bucket}"
    else:
        return
    for uid in targets:
        notify(uid, "out_of_range", title, body, {**data, "severity": "high" if bg < URGENT_LOW else "medium"}, dedupe=f"{key}:{uid}")


def raise_missed(patient_id: str, label: str, date_str: str, key: str) -> bool:
    """Create the missed-treatment alert for parents; returns True if it was new."""
    _, parents, clinician = recipients(patient_id)
    name = _name(patient_id)
    created = False
    for uid in parents:
        nid = notify(
            uid,
            "missed_treatment",
            f"{name} missed the {label}",
            f"No check-up was logged for the {label}. A quick reminder might help.",
            {"patient_id": patient_id, "date": date_str, "reminder": key},
            dedupe=f"missed:{patient_id}:{date_str}:{key}",
        )
        created = created or nid is not None
    if created and parents:
        missed_today = db.notifications.count_documents(
            {"user_id": parents[0], "kind": "missed_treatment", "data.patient_id": patient_id, "data.date": date_str}
        )
        if missed_today >= 2 and clinician:
            notify(
                clinician,
                "out_of_range",
                f"{name} missed 2 check-ups today",
                f"{name} has missed {missed_today} scheduled check-ups today.",
                {"patient_id": patient_id, "date": date_str, "severity": "high"},
                dedupe=f"missed2:{patient_id}:{date_str}",
            )
    return created


def _reminder_label(r: dict) -> str:
    return r.get("label") or {"check": "check-up", "meal": "meal check", "bedtime": "bedtime check"}[r["kind"]] + f" ({r['time']})"


def _check_missed(patient_id: str, plan: dict, tz_name: str, at) -> None:
    tz = zone(tz_name)
    local = at.astimezone(tz)
    for r in plan.get("reminders", []):
        start = at_local(local.date(), r["time"], tz)
        window = timedelta(minutes=r.get("window_min", 60))
        deadline = start + window
        if not (deadline < local <= deadline + MISSED_LOOKBACK):
            continue
        types = ["reading", "meal"] if r["kind"] == "meal" else ["reading"]
        found = db.events.find_one(
            {"patient_id": patient_id, "type": {"$in": types}, "ts": {"$gte": start - window, "$lte": deadline}}
        )
        if not found:
            raise_missed(patient_id, _reminder_label(r), local.date().isoformat(), r["time"])


def _check_sustained_high(patient_id: str, at) -> None:
    readings = list(
        db.events.find({"patient_id": patient_id, "type": "reading", "ts": {"$gte": at - timedelta(hours=2, minutes=30)}}).sort("ts", 1)
    )
    if len(readings) < 2 or any(r["data"]["bg_mgdl"] <= SUSTAINED_HIGH for r in readings):
        return
    if readings[-1]["ts"] - readings[0]["ts"] < timedelta(minutes=115):
        return
    _, parents, clinician = recipients(patient_id)
    name = _name(patient_id)
    bucket = int(at.timestamp() // 7200)
    for uid in parents + ([clinician] if clinician else []):
        notify(
            uid,
            "out_of_range",
            f"{name} has been very high for 2 hours",
            f"{name}'s glucose has stayed above {SUSTAINED_HIGH} mg/dL for about 2 hours.",
            {"patient_id": patient_id, "severity": "high"},
            dedupe=f"high2h:{patient_id}:{bucket}:{uid}",
        )


def run_checks(at=None) -> None:
    at = at or now()
    for fam in db.families.find({"child_id": {"$ne": None}}):
        plan = db.plans.find_one({"patient_id": fam["child_id"]})
        if plan:
            _check_missed(fam["child_id"], plan, fam.get("tz"), at)
        _check_sustained_high(fam["child_id"], at)


def start_scheduler() -> None:
    """Background thread that runs the periodic checks. Disabled by DOTTY_DISABLE_SCHEDULER=1."""
    if os.getenv("DOTTY_DISABLE_SCHEDULER") == "1":
        return
    interval = float(os.getenv("ALERTS_TICK_SECONDS", "60"))

    def loop():
        stop = threading.Event()
        while not stop.wait(interval):
            try:
                run_checks()
            except Exception:
                log.exception("alert check failed")

    threading.Thread(target=loop, name="dotty-alerts", daemon=True).start()
