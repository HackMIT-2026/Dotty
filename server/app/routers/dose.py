from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException

from .. import db
from ..auth import check_access, family_of, patient_for, require_role
from ..models import DoseIn
from ..services import dosing
from ..util import now, zone

router = APIRouter(tags=["dose"])

ACTIVITY_LOOKBACK = timedelta(hours=2)


@router.post("/dose/suggest")
def suggest(body: DoseIn, user: dict = Depends(require_role("parent", "clinician"))):
    """Bolus suggestion from the clinician's plan. The parent always confirms; nothing is logged here."""
    pid = body.patient_id or patient_for(user)
    if not pid:
        raise HTTPException(400, "There is no child in this family yet")
    check_access(user, pid)
    plan = db.plans.find_one({"patient_id": pid})
    if not plan:
        raise HTTPException(409, "No treatment plan yet. Ask the care team to set one up.")

    at = now()
    fam = family_of(user) if user["role"] == "parent" else db.families.find_one({"child_id": pid})
    tz = zone((fam or {}).get("tz"))
    activity = body.activity
    detected = False
    if activity is None:  # fall back to what the child logged in the last 2 hours
        recent = db.events.find({"patient_id": pid, "type": "activity", "ts": {"$gte": at - ACTIVITY_LOOKBACK}})
        ranks = [dosing.ACTIVITY_RANK[e["data"].get("intensity", "moderate")] for e in recent]
        activity = {v: k for k, v in dosing.ACTIVITY_RANK.items()}[max(ranks)] if ranks else "none"
        detected = bool(ranks)

    result = dosing.suggest(plan, body.carbs_g, body.bg_mgdl, at.astimezone(tz).strftime("%H:%M"), activity)
    result["activity_detected"] = detected
    return result
