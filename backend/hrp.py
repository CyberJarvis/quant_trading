"""
Hierarchical Risk Parity — risk-based diversification baseline.
PyPortfolioOpt's HRPOpt implements Lopez de Prado (2016).
No return forecasts needed — purely covariance/correlation-driven.
"""

import numpy as np
import pandas as pd
from pypfopt import HRPOpt


def hrp_optimize(symbols: list[str], returns: np.ndarray) -> dict:
    """
    HRP portfolio: hierarchical clustering on the correlation matrix,
    then inverse-variance weighting within each cluster.

    Parameters
    ----------
    symbols : list of tickers (order must match returns columns)
    returns : (n_days × n_stocks) daily returns matrix
    """
    n = len(symbols)
    if n < 2 or returns.shape[1] != n:
        raise ValueError(f"Expected {n} columns in returns, got {returns.shape[1]}")

    df = pd.DataFrame(returns, columns=symbols)

    hrp = HRPOpt(returns=df)
    hrp.optimize()
    weights_dict = hrp.clean_weights()

    weights = np.array([weights_dict.get(s, 0.0) for s in symbols])
    cov = np.cov(returns, rowvar=False) * 252 + np.eye(n) * 1e-6
    port_vol = float(np.sqrt(weights @ cov @ weights))

    # HRP has no return forecast — use historical mean as reference only
    expected_returns = returns.mean(axis=0) * 252
    port_return = float(weights @ expected_returns)
    risk_free_rate = 0.065
    sharpe = (port_return - risk_free_rate) / (port_vol + 1e-9)

    return {
        "method": "HRP (Hierarchical Risk Parity)",
        "weights": {s: round(float(weights_dict.get(s, 0.0)), 4) for s in symbols},
        "expected_return": round(port_return, 4),
        "expected_volatility": round(port_vol, 4),
        "sharpe_ratio": round(sharpe, 4),
        "note": "Return estimate uses historical mean — HRP is return-agnostic by design",
    }
