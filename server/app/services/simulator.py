"""Demo glucose generator. Not a physiological model: plausible curves so charts, alerts and the demo look real."""

import math
import random
import threading
from datetime import timedelta

from .. import db
from ..util import new_id, now, zone
from . import alerts
from .ingest import ingest

STEP_MINUTES = 5  # simulated minutes between readings
RISE_MGDL_PER_G = 2.6  # peak rise per gram of carbs
INSULIN_STRENGTH = 17.0  # peak drop per unit (this models the deviation curve, not the plan's ISF)


def _bump(t_min: float, peak: float, width: float) -> float:
    return math.exp(-(((t_min - peak) / width) ** 2)) if t_min >= 0 else 0.0


def glucose_model(at, meals: list, boluses: list, activities: list, base: float = 115.0) -> float:
    """Deterministic glucose (mg/dL) at `at` from (ts, carbs), (ts, units) and (ts, minutes) lists."""
    bg = base
    for ts, carbs in meals:
        bg += carbs * RISE_MGDL_PER_G * _bump((at - ts).total_seconds() / 60, 60, 50)
    for ts, units in boluses:
        bg -= units * INSULIN_STRENGTH * _bump((at - ts).total_seconds() / 60, 80, 60)
    for ts, minutes in activities:
        bg -= min(60, minutes * 0.9) * _bump((at - ts).total_seconds() / 60, 40 + minutes / 2, 60)
    return bg


def _recent_inputs(patient_id: str, at):
    since = at - timedelta(hours=6)
    evs = list(db.events.find({"patient_id": patient_id, "ts": {"$gte": since}}))
    meals = [(e["ts"], e["data"]["carbs_g"]) for e in evs if e["type"] == "meal"]
    boluses = [(e["ts"], e["data"].get("units") or 0) for e in evs if e["type"] == "bolus"]
    acts = [(e["ts"], e["data"]["minutes"]) for e in evs if e["type"] == "activity"]
    return meals, boluses, acts


_running: dict[str, threading.Event] = {}
_lock = threading.Lock()


def start(patient_id: str, scenario: str, speed: int) -> dict:
    """Start (or replace) the live generator for a patient. `skip_lunch` raises the missed-lunch alert directly."""
    stop(patient_id)
    if scenario == "skip_lunch":
        fam = db.families.find_one({"child_id": patient_id}) or {}
        date_str = now().astimezone(zone(fam.get("tz"))).date().isoformat()
        created = alerts.raise_missed(patient_id, "lunch check", date_str, "demo-lunch")
        return {"status": "missed lunch raised" if created else "already raised today", "scenario": scenario}

    stop_event = threading.Event()
    with _lock:
        _running[patient_id] = stop_event
    interval = max(0.5, STEP_MINUTES * 60 / speed)
    threading.Thread(target=_run, args=(patient_id, scenario, interval, stop_event), name=f"dotty-sim-{patient_id[:6]}", daemon=True).start()
    return {"status": "started", "scenario": scenario, "reading_every_seconds": interval}


def stop(patient_id: str) -> None:
    with _lock:
        ev = _running.pop(patient_id, None)
    if ev:
        ev.set()


def _run(patient_id: str, scenario: str, interval: float, stop_event: threading.Event) -> None:
    rng = random.Random()
    last = db.events.find_one({"patient_id": patient_id, "type": "reading"}, sort=[("ts", -1)])
    bg = last["data"]["bg_mgdl"] if last else 120.0
    # (steps in scenario, then recover toward the modelled baseline for a few steps)
    active_steps, recover_steps = (12, 6) if scenario in ("high", "low") else (24, 0)
    step = 0
    while not stop_event.is_set() and step < active_steps + recover_steps:
        at = now()
        meals, boluses, acts = _recent_inputs(patient_id, at)
        baseline = glucose_model(at, meals, boluses, acts)
        if step < active_steps and scenario == "high":
            target = 285.0
        elif step < active_steps and scenario == "low":
            target = 52.0
        else:
            target = baseline
        bg += 0.35 * (target - bg) + rng.gauss(0, 3)
        bg = max(40.0, min(400.0, bg))
        ingest(
            patient_id,
            [{"client_id": f"sim-{new_id()}", "type": "reading", "ts": at, "source": "simulator", "data": {"bg_mgdl": round(bg), "context": "simulated"}}],
        )
        step += 1
        stop_event.wait(interval)
    with _lock:
        if _running.get(patient_id) is stop_event:
            _running.pop(patient_id, None)
