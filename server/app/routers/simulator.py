from fastapi import APIRouter, Depends

from ..auth import check_access, current_user
from ..models import SimIn
from ..services import simulator

router = APIRouter(tags=["simulator"])


@router.post("/simulator/{patient_id}")
def run_scenario(patient_id: str, body: SimIn, user: dict = Depends(current_user)):
    """Demo control: stream simulated readings (normal / high / low) or trigger a missed-lunch alert."""
    check_access(user, patient_id)
    return simulator.start(patient_id, body.scenario, body.speed)


@router.delete("/simulator/{patient_id}")
def stop_scenario(patient_id: str, user: dict = Depends(current_user)):
    check_access(user, patient_id)
    simulator.stop(patient_id)
    return {"status": "stopped"}
