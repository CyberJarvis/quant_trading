from fastapi import APIRouter, Query
from signal_engine import compute_signals, get_top_signals

router = APIRouter()

@router.get("/signals")
def get_signals(symbol: str = Query(...)):
    result = compute_signals(symbol)
    if not result:
        return {"error": "Could not compute signals", "symbol": symbol}
    return result

@router.get("/signals/top")
def top_signals(n: int = Query(10)):
    return get_top_signals(n)
