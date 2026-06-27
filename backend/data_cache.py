"""
Slow data fetched from yfinance and cached in-memory with TTL.
Market caps and sectors change slowly — 24h TTL is fine.
"""

import time
import yfinance as yf
from signal_engine import NIFTY50_TICKERS

_cache: dict = {}
_candle_cache: dict = {}  # symbol → {candles, expires}


def _ttl_get(key: str, ttl: int):
    entry = _cache.get(key)
    if entry and time.time() < entry["expires"]:
        return entry["value"]
    return None


def _ttl_set(key: str, value, ttl: int):
    _cache[key] = {"value": value, "expires": time.time() + ttl}


def get_cached_candles(symbol: str, days_back: int = 365) -> list | None:
    """Return batch-prefetched candles if still warm, else None."""
    key = f"{symbol}:{days_back}"
    entry = _candle_cache.get(key)
    if entry and time.time() < entry["expires"]:
        return entry["value"]
    return None


def _rows_to_candles(ticker_df) -> list[dict]:
    """Convert a single-ticker OHLCV DataFrame (flat columns) to candle dicts."""
    ticker_df = ticker_df.dropna(how="all").reset_index()
    candles = []
    for _, row in ticker_df.iterrows():
        try:
            close_val = row.get("Close") if hasattr(row, "get") else row["Close"]
            if close_val != close_val:  # NaN check
                continue
            candles.append({
                "date":   str(row["Date"])[:10],
                "open":   round(float(row["Open"]),   2),
                "high":   round(float(row["High"]),   2),
                "low":    round(float(row["Low"]),    2),
                "close":  round(float(close_val),     2),
                "volume": int(row.get("Volume", 0) or 0),
            })
        except Exception:
            continue
    return candles


def _extract_ticker_df(df, sym: str):
    """
    Extract single-ticker sub-DataFrame from a multi-ticker yfinance download.
    yfinance sometimes stores the key as 'TITAN' not 'TITAN.NS' in the MultiIndex,
    so we try both the full symbol and the bare name (before the dot).
    """
    # Try full symbol first
    try:
        sub = df[sym]
        if sub is not None and not sub.empty:
            return sub
    except (KeyError, TypeError):
        pass

    # Try bare name (strip exchange suffix: "TITAN.NS" → "TITAN")
    bare = sym.split(".")[0]
    try:
        sub = df[bare]
        if sub is not None and not sub.empty:
            return sub
    except (KeyError, TypeError):
        pass

    # Try df.get() as last resort
    for key in (sym, bare):
        sub = df.get(key)
        if sub is not None and hasattr(sub, "empty") and not sub.empty:
            return sub

    return None


def prefetch_candles(tickers: list[str], days_back: int = 365) -> None:
    """
    Batch-download OHLCV for all tickers in one yfinance call, then cache each.
    Falls back to sequential individual downloads for any that the batch missed.
    """
    import time as _time

    uncached = [s for s in tickers if get_cached_candles(s, days_back) is None]
    if not uncached:
        return

    period = f"{days_back}d" if days_back <= 730 else "2y"
    batch_missed: list[str] = []

    # ── 1. Try batch download ────────────────────────────────────────────────
    try:
        df = yf.download(
            uncached, period=period,
            auto_adjust=False, progress=False, group_by="ticker",
        )
        if df is not None and not df.empty:
            single = len(uncached) == 1
            for sym in uncached:
                try:
                    ticker_df = df if single else _extract_ticker_df(df, sym)
                    if ticker_df is None or ticker_df.empty:
                        batch_missed.append(sym)
                        continue
                    candles = _rows_to_candles(ticker_df)
                    if candles:
                        _candle_cache[f"{sym}:{days_back}"] = {
                            "value":   candles,
                            "expires": _time.time() + 900,
                        }
                    else:
                        batch_missed.append(sym)
                except Exception:
                    batch_missed.append(sym)
        else:
            batch_missed = list(uncached)
    except Exception:
        batch_missed = list(uncached)

    # ── 2. Sequential fallback for anything the batch missed ─────────────────
    for sym in batch_missed:
        try:
            single_df = yf.download(sym, period=period, auto_adjust=False, progress=False)
            if single_df is not None and not single_df.empty:
                # Flat columns for single-ticker download
                if hasattr(single_df.columns, "levels"):
                    # Unexpected MultiIndex — flatten
                    single_df.columns = [c[0] if isinstance(c, tuple) else c for c in single_df.columns]
                candles = _rows_to_candles(single_df)
                if candles:
                    _candle_cache[f"{sym}:{days_back}"] = {
                        "value":   candles,
                        "expires": _time.time() + 900,
                    }
        except Exception:
            pass
        _time.sleep(0.3)  # small pause between individual calls to avoid rate-limiting


def get_market_caps() -> dict[str, int]:
    cached = _ttl_get("market_caps", 86400)
    if cached:
        return cached

    caps = {}
    tickers = yf.Tickers(" ".join(NIFTY50_TICKERS))
    for symbol in NIFTY50_TICKERS:
        try:
            info = tickers.tickers[symbol].info
            cap = info.get("marketCap") or info.get("market_cap")
            if cap:
                caps[symbol] = int(cap)
        except Exception:
            pass

    if not caps:
        # individual fallback (slower but more reliable)
        for symbol in NIFTY50_TICKERS:
            try:
                info = yf.Ticker(symbol).info
                cap = info.get("marketCap")
                if cap:
                    caps[symbol] = int(cap)
            except Exception:
                pass

    _ttl_set("market_caps", caps, 86400)
    return caps


def get_sectors() -> dict[str, str]:
    cached = _ttl_get("sectors", 86400)
    if cached:
        return cached

    sectors = {}
    for symbol in NIFTY50_TICKERS:
        try:
            info = yf.Ticker(symbol).info
            sector = info.get("sector") or info.get("sectorDisp")
            if sector:
                sectors[symbol] = sector
        except Exception:
            pass

    _ttl_set("sectors", sectors, 86400)
    return sectors


def get_fii_net() -> float | None:
    """
    Try NSE India's public API for FII net flows.
    NSE blocks bots aggressively — this may fail silently and return None.
    If None, caller should omit the field or show 'N/A'.
    """
    cached = _ttl_get("fii_net", 3600)
    if cached is not None:
        return cached

    try:
        import requests
        session = requests.Session()
        session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.nseindia.com/",
        })
        # Establish session cookie first
        session.get("https://www.nseindia.com", timeout=8)
        resp = session.get(
            "https://www.nseindia.com/api/fiidiiTradeReact",
            timeout=8,
        )
        if resp.status_code == 200:
            data = resp.json()
            # data is a list; first entry is latest date
            # Each entry: {category, buyValue, sellValue, netValue, ...}
            for entry in data:
                if "FII" in entry.get("category", "").upper():
                    net = float(entry.get("netValue", 0))
                    _ttl_set("fii_net", net, 3600)
                    return net
    except Exception:
        pass

    _ttl_set("fii_net", None, 900)  # cache miss for 15 min so we don't hammer NSE
    return None


def compute_portfolio_metrics(allocations: list, candles_by_symbol: dict) -> dict:
    """
    Compute expected annual return and Sharpe from actual 1Y daily returns
    of the selected stocks, weighted by their portfolio weight.
    """
    import numpy as np
    import pandas as pd

    weighted_returns = None
    rf_daily = 0.065 / 252

    for alloc in allocations:
        symbol = alloc["symbol"]
        weight = alloc["weight"] / 100
        candles = candles_by_symbol.get(symbol, [])
        if len(candles) < 30:
            continue
        closes = pd.Series([c["close"] for c in candles], dtype=float)
        ret = closes.pct_change().dropna()
        if weighted_returns is None:
            weighted_returns = ret * weight
        else:
            min_len = min(len(weighted_returns), len(ret))
            weighted_returns = weighted_returns.iloc[-min_len:] + ret.iloc[-min_len:] * weight

    if weighted_returns is None or len(weighted_returns) < 20:
        return {"expected_return": None, "sharpe_estimate": None}

    annual_return = round(float(weighted_returns.mean() * 252 * 100), 2)
    std = float(weighted_returns.std())
    sharpe = round((weighted_returns.mean() - rf_daily) / std * np.sqrt(252), 2) if std > 0 else None

    return {"expected_return": annual_return, "sharpe_estimate": sharpe}
