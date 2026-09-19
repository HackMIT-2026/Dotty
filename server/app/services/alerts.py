"""Notifications: creation helpers, per-reading alerts and the periodic missed-treatment checks."""

import logging
import os
import threading
from datetime import timedelta

from .. import db
from ..util import fmt_bg, new_id, now, zone
from . import tasks as care

log = logging.getLogger("dotty.alerts")

OUT_OF_RANGE_LOW = 70
OUT_OF_RANGE_HIGH = 250
URGENT_LOW = 54
SUSTAINED_HIGH = 300
MISSED_LOOKBACK = timedelta(hours=3)  # only alert about tasks whose window closed recently
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
    fam, parents, clinician = recipients(patient_id)
    name = _name(patient_id)
    shown = fmt_bg(bg, fam.get("glucose_unit"))
    bucket = int(ts.timestamp() // 1800)  # at most one alert per band per 30 minutes
    data = {"patient_id": patient_id, "bg_mgdl": bg, "ts": ts.isoformat()}

    if bg < URGENT_LOW:
        title, body = f"Urgent: {name} is very low", f"{name}'s glucose is {shown}. Treat the low now: 15 g of fast carbs, then recheck in 15 minutes."
        targets = parents + ([clinician] if clinician else [])
        key = f"oor:{patient_id}:urgent:{bucket}"
    elif bg < OUT_OF_RANGE_LOW:
        title, body = f"{name} is low", f"{name}'s glucose is {shown}. Treat the low and recheck in 15 minutes."
        targets, key = parents, f"oor:{patient_id}:low:{bucket}"
    elif bg > OUT_OF_RANGE_HIGH:
        title, body = f"{name} is high", f"{name}'s glucose is {shown}. Check the care plan for what to do."
        targets, key = parents, f"oor:{patient_id}:high:{bucket}"
    else:
        return
    for uid in targets:
        notify(uid, "out_of_range", title, body, {**data, "severity": "high" if bg < URGENT_LOW else "medium"}, dedupe=f"{key}:{uid}")


def raise_missed(patient_id: str, label: str, date_str: str, key: str, body: str | None = None) -> bool:
    """Create the missed-treatment alert for parents; returns True if it was new."""
    _, parents, clinician = recipients(patient_id)
    name = _name(patient_id)
    created = False
    for uid in parents:
        nid = notify(
            uid,
            "missed_treatment",
            f"{name} missed {label}",
            body or f"Nothing was logged for {label}. A quick reminder might help.",
            {"patient_id": patient_id, "date": date_str, "task_id": key},
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
                f"{name} missed 2 care-plan tasks today",
                f"{name} has missed {missed_today} tasks of the care plan today.",
                {"patient_id": patient_id, "date": date_str, "severity": "high"},
                dedupe=f"missed2:{patient_id}:{date_str}",
            )
    return created


def _check_missed(patient_id: str, tz_name: str | None, at) -> None:
    """Alert parents shortly after a doctor task's window closes with nothing logged, and send the day's summary."""
    tz = zone(tz_name)
    local = at.astimezone(tz)
    day = local.date()
    summary = care.day_summary(patient_id, day, tz, at)
    if not summary:
        return
    for s in summary:
        t = s["task"]
        if not t.get("time") or s["status"] != "missed":
            continue
        deadline = care.window(t, day, tz)[1]
        if deadline < local <= deadline + MISSED_LOOKBACK:
            detail = f" {t['instructions']}" if t.get("instructions") else ""
            raise_missed(
                patient_id,
                f"{t['title']} ({t['time']})",
                day.isoformat(),
                t["_id"],
                f"Nothing was logged for {t['title']} at {t['time']} today.{detail}",
            )
    _daily_summary(patient_id, summary, day, tz, local)


def _daily_summary(patient_id: str, summary: list[dict], day, tz, local) -> None:
    """Once the last timed task's window has closed: "3 of 4 care-plan tasks done today"."""
    timed = [s for s in summary if s["task"].get("time")]
    if not timed:
        return
    last_close = max(care.window(s["task"], day, tz)[1] for s in timed)
    if not (last_close < local <= last_close + MISSED_LOOKBACK):
        return
    _, parents, _ = recipients(patient_id)
    name = _name(patient_id)
    done = [s for s in summary if s["status"] == "done"]
    missed = [s["task"]["title"] for s in summary if s["status"] != "done"]
    body = "Everything on the plan was done. Great teamwork!" if not missed else "Not done: " + ", ".join(missed) + "."
    for uid in parents:
        notify(
            uid,
            "care_summary",
            f"{name}'s care plan today: {len(done)} of {len(summary)} done",
            body,
            {"patient_id": patient_id, "date": day.isoformat(), "done": len(done), "total": len(summary)},
            dedupe=f"summary:{patient_id}:{day.isoformat()}",
        )


def plan_changed(patient_id: str, clinician_name: str, change: str) -> None:
    """Tell parents the doctor changed the care plan (they see the details in the app's Care plan tab)."""
    _, parents, _ = recipients(patient_id)
    for uid in parents:
        notify(uid, "clinician_note", "Care plan updated", f"{clinician_name} {change}", {"patient_id": patient_id})


def _check_sustained_high(patient_id: str, at) -> None:
    readings = list(
        db.events.find({"patient_id": patient_id, "type": "reading", "ts": {"$gte": at - timedelta(hours=2, minutes=30)}}).sort("ts", 1)
    )
    if len(readings) < 2 or any(r["data"]["bg_mgdl"] <= SUSTAINED_HIGH for r in readings):
        return
    if readings[-1]["ts"] - readings[0]["ts"] < timedelta(minutes=115):
        return
    fam, parents, clinician = recipients(patient_id)
    name = _name(patient_id)
    bucket = int(at.timestamp() // 7200)
    for uid in parents + ([clinician] if clinician else []):
        notify(
            uid,
            "out_of_range",
            f"{name} has been very high for 2 hours",
            f"{name}'s glucose has stayed above {fmt_bg(SUSTAINED_HIGH, fam.get('glucose_unit'))} for about 2 hours.",
            {"patient_id": patient_id, "severity": "high"},
            dedupe=f"high2h:{patient_id}:{bucket}:{uid}",
        )


def run_checks(at=None) -> None:
    at = at or now()
    for fam in db.families.find({"child_id": {"$ne": None}}):
        _check_missed(fam["child_id"], fam.get("tz"), at)
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
