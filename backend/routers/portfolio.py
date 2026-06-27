import re
from fastapi import APIRouter
from pydantic import BaseModel
from regime_detector import detect_regime
from signal_engine import compute_signals, NIFTY50_TICKERS
from data_cache import get_sectors, compute_portfolio_metrics, prefetch_candles, get_cached_candles
from angel_client import get_candles

router = APIRouter()


class PortfolioBrief(BaseModel):
    brief: str


def _parse_brief(text: str) -> dict:
    text_lower = text.lower()

    amount_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lac|l\b)", text_lower)
    if amount_match:
        budget = float(amount_match.group(1)) * 100000
    else:
        cr_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:crore|cr\b)", text_lower)
        budget = float(cr_match.group(1)) * 10000000 if cr_match else 500000

    yr_match = re.search(r"(\d+)\s*(?:year|yr)", text_lower)
    mo_match = re.search(r"(\d+)\s*(?:month|mo)", text_lower)
    if yr_match:
        horizon_months = int(yr_match.group(1)) * 12
    elif mo_match:
        horizon_months = int(mo_match.group(1))
    else:
        horizon_months = 60

    if any(w in text_lower for w in ["aggressive", "high risk", "risky"]):
        risk = "HIGH"
    elif any(w in text_lower for w in ["safe", "conservative", "low risk", "capital protect"]):
        risk = "LOW"
    else:
        risk = "MODERATE"

    return {"budget_inr": budget, "horizon_months": horizon_months, "risk_level": risk}


def _build_portfolio(budget: float, risk: str, signals: list, sectors: dict) -> list:
    if risk == "HIGH":
        allowed, n_stocks = {"STRONG BUY", "BUY"}, 10
    elif risk == "LOW":
        allowed, n_stocks = {"STRONG BUY", "BUY", "HOLD"}, 15
    else:
        allowed, n_stocks = {"STRONG BUY", "BUY"}, 12

    candidates = [s for s in signals if s.get("verdict") in allowed] or signals
    candidates = candidates[:n_stocks]
    total_score = sum(max(s["composite_score"], 0.1) for s in candidates)

    allocations = []
    for s in candidates:
        weight = max(s["composite_score"], 0.1) / total_score
        allocations.append({
            "symbol":     s["symbol"],
            "weight":     round(weight * 100, 2),
            "amount_inr": round(budget * weight, 2),
            "sector":     sectors.get(s["symbol"], "Other"),
            "signal":     s["verdict"],
            "score":      s["composite_score"],
        })

    return allocations


@router.post("/portfolio/create")
def create_portfolio(body: PortfolioBrief):
    parsed  = _parse_brief(body.brief)
    regime  = detect_regime()
    sectors = get_sectors()   # live from yfinance, cached 24h
    signals = []

    # Batch-download all tickers — prefetch handles MultiIndex column quirks
    # and falls back to sequential individual downloads for any misses.
    prefetch_candles(NIFTY50_TICKERS, days_back=365)

    for ticker in NIFTY50_TICKERS:
        try:
            candles = get_cached_candles(ticker, 365) or get_candles(ticker, "ONE_DAY", 365)
            sig = compute_signals(ticker, candles=candles)
            if sig:
                signals.append(sig)
        except Exception:
            pass

    signals.sort(key=lambda x: x["composite_score"], reverse=True)
    allocations = _build_portfolio(parsed["budget_inr"], parsed["risk_level"], signals, sectors)

    # Fetch recent candles for selected stocks to compute real return & Sharpe
    candles_by_symbol = {}
    for alloc in allocations:
        try:
            candles_by_symbol[alloc["symbol"]] = get_candles(alloc["symbol"], "ONE_DAY", 365)
        except Exception:
            pass

    metrics = compute_portfolio_metrics(allocations, candles_by_symbol)

    return {
        "receipt": {
            "budget_inr":       parsed["budget_inr"],
            "horizon_months":   parsed["horizon_months"],
            "risk_level":       parsed["risk_level"],
            "current_regime":   regime["regime"],
            "strategy_applied": f"Signal-Weighted {parsed['risk_level'].title()} Allocation",
        },
        "allocation": allocations,
        "metrics": {
            "expected_return":  metrics["expected_return"],      # annualised %, from real 1Y data
            "sharpe_estimate":  metrics["sharpe_estimate"],      # from real weighted returns
            "num_stocks":       len(allocations),
            "total_weight":     round(sum(a["weight"] for a in allocations), 2),
            "metrics_note":     "Based on trailing 1-year historical returns of selected stocks"
                                if metrics["expected_return"] is not None
                                else "Insufficient price history to compute metrics",
        },
    }
