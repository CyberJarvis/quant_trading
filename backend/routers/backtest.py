from fastapi import APIRouter
from pydantic import BaseModel
from backtest_engine import BacktestEngine

router = APIRouter()


class BacktestRequest(BaseModel):
    symbol:   str = "^NSEI"
    strategy: str = "composite"
    start:    str = "2023-01-01"
    end:      str = "2025-06-27"
    capital:  float = 100000


@router.post("/backtest")
def run_backtest(body: BacktestRequest):
    try:
        engine = BacktestEngine(body.symbol, body.start, body.end, body.capital)
        return engine.run(body.strategy)
    except Exception as e:
        return {"error": str(e)}
