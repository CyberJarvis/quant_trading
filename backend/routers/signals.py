from fastapi import APIRouter, Query
from signal_engine import compute_signals, get_top_signals, compute_cqr_signals

router = APIRouter()

@router.get("/signals")
def get_signals(symbol: str = Query(...), cqr: bool = Query(False)):
    result = compute_signals(symbol)
    if not result:
        return {"error": "Could not compute signals", "symbol": symbol}
    if cqr:
        from angel_client import get_candles
        candles = get_candles(symbol, interval="ONE_DAY", days_back=365)
        result.update(compute_cqr_signals(symbol, candles or []))
    return result

@router.get("/signals/top")
def top_signals(n: int = Query(10)):
    return get_top_signals(n)
