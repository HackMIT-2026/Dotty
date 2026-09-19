from fastapi import APIRouter, Depends, status
from pymongo.database import Database

from ..db import get_db
from ..schemas import TreatmentPlan, TreatmentPlanCreate

router = APIRouter(prefix="/api/treatment-plans", tags=["treatment-plans"])


@router.post("", response_model=TreatmentPlan, status_code=status.HTTP_201_CREATED)
def create_treatment_plan(body: TreatmentPlanCreate, db: Database = Depends(get_db)) -> TreatmentPlan:
    doc = body.model_dump()
    result = db["treatment_plans"].insert_one(doc)
    return TreatmentPlan(id=str(result.inserted_id), **body.model_dump())
