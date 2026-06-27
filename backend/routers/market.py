from fastapi import APIRouter, Query
from angel_client import get_ltp, get_candles
from data_cache import get_market_caps, get_fii_net
import numpy as np

# yfinance interval limits (max days of history available)
_YF_INTERVAL_MAP = {"5m": "5m", "15m": "15m", "1h": "1h", "1d": "1d"}
_YF_MAX_DAYS     = {"5m": 59,   "15m": 59,     "1h": 729,  "1d": 99999}


def _fetch_intraday(symbol: str, interval: str, days_back: int) -> list[dict]:
    """Fetch intraday OHLCV via yfinance; returns timestamp (Unix seconds) alongside date string."""
    import yfinance as yf
    yf_interval = _YF_INTERVAL_MAP.get(interval, "1d")
    max_days    = _YF_MAX_DAYS.get(interval, days_back)
    actual_days = min(days_back, max_days)

    if actual_days <= 5:    yf_period = "5d"
    elif actual_days <= 30: yf_period = "1mo"
    elif actual_days <= 59: yf_period = "2mo"
    elif actual_days <= 90: yf_period = "3mo"
    else:                   yf_period = "2y"

    try:
        df = yf.download(symbol, period=yf_period, interval=yf_interval,
                         progress=False, auto_adjust=False)
        if df.empty:
            return []
        df = df.reset_index()
        cols = [c[0] if isinstance(c, tuple) else c for c in df.columns]
        df.columns = cols
        result = []
        for _, row in df.iterrows():
            dt = row.get("Datetime", row.get("Date"))
            if dt is None:
                continue
            try:
                ts = int(dt.timestamp())
                date_str = str(dt)[:16]
                result.append({
                    "date":      date_str,
                    "timestamp": ts,
                    "open":      round(float(row["Open"]), 2),
                    "high":      round(float(row["High"]), 2),
                    "low":       round(float(row["Low"]), 2),
                    "close":     round(float(row["Close"]), 2),
                    "volume":    int(row["Volume"]),
                })
            except Exception:
                pass
        return result
    except Exception:
        return []

router = APIRouter()


@router.get("/market/indices")
def get_indices():
    """Live Nifty, Sensex, BankNifty, VIX — cached 60s in MongoDB."""
    from data_cache import _get, _set
    cached = _get("indices_v1", 60)
    if cached:
        return cached

    def _ltp_to_quote(symbol: str) -> dict:
        ltp = get_ltp(symbol)
        if ltp and ltp.get("ltp"):
            return {
                "value":      round(float(ltp["ltp"]), 2),
                "change":     round(float(ltp.get("netChange", 0)), 2),
                "change_pct": round(float(ltp.get("percentChange", 0)), 2),
            }
        candles = get_candles(symbol, "ONE_DAY", 2)
        if candles:
            c = candles[-1]
            prev = candles[-2]["close"] if len(candles) >= 2 else c["close"]
            chg = round(c["close"] - prev, 2)
            pct = round(chg / prev * 100, 2) if prev else 0
            return {"value": c["close"], "change": chg, "change_pct": pct}
        return {"value": None, "change": None, "change_pct": None}

    nifty     = _ltp_to_quote("^NSEI")
    sensex    = _ltp_to_quote("^BSESN")
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

    fii_net = get_fii_net()

    result = {
        "nifty50":   nifty,
        "sensex":    sensex,
        "banknifty": banknifty,
        "vix": {
            "value":     vix_val,
            "sentiment": vix_sentiment,
        },
        "fii_net":           fii_net,
        "fii_net_available": fii_net is not None,
    }
    _set("indices_v1", result, 60)
    return result


@router.get("/market/stock")
def get_stock(symbol: str = Query(...), period: str = Query("1y"), interval: str = Query("1d")):
    from data_cache import _get, _set
    cache_key = f"stock_resp:{symbol}:{period}:{interval}"
    cached = _get(cache_key, 60)
    if cached:
        return cached

    period_days = {
        "1d": 1, "5d": 5, "1mo": 30, "3mo": 90,
        "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
    }
    days = period_days.get(period, 365)
    if interval == "1d":
        candles = get_candles(symbol, interval="ONE_DAY", days_back=days)
    else:
        candles = _fetch_intraday(symbol, interval, days)
    if not candles:
        return {"error": "No data available", "symbol": symbol}

    live_price = live_change = live_change_pct = None
    ltp = get_ltp(symbol)
    if ltp and ltp.get("ltp"):
        live_price      = round(float(ltp["ltp"]), 2)
        live_change     = round(float(ltp.get("netChange", 0)), 2)
        live_change_pct = round(float(ltp.get("percentChange", 0)), 2)

    result = {
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
    _set(cache_key, result, 60)
    return result


@router.get("/market/caps")
def market_caps():
    """Live market caps from yfinance — cached 24h."""
    return get_market_caps()


@router.get("/forecast")
def forecast_symbol(
    symbol: str = Query(...),
    horizon: int = Query(30, ge=5, le=365),
    simulations: int = Query(500, ge=100, le=5000),
):
    """GBM Monte Carlo fan chart — scenario visualization only, not a prediction."""
    candles = get_candles(symbol, interval="ONE_DAY", days_back=365)
    if not candles or len(candles) < 30:
        return {"error": "Insufficient data", "symbol": symbol}

    closes = np.array([c["close"] for c in candles], dtype=float)
    log_returns = np.log(closes[1:] / closes[:-1])
    mu    = float(log_returns.mean())
    sigma = float(log_returns.std())
    S0    = float(closes[-1])

    rng       = np.random.default_rng(seed=42)
    rand      = rng.standard_normal((simulations, horizon))
    drift     = (mu - 0.5 * sigma ** 2)
    diffusion = sigma * rand
    paths     = S0 * np.exp(np.cumsum(drift + diffusion, axis=1))

    def band(p: int) -> list:
        return [round(float(v), 2) for v in np.percentile(paths, p, axis=0)]

    return {
        "symbol":        symbol,
        "current_price": round(S0, 2),
        "horizon_days":  horizon,
        "simulations":   simulations,
        "bands": {
            "p10": band(10),
            "p25": band(25),
            "p50": band(50),
            "p75": band(75),
            "p90": band(90),
        },
        "label": "GBM scenario visualization — not a prediction",
    }
