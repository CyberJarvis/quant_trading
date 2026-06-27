from fastapi import APIRouter
from regime_detector import detect_regime

router = APIRouter()

@router.get("/regime")
def get_regime():
    return detect_regime()
