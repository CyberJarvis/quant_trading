from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from stress_test import run_stress_test

router = APIRouter()


class StressRequest(BaseModel):
    portfolio:   dict
    scenario:    str = "covid_2020"
    custom_drop: Optional[float] = None


@router.post("/stress-test")
def stress_test(body: StressRequest):
    try:
        return run_stress_test(body.portfolio, body.scenario, body.custom_drop)
    except Exception as e:
        return {"error": str(e)}
