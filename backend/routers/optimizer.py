"""
Optimizer router — BL vs MVO vs HRP comparison, sentiment, and risk brief.

POST /api/optimize          — run all 3 optimizers, return comparison table
POST /api/sentiment         — score RSS headlines per symbol list
POST /api/portfolio/brief   — generate Groq risk brief for a portfolio
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


# ── Request models ──────────────────────────────────────────────────────────────

class OptimizeRequest(BaseModel):
    symbols: list[str]
    days_back: int = 365


class SentimentRequest(BaseModel):
    symbols: list[str]


class BriefRequest(BaseModel):
    portfolio: dict        # {symbol: weight}  — weights must sum to ~1
    regime: str = "SIDEWAYS"
    run_optimizer: bool = True   # if True, runs comparison engine too


# ── Endpoints ───────────────────────────────────────────────────────────────────

@router.post("/optimize")
def optimize_portfolio(body: OptimizeRequest):
    """
    Run PRAVAH Black-Litterman, Markowitz MVO, and HRP on the same stock
    universe. Returns weights, risk metrics, and a comparison table.
    """
    if len(body.symbols) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 symbols")
    if len(body.symbols) > 30:
        raise HTTPException(status_code=400, detail="Max 30 symbols per request")

    try:
        from optimizer_comparison import run_comparison
        return run_comparison(body.symbols, days_back=body.days_back)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sentiment")
def get_sentiment(body: SentimentRequest):
    """
    Fetch live RSS headlines mentioning the given stocks and score them
    via Groq LLM. Returns per-symbol sentiment score (-1 to +1).
    """
    if not body.symbols:
        raise HTTPException(status_code=400, detail="symbols list is empty")

    try:
        from groq_client import score_sentiment
        return score_sentiment(body.symbols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portfolio/brief")
def portfolio_brief(body: BriefRequest):
    """
    Generate a structured AI risk brief for a portfolio.
    Optionally runs the optimizer comparison to feed into the brief.
    """
    if not body.portfolio:
        raise HTTPException(status_code=400, detail="portfolio is empty")

    symbols = list(body.portfolio.keys())

    try:
        from groq_client import score_sentiment, generate_risk_brief

        # Sentiment for held stocks
        sentiment = score_sentiment(symbols)

        # Optimizer result (optional — skip if too few symbols)
        optimizer_result: dict = {}
        if body.run_optimizer and len(symbols) >= 2:
            try:
                from optimizer_comparison import run_comparison
                optimizer_result = run_comparison(symbols, days_back=252)
            except Exception:
                optimizer_result = {}

        brief = generate_risk_brief(
            portfolio=body.portfolio,
            optimizer_result=optimizer_result,
            sentiment=sentiment,
            regime=body.regime,
        )
        return {**brief, "sentiment": sentiment}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
