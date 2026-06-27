"""
Markowitz Mean-Variance Optimisation — the baseline portfolio method.

Uses historical mean returns and covariance. No ML, no views, no uncertainty.
This is the "dumb benchmark" that PRAVAH Black-Litterman is compared against.
"""

import numpy as np
from scipy.optimize import minimize


def markowitz_optimize(
    symbols: list[str],
    returns: np.ndarray,  # (n_days × n_stocks) daily returns
) -> dict:
    """
    Classic Markowitz MVO — maximise Sharpe ratio using historical estimates.

    Parameters
    ----------
    symbols : list of stock tickers (order must match returns columns)
    returns : historical daily returns matrix

    Returns
    -------
    dict with weights, expected return, volatility, and Sharpe ratio
    """
    n = len(symbols)
    if n < 2 or returns.shape[1] != n:
        raise ValueError(f"Expected {n} columns in returns matrix, got {returns.shape}")

    # Historical estimates — no ML, no views, just the data
    expected_returns = returns.mean(axis=0) * 252  # annualise
    cov_matrix = np.cov(returns, rowvar=False) * 252  # annualise

    # Ridge for stability
    cov_matrix = cov_matrix + np.eye(n) * 1e-6

    risk_free_rate = 0.065  # RBI repo rate ~6.5%

    # ── Handle edge case: all expected returns ≤ risk-free rate ─────────────
    # During bear markets, mean returns can be negative. MVO would short
    # everything. We constrain to long-only (weight ≥ 0) so the optimiser
    # defaults to the least-bad allocation rather than failing.
    if np.all(expected_returns <= risk_free_rate):
        # Equal weight as fallback — no edge from any stock
        weights = np.ones(n) / n
        port_return = float(weights @ expected_returns)
        port_vol = float(np.sqrt(weights @ cov_matrix @ weights))
        sharpe = (port_return - risk_free_rate) / (port_vol + 1e-9)
        return {
            "method": "Markowitz MVO (equal-weight fallback — no positive edge)",
            "weights": {symbols[i]: round(float(weights[i]), 4) for i in range(n)},
            "expected_return": round(port_return, 4),
            "expected_volatility": round(port_vol, 4),
            "sharpe_ratio": round(sharpe, 4),
        }

    def neg_sharpe(weights):
        ret = float(weights @ expected_returns)
        vol = float(np.sqrt(weights @ cov_matrix @ weights))
        return -(ret - risk_free_rate) / (vol + 1e-9)

    constraints = [{"type": "eq", "fun": lambda w: float(np.sum(w)) - 1.0}]
    bounds = [(0.0, 0.40) for _ in range(n)]  # max 40% per stock
    x0 = np.ones(n) / n

    result = minimize(
        neg_sharpe,
        x0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 1000, "ftol": 1e-12},
    )

    weights = result.x
    weights = weights / weights.sum()  # re-normalise

    port_return = float(weights @ expected_returns)
    port_vol = float(np.sqrt(weights @ cov_matrix @ weights))
    sharpe = (port_return - risk_free_rate) / (port_vol + 1e-9)

    return {
        "method": "Markowitz MVO",
        "weights": {symbols[i]: round(float(weights[i]), 4) for i in range(n)},
        "expected_return": round(port_return, 4),
        "expected_volatility": round(port_vol, 4),
        "sharpe_ratio": round(sharpe, 4),
        "optimiser_converged": result.success,
    }
