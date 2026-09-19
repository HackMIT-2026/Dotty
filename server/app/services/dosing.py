"""Bolus suggestion. Every parameter comes from the clinician's treatment plan; nothing is guessed here."""

import math

LOW_BG_MGDL = 70
HIGH_BG_MGDL = 250
ACTIVITY_RANK = {"none": 0, "light": 1, "moderate": 2, "vigorous": 3}


def round_half(x: float) -> float:
    """Round to the nearest 0.5 unit (half-up, unlike Python's banker's round)."""
    return math.floor(x * 2 + 0.5) / 2


def icr_for(icr: list[dict], time_hhmm: str) -> float:
    """Grams of carbs per unit for a local time of day; wraps to the last slot before the first start."""
    slots = sorted(icr, key=lambda s: s["start"])
    chosen = slots[-1]
    for slot in slots:
        if slot["start"] <= time_hhmm:
            chosen = slot
    return chosen["g_per_unit"]


def suggest(plan: dict, carbs_g: float, bg_mgdl: float, time_hhmm: str, activity: str = "none") -> dict:
    result = {
        "blocked": False,
        "message": None,
        "warnings": ["Insulin on board is not tracked. Check the last dose before confirming."],
        "carbs_g": carbs_g,
        "bg_mgdl": bg_mgdl,
        "activity": activity,
        "plan_version": plan.get("version"),
        "max_bolus": plan["max_bolus"],
    }

    if bg_mgdl < LOW_BG_MGDL:
        result.update(
            blocked=True,
            message="Glucose is low. Treat the low first: 15 g of fast carbs, then recheck in 15 minutes. No dose suggested.",
            suggested_units=0.0,
        )
        return result

    icr = icr_for(plan["icr"], time_hhmm)
    isf = plan["isf_mgdl_per_unit"]
    correction_target = plan["correction_target"]
    reduce_pct = plan["activity_rules"].get(activity, 0) if activity != "none" else 0

    carb_units = carbs_g / icr
    correction_units = max(0.0, (bg_mgdl - correction_target) / isf)
    factor = 1 - reduce_pct / 100
    raw = (carb_units + correction_units) * factor
    rounded = round_half(raw)
    suggested = min(rounded, plan["max_bolus"])

    if bg_mgdl > HIGH_BG_MGDL:
        result["warnings"].append("Glucose is high. Follow your care team's plan for high readings.")
    if rounded > plan["max_bolus"]:
        result["warnings"].append(f"Capped at the plan's maximum of {plan['max_bolus']:g} units.")

    result.update(
        icr_g_per_unit=icr,
        isf_mgdl_per_unit=isf,
        correction_target=correction_target,
        carb_units=round(carb_units, 2),
        correction_units=round(correction_units, 2),
        activity_reduce_pct=reduce_pct,
        activity_factor=factor,
        raw_units=round(raw, 2),
        suggested_units=suggested,
        capped=rounded > plan["max_bolus"],
    )
    return result
