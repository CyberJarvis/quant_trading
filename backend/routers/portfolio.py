import re
import random
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from regime_detector import detect_regime
from data_cache import get_sectors, compute_portfolio_metrics, get_cached_candles
from angel_client import get_candles, get_holdings, get_positions

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
    from signal_engine import get_top_signals
    parsed  = _parse_brief(body.brief)
    # All three are MongoDB-cached — sub-100ms each
    regime  = detect_regime()
    sectors = get_sectors()
    signals = get_top_signals(200)   # returns cached list instantly if warm

    allocations = _build_portfolio(parsed["budget_inr"], parsed["risk_level"], signals, sectors)

    # Candles for selected 10-15 stocks only — all cached from earlier prefetch
    candles_by_symbol = {}
    for alloc in allocations:
        try:
            candles_by_symbol[alloc["symbol"]] = (
                get_cached_candles(alloc["symbol"], 365)
                or get_candles(alloc["symbol"], "ONE_DAY", 365)
            )
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
            "expected_return":  metrics["expected_return"],
            "sharpe_estimate":  metrics["sharpe_estimate"],
            "num_stocks":       len(allocations),
            "total_weight":     round(sum(a["weight"] for a in allocations), 2),
            "metrics_note":     "Based on trailing 1-year historical returns of selected stocks"
                                if metrics["expected_return"] is not None
                                else "Insufficient price history to compute metrics",
        },
    }


@router.get("/portfolio/holdings")
def live_holdings():
    """Live holdings pulled directly from Angel One account."""
    holdings = get_holdings()
    if not holdings:
        return {
            "error": "No holdings found in this Angel One account. Add stocks to your demat first.",
            "holdings": [],
            "total_value": 0,
            "count": 0,
        }
    total = round(sum(h["total_value"] for h in holdings), 2)
    return {"holdings": holdings, "total_value": total, "count": len(holdings)}


@router.get("/portfolio/positions")
def live_positions():
    """Open intraday/short-term positions from Angel One."""
    positions = get_positions()
    return {"positions": positions, "count": len(positions)}


class OrderRequest(BaseModel):
    symbol: str
    display_symbol: str
    qty: int
    price: float
    transaction_type: str  # "BUY" | "SELL"
    order_type: str = "MARKET"
    product_type: str = "DELIVERY"


@router.post("/portfolio/order")
def place_order(body: OrderRequest):
    """Mock order placement — simulates Angel One response for demo."""
    order_id = f"AO{random.randint(100000000000, 999999999999)}"
    slippage = round(body.price * random.uniform(-0.001, 0.002), 2)
    executed_price = round(body.price + slippage, 2)
    total_value = round(executed_price * body.qty, 2)
    return {
        "order_id":         order_id,
        "status":           "COMPLETE",
        "message":          "Order executed successfully",
        "symbol":           body.symbol,
        "display_symbol":   body.display_symbol,
        "qty":              body.qty,
        "transaction_type": body.transaction_type,
        "order_type":       body.order_type,
        "product_type":     body.product_type,
        "price_requested":  body.price,
        "executed_price":   executed_price,
        "total_value":      total_value,
        "exchange":         "NSE",
        "timestamp":        datetime.now().isoformat(),
        "mock":             True,
    }
