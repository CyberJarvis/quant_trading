"""
Black-Litterman portfolio optimizer — the PRAVAH allocation engine.

Feeds CQR conformalized prediction intervals into the B-L Ω uncertainty matrix.
When the model is uncertain → B-L ignores the view → weights stay near market cap.
When the model is confident → B-L tilts aggressively toward the view.

B-L formula:
  E[R] = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ × [(τΣ)⁻¹Π + P'Ω⁻¹Q]
"""

import numpy as np
from data_cache import get_cached_candles, get_market_caps
from scipy.optimize import minimize

# ── Helpers ─────────────────────────────────────────────────────────────────────


def compute_returns_matrix_from_candles(
    candles_by_symbol: dict, min_days: int = 30
) -> np.ndarray | None:
    """
    Build aligned daily-returns matrix from cached candle dicts.
    Returns (n_days × n_stocks) array, or None if insufficient data.
    Drops all rows where any stock has a NaN return (aligns on trading days).
    """
    symbols = list(candles_by_symbol.keys())
    if not symbols or len(symbols) < 2:
        return None

    returns_by_symbol = {}
    for sym in symbols:
        candles = candles_by_symbol.get(sym, [])
        if len(candles) < min_days:
            continue
        closes = np.array([c["close"] for c in candles], dtype=float)
        ret = np.diff(closes) / closes[:-1]  # simple daily returns
        returns_by_symbol[sym] = ret

    if len(returns_by_symbol) < 2:
        return None

    # Align to shortest common length (stocks have different IPO / delist dates)
    min_len = min(len(r) for r in returns_by_symbol.values())
    aligned = np.column_stack([returns_by_symbol[sym][-min_len:] for sym in symbols])
    return aligned


def compute_cov_matrix(returns: np.ndarray) -> np.ndarray:
    """Annualised covariance matrix from daily returns. Adds ridge for stability."""
    cov = np.cov(returns, rowvar=False) * 252
    # Ridge regularisation: add 1e-6 * I to prevent singular matrix
    return cov + np.eye(cov.shape[0]) * 1e-6


def resolve_market_caps(symbols: list[str]) -> dict:
    """
    Get live market caps, falling back to hardcoded approximations.
    Normalises .NS suffix — get_market_caps uses NIFTY50_TICKERS which have .NS.
    """
    live_caps = get_market_caps() or {}

    # Historical approx caps (INR) — used only when yfinance is unreachable
    FALLBACK_CAPS = {
        "RELIANCE.NS": 19_500_000_000_000,
        "TCS.NS": 15_000_000_000_000,
        "HDFCBANK.NS": 13_500_000_000_000,
        "INFY.NS": 8_200_000_000_000,
        "ICICIBANK.NS": 8_900_000_000_000,
        "SBIN.NS": 7_400_000_000_000,
        "BHARTIARTL.NS": 9_100_000_000_000,
        "ITC.NS": 5_800_000_000_000,
        "LT.NS": 5_400_000_000_000,
        "AXISBANK.NS": 3_900_000_000_000,
        "KOTAKBANK.NS": 4_200_000_000_000,
        "HINDUNILVR.NS": 5_900_000_000_000,
        "BAJFINANCE.NS": 5_200_000_000_000,
        "MARUTI.NS": 3_800_000_000_000,
        "TITAN.NS": 3_400_000_000_000,
        "WIPRO.NS": 2_900_000_000_000,
        "HCLTECH.NS": 4_800_000_000_000,
        "NESTLEIND.NS": 2_400_000_000_000,
        "ULTRACEMCO.NS": 3_100_000_000_000,
        "ASIANPAINT.NS": 2_800_000_000_000,
    }

    result = {}
    for sym in symbols:
        cap = live_caps.get(sym)
        if not cap:
            # Try stripping .NS (yfinance sometimes returns bare names)
            bare = sym.replace(".NS", "")
            cap = live_caps.get(bare)
        if not cap:
            cap = FALLBACK_CAPS.get(sym, 1_000_000_000_000)  # default ~1L Cr
        result[sym] = int(cap)
    return result


# ── Equilibrium Returns (Π) ─────────────────────────────────────────────────────


def compute_equilibrium_returns(
    market_caps: dict,
    cov_matrix: np.ndarray,
    symbols: list[str],
    risk_aversion: float = 2.5,
) -> np.ndarray:
    """
    Compute implied equilibrium returns Π via reverse optimisation.

    Π = λ × Σ × w_market

    At equilibrium, the market-cap-weighted portfolio is optimal.
    Working backwards gives us the returns the market is pricing in.
    """
    total_cap = sum(market_caps.values())
    w_market = np.array([market_caps[s] / total_cap for s in symbols])

    Pi = risk_aversion * cov_matrix @ w_market
    return Pi


# ── Black-Litterman Master Function ─────────────────────────────────────────────


def black_litterman_optimize(
    symbols: list[str],
    returns: np.ndarray,
    predictions: dict,  # {symbol: {pred_realist, prediction_interval, ...}}
    tau: float = 0.05,
) -> dict:
    """
    Full Black-Litterman optimisation with CQR uncertainty injection.

    Parameters
    ----------
    symbols     : list of stock tickers (must match order of returns columns)
    returns     : (n_days × n_stocks) array of daily returns
    predictions : dict keyed by symbol, each containing:
                  - pred_realist        : Q50 median return (percentage points)
                  - prediction_interval.width : CQR interval width (ppts)
    tau         : uncertainty in the prior (default 0.05)

    Returns
    -------
    dict with PRAVAH weights, posterior metrics, and full audit trail
    """
    n = len(symbols)

    # ── Step 0: Covariance matrix ───────────────────────────────────────────
    cov_matrix = compute_cov_matrix(returns)

    # ── Step 1: Compute Π (the prior — what the market believes) ────────────
    market_caps = resolve_market_caps(symbols)
    Pi = compute_equilibrium_returns(market_caps, cov_matrix, symbols)

    # ── Step 2: Build Q vector (your views — from CQR Q50 median) ───────────
    # pred_realist is a 5-day log return in percentage points.
    # Annualise: pct / 100 * (252 / 5) = pct * 0.504
    Q = np.array(
        [(predictions[s].get("pred_realist") or 0.0) / 100.0 * (252 / 5) for s in symbols]
    )

    # ── Step 3: Build P matrix (identity — one view per stock) ──────────────
    P = np.eye(n)

    # ── Step 4: Build Ω matrix (uncertainty in views) ───────────────────────
    # Uses CQR conformalized interval width, not raw quantile spread.
    # Width is in percentage points → convert to decimal, annualise, square.
    #
    # Large Ω diagonal  → model is uncertain → B-L ignores this view
    # Small Ω diagonal  → model is confident  → B-L tilts toward this view
    #
    # Floor of 0.0001 prevents division-by-zero if CQR is extremely confident.
    # width is a 5-day CQR interval width in percentage points.
    # Annualise variance: (width/100)^2 * (252/5). Take sqrt for vol, square for variance.
    # Simplified: omega_i = (width/100 * sqrt(252/5))^2
    _annual_factor = np.sqrt(252 / 5)
    omega_diagonal = np.array(
        [
            max(
                (
                    (predictions[s].get("prediction_interval") or {}).get("width", 5.0)
                    / 100.0
                    * _annual_factor
                )
                ** 2,
                0.0001,
            )
            for s in symbols
        ]
    )
    Omega = np.diag(omega_diagonal)

    # ── Step 5: The B-L posterior formula ───────────────────────────────────
    # E[R] = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ × [(τΣ)⁻¹Π + P'Ω⁻¹Q]
    tau_Sigma = tau * cov_matrix
    tau_Sigma_inv = np.linalg.inv(tau_Sigma)

    try:
        Omega_inv = np.linalg.inv(Omega)
    except np.linalg.LinAlgError:
        # Degenerate Omega — fall back to prior (no views)
        Omega_inv = np.zeros_like(Omega)

    left_bracket = np.linalg.inv(tau_Sigma_inv + P.T @ Omega_inv @ P)
    right_bracket = tau_Sigma_inv @ Pi + P.T @ Omega_inv @ Q
    posterior_returns = left_bracket @ right_bracket

    # Posterior covariance
    posterior_cov = cov_matrix + left_bracket

    # ── Step 6: Optimise weights on posterior returns (maximise Sharpe) ─────
    risk_free_rate = 0.065  # RBI repo rate

    def neg_sharpe(weights):
        ret = float(weights @ posterior_returns)
        vol = float(np.sqrt(weights @ posterior_cov @ weights))
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
        options={"maxiter": 2000, "ftol": 1e-12},
    )

    weights = result.x
    weights = weights / weights.sum()  # re-normalise (floating point)
    port_return = float(weights @ posterior_returns)
    port_vol = float(np.sqrt(weights @ posterior_cov @ weights))
    sharpe = (port_return - risk_free_rate) / (port_vol + 1e-9)

    # ── Step 7: Build the audit trail ───────────────────────────────────────
    view_vs_prior = {}
    for i, s in enumerate(symbols):
        pp = predictions.get(s, {})
        pi_data = pp.get("prediction_interval", {})
        view_vs_prior[s] = {
            "prior_belief": round(float(Pi[i]), 4),
            "your_view": round(float(Q[i]), 4),
            "uncertainty": round(float(np.sqrt(omega_diagonal[i])), 4),
            "posterior": round(float(posterior_returns[i]), 4),
            "final_weight": round(float(weights[i]), 4),
            "cqr_abstain": pi_data.get("abstain", False),
            "cqr_width": pi_data.get("width"),
            "pred_realist": pp.get("pred_realist"),
        }

    return {
        "method": "PRAVAH Black-Litterman",
        "weights": {symbols[i]: round(float(weights[i]), 4) for i in range(n)},
        "expected_return": round(port_return, 4),
        "expected_volatility": round(port_vol, 4),
        "sharpe_ratio": round(sharpe, 4),
        "tau": tau,
        "view_vs_prior": view_vs_prior,
        "optimiser_converged": result.success,
        "cov_condition": round(float(np.linalg.cond(cov_matrix)), 1),
    }
