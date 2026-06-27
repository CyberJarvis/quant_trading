import pandas as pd
import numpy as np
from angel_client import get_candles, SYMBOL_TOKEN_MAP

NIFTY50_TICKERS = [
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS",
    "ICICIBANK.NS","SBIN.NS","BHARTIARTL.NS","ITC.NS",
    "LT.NS","AXISBANK.NS","KOTAKBANK.NS","HINDUNILVR.NS",
    "BAJFINANCE.NS","MARUTI.NS","TITAN.NS","WIPRO.NS",
    "HCLTECH.NS","NESTLEIND.NS","ULTRACEMCO.NS","ASIANPAINT.NS",
]


def compute_signals(symbol: str, candles: list | None = None) -> dict:
    if candles is None:
        candles = get_candles(symbol, interval="ONE_DAY", days_back=365)
    if len(candles) < 50:
        return {}

    df = pd.DataFrame(candles)
    close = df["close"].astype(float)
    high  = df["high"].astype(float)
    low   = df["low"].astype(float)

    # RSI
    delta = close.diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    rs    = gain / loss.replace(0, np.nan)
    df["RSI"] = 100 - (100 / (1 + rs))

    # MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df["MACD"]     = ema12 - ema26
    df["MACD_SIG"] = df["MACD"].ewm(span=9, adjust=False).mean()

    # SMA
    df["SMA_50"]  = close.rolling(50).mean()
    df["SMA_200"] = close.rolling(200).mean()

    # Bollinger Bands
    sma20          = close.rolling(20).mean()
    std20          = close.rolling(20).std()
    df["BB_UPPER"]  = sma20 + 2 * std20
    df["BB_LOWER"]  = sma20 - 2 * std20
    df["BB_MIDDLE"] = sma20

    df = df.dropna()
    if len(df) < 2:
        return {}

    latest = df.iloc[-1]
    prev   = df.iloc[-2]

    score   = 0
    signals = {}
    rsi     = float(latest["RSI"])

    # RSI: standard 30/40/60/70 bands (50-60 is neutral, not SELL)
    if rsi < 30:   score += 2; signals["rsi"] = "STRONG BUY"    # oversold
    elif rsi < 40: score += 1; signals["rsi"] = "BUY"           # leaning oversold
    elif rsi > 70: score -= 2; signals["rsi"] = "STRONG SELL"   # overbought
    elif rsi > 60: score -= 1; signals["rsi"] = "SELL"          # leaning overbought
    else:                       signals["rsi"] = "NEUTRAL"       # 40–60 is neutral

    macd_above_signal = float(latest["MACD"]) > float(latest["MACD_SIG"])
    macd_was_below    = float(prev["MACD"])   < float(prev["MACD_SIG"])
    macd_positive     = float(latest["MACD"]) > 0

    if macd_above_signal and macd_was_below and macd_positive:
        # Fresh crossover above zero line — strongest bull signal
        score += 2; signals["macd"] = "BULLISH CROSSOVER"
    elif macd_above_signal and macd_was_below:
        # Crossover but both lines still negative — momentum turning up
        score += 1; signals["macd"] = "RECOVERING"
    elif macd_above_signal and macd_positive:
        # Above signal and above zero — confirmed bullish
        score += 1; signals["macd"] = "BULLISH"
    elif macd_above_signal:
        # MACD > Signal but both negative — no score, just recovering
        signals["macd"] = "RECOVERING"
    elif not macd_above_signal and float(prev["MACD"]) > float(prev["MACD_SIG"]):
        # Fresh bearish crossover
        score -= 2; signals["macd"] = "BEARISH CROSSOVER"
    elif macd_positive:
        # Above zero but below signal — weakening bull
        score -= 1; signals["macd"] = "WEAKENING"
    else:
        # Below zero and below signal — bearish
        score -= 1; signals["macd"] = "BEARISH"

    if latest["SMA_50"] > latest["SMA_200"]:
        score += 2; signals["trend"] = "GOLDEN CROSS"
    else:
        score -= 2; signals["trend"] = "DEATH CROSS"

    cp = float(latest["close"])
    if cp < float(latest["BB_LOWER"]):
        score += 1; signals["bollinger"] = "OVERSOLD"
    elif cp > float(latest["BB_UPPER"]):
        score -= 1; signals["bollinger"] = "OVERBOUGHT"
    else:
        signals["bollinger"] = "NEUTRAL"

    normalized = round((score / 7) * 10, 1)
    if normalized > 5:    verdict = "STRONG BUY"
    elif normalized > 2:  verdict = "BUY"
    elif normalized > -2: verdict = "HOLD"
    elif normalized > -5: verdict = "SELL"
    else:                 verdict = "STRONG SELL"

    macd_val   = round(float(latest["MACD"]),     4)
    macd_sig   = round(float(latest["MACD_SIG"]), 4)
    macd_hist  = round(macd_val - macd_sig,        4)
    sma50_val  = round(float(latest["SMA_50"]),    2)
    sma200_val = round(float(latest["SMA_200"]),   2)
    bb_upper   = round(float(latest["BB_UPPER"]),  2)
    bb_lower   = round(float(latest["BB_LOWER"]),  2)
    bb_middle  = round(float(latest["BB_MIDDLE"]),  2)

    return {
        "symbol":          symbol,
        "composite_score": normalized,
        "verdict":         verdict,
        # RSI
        "rsi":             round(rsi, 1),
        "rsi_signal":      signals.get("rsi", "NEUTRAL"),
        # MACD — raw values + label
        "macd_line":       macd_val,
        "macd_signal_line":macd_sig,
        "macd_histogram":  macd_hist,
        "macd_signal":     signals.get("macd", "NEUTRAL"),
        # Trend / SMA
        "sma50":           sma50_val,
        "sma200":          sma200_val,
        "trend_signal":    signals.get("trend", "NEUTRAL"),
        # Bollinger Bands
        "bb_upper":        bb_upper,
        "bb_lower":        bb_lower,
        "bb_middle":       bb_middle,
        "bb_signal":       signals.get("bollinger", "NEUTRAL"),
        # Price
        "current_price":   round(cp, 2),
        "signals":         signals,
    }


def get_top_signals(n: int = 10) -> list:
    # Import here to avoid circular import (data_cache imports NIFTY50_TICKERS from here)
    from data_cache import prefetch_candles, get_cached_candles
    from angel_client import get_candles as _get_candles

    prefetch_candles(NIFTY50_TICKERS, days_back=365)

    results = []
    for ticker in NIFTY50_TICKERS:  # full 20-stock list
        try:
            candles = get_cached_candles(ticker, 365) or _get_candles(ticker, "ONE_DAY", 365)
            sig = compute_signals(ticker, candles=candles)
            if sig:
                results.append(sig)
        except Exception:
            pass
    results.sort(key=lambda x: x["composite_score"], reverse=True)
    return results[:n]
