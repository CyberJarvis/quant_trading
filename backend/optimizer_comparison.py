"""
Comparison engine — runs BL, MVO, HRP on the same universe and returns
a side-by-side table so the frontend can show PRAVAH wins vs. benchmarks.
"""

import numpy as np
from data_cache import get_cached_candles
from black_litterman import black_litterman_optimize, compute_returns_matrix_from_candles
from markowitz import markowitz_optimize
from hrp import hrp_optimize
from risk_metrics import compute_risk_metrics, portfolio_daily_returns
from signal_engine import compute_cqr_signals


def _fetch_candles_batch(symbols: list[str], days_back: int = 365) -> dict:
    from angel_client import get_candles
    result = {}
    for sym in symbols:
        candles = get_cached_candles(sym, days_back)
        if not candles or len(candles) < 30:
            candles = get_candles(sym, interval="ONE_DAY", days_back=days_back)
        if candles and len(candles) >= 30:
            result[sym] = candles
    return result


def _fetch_cqr_predictions(symbols: list[str], candles_by_symbol: dict) -> dict:
    """
    Run CQR for each symbol. Falls back to empty dict if insufficient data.
    Returns {symbol: {pred_realist, prediction_interval, ...}}
    """
    predictions = {}
    for sym in symbols:
        candles = candles_by_symbol.get(sym, [])
        try:
            result = compute_cqr_signals(sym, candles)
            predictions[sym] = result
        except Exception:
            predictions[sym] = {}
    return predictions


def run_comparison(symbols: list[str], days_back: int = 365) -> dict:
    """
    Run BL, MVO, and HRP on the same stock universe.

    Parameters
    ----------
    symbols  : list of NSE tickers (e.g. ["TCS.NS", "HDFCBANK.NS", ...])
    days_back: historical window for returns computation

    Returns
    -------
    {
        "symbols": [...],
        "optimizers": {
            "pravah_bl": {weights, metrics, view_vs_prior, ...},
            "markowitz":  {weights, metrics, ...},
            "hrp":        {weights, metrics, ...},
        },
        "comparison_table": [{metric, pravah_bl, markowitz, hrp}, ...],
        "winner": "pravah_bl" | "markowitz" | "hrp",
    }
    """
    if len(symbols) < 2:
        raise ValueError("Need at least 2 symbols to optimize")

    # ── Fetch candles & build returns matrix ────────────────────────────────
    candles_by_symbol = _fetch_candles_batch(symbols, days_back)
    valid_symbols = [s for s in symbols if s in candles_by_symbol]

    if len(valid_symbols) < 2:
        raise ValueError("Insufficient candle data for optimization")

    returns, valid_symbols = compute_returns_matrix_from_candles(candles_by_symbol)
    if returns is None or len(valid_symbols) < 2:
        raise ValueError("Could not build returns matrix")

    # ── CQR predictions for B-L views ───────────────────────────────────────
    predictions = _fetch_cqr_predictions(valid_symbols, candles_by_symbol)

    # ── Run all three optimizers ─────────────────────────────────────────────
    results = {}

    try:
        bl = black_litterman_optimize(valid_symbols, returns, predictions)
        bl_daily = portfolio_daily_returns(bl["weights"], candles_by_symbol)
        bl["risk_metrics"] = compute_risk_metrics(bl_daily)
        results["pravah_bl"] = bl
    except Exception as e:
        import traceback; traceback.print_exc()
        results["pravah_bl"] = {"error": str(e)}

    try:
        mvo = markowitz_optimize(valid_symbols, returns)
        mvo_daily = portfolio_daily_returns(mvo["weights"], candles_by_symbol)
        mvo["risk_metrics"] = compute_risk_metrics(mvo_daily)
        results["markowitz"] = mvo
    except Exception as e:
        results["markowitz"] = {"error": str(e)}

    try:
        hrp = hrp_optimize(valid_symbols, returns)
        hrp_daily = portfolio_daily_returns(hrp["weights"], candles_by_symbol)
        hrp["risk_metrics"] = compute_risk_metrics(hrp_daily)
        results["hrp"] = hrp
    except Exception as e:
        results["hrp"] = {"error": str(e)}

    # ── Build comparison table ───────────────────────────────────────────────
    metrics_keys = [
        ("Expected Return (%)",   "risk_metrics.annualised_return"),
        ("Volatility (%)",        "risk_metrics.annualised_volatility"),
        ("Sharpe Ratio",          "risk_metrics.sharpe_ratio"),
        ("Sortino Ratio",         "risk_metrics.sortino_ratio"),
        ("Max Drawdown (%)",      "risk_metrics.max_drawdown"),
        ("Calmar Ratio",          "risk_metrics.calmar_ratio"),
        ("VaR 95 (%)",            "risk_metrics.var_95"),
        ("CVaR 95 (%)",           "risk_metrics.cvar_95"),
    ]

    def _get(d: dict, path: str):
        keys = path.split(".")
        val = d
        for k in keys:
            if not isinstance(val, dict):
                return None
            val = val.get(k)
        return val

    comparison_table = []
    for label, path in metrics_keys:
        row = {"metric": label}
        for opt_key in ["pravah_bl", "markowitz", "hrp"]:
            row[opt_key] = _get(results.get(opt_key, {}), path)
        comparison_table.append(row)

    # Winner = highest Sharpe (among successful runs)
    sharpes = {
        k: (_get(v, "risk_metrics.sharpe_ratio") or -999)
        for k, v in results.items()
        if "error" not in v
    }
    winner = max(sharpes, key=sharpes.get) if sharpes else "pravah_bl"

    return {
        "symbols":          valid_symbols,
        "optimizers":       results,
        "comparison_table": comparison_table,
        "winner":           winner,
    }
