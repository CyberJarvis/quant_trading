"""
Risk metrics — Sharpe, Sortino, VaR, CVaR, Max Drawdown, Calmar.
Computed from a daily portfolio returns array.
"""

import numpy as np


def compute_risk_metrics(
    daily_returns: np.ndarray,
    risk_free_rate: float = 0.065,
    confidence: float = 0.95,
) -> dict:
    """
    Parameters
    ----------
    daily_returns  : 1D array of daily portfolio returns (decimal, not %)
    risk_free_rate : annualised risk-free rate (RBI repo ~6.5%)
    confidence     : VaR/CVaR confidence level (default 95%)
    """
    r = np.asarray(daily_returns, dtype=float)
    r = r[~np.isnan(r)]
    if len(r) < 5:
        return {}

    ann_return = float(r.mean() * 252)
    ann_vol    = float(r.std(ddof=1) * np.sqrt(252))

    sharpe = (ann_return - risk_free_rate) / (ann_vol + 1e-9)

    # Sortino — downside deviation only
    downside = r[r < 0]
    if len(downside) > 0:
        downside_vol = float(np.sqrt((downside ** 2).mean()) * np.sqrt(252))
    else:
        downside_vol = 1e-9
    sortino = (ann_return - risk_free_rate) / (downside_vol + 1e-9)

    # Historical VaR and CVaR
    pct = (1 - confidence) * 100
    var = float(np.percentile(r, pct))
    tail = r[r <= var]
    cvar = float(tail.mean()) if len(tail) > 0 else var

    # Max Drawdown
    cumulative = np.cumprod(1 + r)
    running_max = np.maximum.accumulate(cumulative)
    drawdowns = cumulative / running_max - 1
    max_drawdown = float(drawdowns.min())

    calmar = ann_return / (abs(max_drawdown) + 1e-9)

    lvl = int(confidence * 100)
    return {
        "annualised_return":      round(ann_return * 100, 2),       # %
        "annualised_volatility":  round(ann_vol * 100, 2),          # %
        "sharpe_ratio":           round(sharpe, 3),
        "sortino_ratio":          round(sortino, 3),
        f"var_{lvl}":             round(var * 100, 3),              # % daily
        f"cvar_{lvl}":            round(cvar * 100, 3),             # % daily
        "max_drawdown":           round(max_drawdown * 100, 2),     # %
        "calmar_ratio":           round(calmar, 3),
        "n_days":                 len(r),
    }


def portfolio_daily_returns(
    weights: dict,
    candles_by_symbol: dict,
) -> np.ndarray:
    """
    Build a weighted daily portfolio return series from candle dicts.
    Aligns all symbols to the same length (shortest available).
    """
    symbols = list(weights.keys())
    returns_by_sym = {}
    for sym in symbols:
        candles = candles_by_symbol.get(sym, [])
        if len(candles) < 5:
            continue
        closes = np.array([c["close"] for c in candles], dtype=float)
        ret = np.diff(closes) / closes[:-1]
        returns_by_sym[sym] = ret

    if not returns_by_sym:
        return np.array([])

    min_len = min(len(r) for r in returns_by_sym.values())
    port_ret = np.zeros(min_len)
    for sym, ret in returns_by_sym.items():
        w = weights.get(sym, 0.0)
        port_ret += w * ret[-min_len:]

    return port_ret
