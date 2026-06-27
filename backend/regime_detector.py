import pandas as pd
import numpy as np
from angel_client import get_candles


def detect_regime() -> dict:
    nifty_candles = get_candles("^NSEI", interval="ONE_DAY", days_back=400)
    vix_candles   = get_candles("^INDIAVIX", interval="ONE_DAY", days_back=30)

    if not nifty_candles:
        return _default_regime()

    nifty  = pd.Series([c["close"] for c in nifty_candles])
    current = float(nifty.iloc[-1])
    sma50   = float(nifty.rolling(50).mean().iloc[-1])
    sma200  = float(nifty.rolling(200).mean().iloc[-1])
    ret_20d = float(nifty.pct_change(20).iloc[-1])

    vix_now = float(vix_candles[-1]["close"]) if vix_candles else 15.0

    score = 0
    if current > sma200:  score += 2
    if current > sma50:   score += 1
    if sma50 > sma200:    score += 2
    if ret_20d > 0.03:    score += 1
    elif ret_20d < -0.03: score -= 2
    if vix_now < 15:      score += 2
    elif vix_now > 20:    score -= 2
    elif vix_now > 25:    score -= 3

    if score >= 4:
        regime = "BULL"
        hint   = "Aggressive — buy momentum stocks"
    elif score <= 0:
        regime = "BEAR"
        hint   = "Defensive — reduce exposure"
    else:
        regime = "SIDEWAYS"
        hint   = "Neutral — use RSI mean reversion"

    return {
        "regime":        regime,
        "score":         score,
        "vix":           round(vix_now, 2),
        "nifty":         round(current, 2),
        "sma50":         round(sma50, 2),
        "sma200":        round(sma200, 2),
        "nifty_vs_sma200": round((current - sma200) / sma200 * 100, 2),
        "description":   f"Nifty {'above' if current > sma200 else 'below'} SMA200, VIX at {vix_now:.1f}",
        "strategy_hint": hint,
    }


def _default_regime() -> dict:
    return {
        "regime": "BULL", "score": 4, "vix": 14.0, "nifty": 24000.0,
        "sma50": 23800.0, "sma200": 22500.0, "nifty_vs_sma200": 6.7,
        "description": "Default — live data unavailable",
        "strategy_hint": "Aggressive — buy momentum stocks",
    }
