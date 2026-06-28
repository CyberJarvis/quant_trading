"""
Hierarchical Risk Parity — Lopez de Prado (2016).
Implemented directly with scipy to avoid PyPortfolioOpt's private API breakage on scipy 1.13+.
"""

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.spatial.distance import squareform


def _corr_to_dist(corr: np.ndarray) -> np.ndarray:
    return np.sqrt(np.clip((1 - corr) / 2, 0, 1))


def _quasi_diag(link: np.ndarray, n: int) -> list[int]:
    """Return leaves in quasi-diagonal order from linkage matrix."""
    return list(leaves_list(link))


def _recursive_bisect(cov: np.ndarray, sort_ix: list[int]) -> np.ndarray:
    weights = np.ones(len(sort_ix))
    clusters = [sort_ix]
    while clusters:
        clusters = [c[s:e] for c in clusters for s, e in ((0, len(c) // 2), (len(c) // 2, len(c))) if len(c) > 1]
        for subcluster in range(0, len(clusters), 2):
            if subcluster + 1 >= len(clusters):
                break
            left = clusters[subcluster]
            right = clusters[subcluster + 1]

            def _cluster_var(idxs):
                sub = cov[np.ix_(idxs, idxs)]
                w = 1.0 / np.diag(sub)
                w /= w.sum()
                return float(w @ sub @ w)

            v_left = _cluster_var(left)
            v_right = _cluster_var(right)
            alpha = 1 - v_left / (v_left + v_right + 1e-12)
            weights[[sort_ix.index(i) for i in left]] *= alpha
            weights[[sort_ix.index(i) for i in right]] *= 1 - alpha
    return weights


def hrp_optimize(symbols: list[str], returns: np.ndarray) -> dict:
    n = len(symbols)
    if n < 2 or returns.shape[1] != n:
        raise ValueError(f"Expected {n} columns in returns, got {returns.shape[1]}")

    cov = np.cov(returns, rowvar=False) * 252 + np.eye(n) * 1e-6
    std = np.sqrt(np.diag(cov))
    corr = cov / np.outer(std, std)
    corr = np.clip(corr, -1, 1)

    dist = _corr_to_dist(corr)
    condensed = squareform(dist, checks=False)
    link = linkage(condensed, method="single")

    sort_ix = _quasi_diag(link, n)
    cov_sorted = cov[np.ix_(sort_ix, sort_ix)]
    raw_weights = _recursive_bisect(cov_sorted, list(range(n)))

    # Map back to original symbol order
    reordered = np.zeros(n)
    for new_pos, orig_pos in enumerate(sort_ix):
        reordered[orig_pos] = raw_weights[new_pos]
    reordered = np.clip(reordered, 0, None)
    reordered /= reordered.sum()

    expected_returns = returns.mean(axis=0) * 252
    port_return = float(reordered @ expected_returns)
    port_vol = float(np.sqrt(reordered @ cov @ reordered))
    risk_free_rate = 0.065
    sharpe = (port_return - risk_free_rate) / (port_vol + 1e-9)

    return {
        "method": "HRP (Hierarchical Risk Parity)",
        "weights": {s: round(float(reordered[i]), 4) for i, s in enumerate(symbols)},
        "expected_return": round(port_return, 4),
        "expected_volatility": round(port_vol, 4),
        "sharpe_ratio": round(sharpe, 4),
        "note": "Return estimate uses historical mean — HRP is return-agnostic by design",
    }
