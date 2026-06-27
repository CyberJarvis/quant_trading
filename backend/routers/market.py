from fastapi import APIRouter, Query
from angel_client import get_ltp, get_candles
from data_cache import get_market_caps, get_fii_net

router = APIRouter()


@router.get("/market/indices")
def get_indices():
    """Live Nifty, Sensex, BankNifty, VIX — from Angel One (yfinance fallback)."""

    def _ltp_to_quote(symbol: str) -> dict:
        ltp = get_ltp(symbol)
        if ltp and ltp.get("ltp"):
            return {
                "value":      round(float(ltp["ltp"]), 2),
                "change":     round(float(ltp.get("netChange", 0)), 2),
                "change_pct": round(float(ltp.get("percentChange", 0)), 2),
            }
        # fallback: last close from yfinance
        candles = get_candles(symbol, "ONE_DAY", 2)
        if candles:
            c = candles[-1]
            prev = candles[-2]["close"] if len(candles) >= 2 else c["close"]
            chg = round(c["close"] - prev, 2)
            pct = round(chg / prev * 100, 2) if prev else 0
            return {"value": c["close"], "change": chg, "change_pct": pct}
        return {"value": None, "change": None, "change_pct": None}

    nifty    = _ltp_to_quote("^NSEI")
    sensex   = _ltp_to_quote("^BSESN")   # real BSE Sensex — not a derived formula
    banknifty = _ltp_to_quote("^NSEBANK")

    vix_ltp = get_ltp("^INDIAVIX")
    if vix_ltp and vix_ltp.get("ltp"):
        vix_val = round(float(vix_ltp["ltp"]), 2)
    else:
        vix_candles = get_candles("^INDIAVIX", "ONE_DAY", 2)
        vix_val = vix_candles[-1]["close"] if vix_candles else None

    vix_sentiment = None
    if vix_val is not None:
        vix_sentiment = "LOW FEAR" if vix_val < 15 else ("HIGH FEAR" if vix_val > 22 else "MODERATE")

    fii_net = get_fii_net()  # None when NSE blocks the request

    return {
        "nifty50":   nifty,
        "sensex":    sensex,
        "banknifty": banknifty,
        "vix": {
            "value":     vix_val,
            "sentiment": vix_sentiment,
        },
        "fii_net":          fii_net,
        "fii_net_available": fii_net is not None,
    }


@router.get("/market/stock")
def get_stock(symbol: str = Query(...), period: str = Query("1y")):
    period_days = {
        "1d": 1, "5d": 5, "1mo": 30, "3mo": 90,
        "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
    }
    days    = period_days.get(period, 365)
    candles = get_candles(symbol, interval="ONE_DAY", days_back=days)
    if not candles:
        return {"error": "No data available", "symbol": symbol}

    # Live price from Angel One — shown in chart header so it matches current market
    live_price = live_change = live_change_pct = None
    ltp = get_ltp(symbol)
    if ltp and ltp.get("ltp"):
        live_price      = round(float(ltp["ltp"]), 2)
        live_change     = round(float(ltp.get("netChange", 0)), 2)
        live_change_pct = round(float(ltp.get("percentChange", 0)), 2)

    return {
        "symbol":          symbol,
        "period":          period,
        "candles":         candles,
        "dates":           [c["date"]   for c in candles],
        "open":            [c["open"]   for c in candles],
        "high":            [c["high"]   for c in candles],
        "low":             [c["low"]    for c in candles],
        "close":           [c["close"]  for c in candles],
        "volume":          [c["volume"] for c in candles],
        "live_price":      live_price,
        "live_change":     live_change,
        "live_change_pct": live_change_pct,
    }


@router.get("/market/caps")
def market_caps():
    """Live market caps from yfinance — cached 24h."""
    return get_market_caps()
