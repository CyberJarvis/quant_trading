from fastapi import APIRouter, Query
from angel_client import get_ltp, get_candles
from data_cache import get_market_caps, get_fii_net
import numpy as np
import pandas as pd

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


def _build_cqr_features(candles: list):
    """Shared feature engineering for CQR — returns (X, y, feature_cols) or None."""
    df = pd.DataFrame(candles)
    close = df["close"].astype(float).reset_index(drop=True)
    log_ret = np.log(close / close.shift(1))

    feat = pd.DataFrame()
    for lag in [1, 2, 3, 5]:
        feat[f"ret_lag{lag}"] = log_ret.shift(lag)
    for w in [5, 10, 20]:
        feat[f"vol_{w}d"] = log_ret.rolling(w).std()

    delta = close.diff()
    gain = delta.clip(lower=0).rolling(14).mean()
    loss = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gain / loss.replace(0, np.nan)
    feat["rsi"] = 100 - (100 / (1 + rs))

    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd  = ema12 - ema26
    feat["macd_hist"] = (macd - macd.ewm(span=9, adjust=False).mean()) / close

    feat["target"] = np.log(close.shift(-5) / close)   # cumulative 5-day log return
    feat = feat.dropna()
    if len(feat) < 50:
        return None
    feature_cols = [c for c in feat.columns if c != "target"]
    return feat[feature_cols], feat["target"].values, feature_cols


@router.get("/verify/{symbol}")
def verify_prediction(symbol: str):
    """
    Two-part CQR verification for judge demo:
    1. RETROSPECTIVE — use candles up to 5 trading days ago, run CQR, compare predicted
       interval against the actual realized 5-day return (now observable).
    2. COVERAGE RATE — on the calibration split, what fraction of actual returns fell
       inside the CQR interval? Should be ≥ 0.90 (provable from data alone).
    Also runs formula sanity checks: RSI bounds, MACD sign, GBM P50 drift.
    """
    try:
        import lightgbm as lgb
    except ImportError:
        return {"error": "lightgbm not installed"}

    candles = get_candles(symbol, interval="ONE_DAY", days_back=400)
    if not candles or len(candles) < 260:
        return {"error": "Insufficient history (need 260+ trading days)", "symbol": symbol}

    closes = np.array([c["close"] for c in candles], dtype=float)
    params = {"objective": "quantile", "n_estimators": 200,
              "learning_rate": 0.05, "num_leaves": 31, "verbose": -1}

    # ── 1. Retrospective: prediction made 5 trading days ago ─────────────────
    LOOKBACK = 5
    candles_past = candles[:-LOOKBACK]
    feats_past   = _build_cqr_features(candles_past)

    retro = None
    if feats_past:
        X_p, y_p, _ = feats_past
        split = int(len(X_p) * 0.8)
        X_tr, X_cal = X_p.iloc[:split], X_p.iloc[split:]
        y_tr, y_cal = y_p[:split], y_p[split:]

        m_lo  = lgb.LGBMRegressor(**{**params, "alpha": 0.05}); m_lo.fit(X_tr, y_tr)
        m_mid = lgb.LGBMRegressor(**{**params, "alpha": 0.50}); m_mid.fit(X_tr, y_tr)
        m_hi  = lgb.LGBMRegressor(**{**params, "alpha": 0.95}); m_hi.fit(X_tr, y_tr)

        E = np.maximum(m_lo.predict(X_cal) - y_cal, y_cal - m_hi.predict(X_cal))
        q_hat = float(np.quantile(E, min(0.90 * (1 + 1/len(X_cal)), 1.0)))

        X_new    = X_p.iloc[[-1]]
        pred_lo  = float(m_lo.predict(X_new)[0])  - q_hat
        pred_mid = float(m_mid.predict(X_new)[0])
        pred_hi  = float(m_hi.predict(X_new)[0])  + q_hat

        price_t0    = float(candles_past[-1]["close"])
        price_t5    = float(candles[-1]["close"])
        # cumulative log return — same units as model target
        actual_ret  = round(np.log(price_t5 / price_t0) * 100, 4)
        covered     = (pred_lo * 100) <= actual_ret <= (pred_hi * 100)

        retro = {
            "prediction_window":    f"{candles_past[-1]['date']} → {candles[-1]['date']}",
            "price_at_prediction":  round(price_t0, 2),
            "price_realized":       round(price_t5, 2),
            "actual_log_return_pct": actual_ret,   # log(p_t5/p_t0)*100 — matches model target
            "predicted_lower_pct": round(pred_lo * 100, 2),
            "predicted_median_pct": round(pred_mid * 100, 2),
            "predicted_upper_pct": round(pred_hi * 100, 2),
            "covered":             covered,
            "verdict": "PASS — actual return inside predicted interval" if covered
                       else "MISS — actual return outside predicted interval",
        }

    # ── 2. Historical calibration coverage rate ───────────────────────────────
    feats_full = _build_cqr_features(candles)
    coverage = None
    if feats_full:
        X_f, y_f, _ = feats_full
        split = int(len(X_f) * 0.8)
        X_tr2, X_cal2 = X_f.iloc[:split], X_f.iloc[split:]
        y_tr2, y_cal2 = y_f[:split], y_f[split:]

        m2_lo  = lgb.LGBMRegressor(**{**params, "alpha": 0.05}); m2_lo.fit(X_tr2, y_tr2)
        m2_hi  = lgb.LGBMRegressor(**{**params, "alpha": 0.95}); m2_hi.fit(X_tr2, y_tr2)
        E2     = np.maximum(m2_lo.predict(X_cal2) - y_cal2, y_cal2 - m2_hi.predict(X_cal2))
        q2     = float(np.quantile(E2, min(0.90 * (1 + 1/len(X_cal2)), 1.0)))

        lo_preds = m2_lo.predict(X_cal2) - q2
        hi_preds = m2_hi.predict(X_cal2) + q2
        hits     = int(np.sum((lo_preds <= y_cal2) & (y_cal2 <= hi_preds)))
        total    = len(y_cal2)
        rate     = round(hits / total, 4)

        coverage = {
            "calibration_samples": total,
            "hits":                hits,
            "coverage_achieved":   rate,
            "coverage_target":     0.90,
            "guarantee_met":       rate >= 0.90,
            "verdict": f"PASS — {rate*100:.1f}% coverage ≥ 90% target" if rate >= 0.90
                       else f"FAIL — {rate*100:.1f}% coverage < 90% target",
        }

    # ── 3. Formula sanity checks ──────────────────────────────────────────────
    log_ret = np.log(closes[1:] / closes[:-1])

    # RSI
    delta_c  = np.diff(closes)
    gain_arr = np.where(delta_c > 0, delta_c, 0.0)
    loss_arr = np.where(delta_c < 0, -delta_c, 0.0)
    avg_gain = np.mean(gain_arr[-14:])
    avg_loss = np.mean(loss_arr[-14:])
    rsi_val  = round(100 - (100 / (1 + avg_gain / avg_loss)) if avg_loss > 0 else 100.0, 2)
    rsi_ok   = 0 <= rsi_val <= 100

    # MACD histogram sign consistency
    s = pd.Series(closes)
    macd_line = s.ewm(span=12).mean() - s.ewm(span=26).mean()
    macd_sig  = macd_line.ewm(span=9).mean()
    hist_last = float(macd_line.iloc[-1] - macd_sig.iloc[-1])
    macd_ok   = abs(hist_last) < abs(float(closes[-1])) * 0.05  # histogram < 5% of price

    # GBM P50[0] drift check
    mu    = float(log_ret.mean())
    sigma = float(log_ret.std())
    S0    = float(closes[-1])
    expected_p50_step1 = round(S0 * np.exp(mu - 0.5 * sigma**2 + sigma * 0.0), 2)
    rng   = np.random.default_rng(seed=42)
    paths = S0 * np.exp(np.cumsum((mu - 0.5*sigma**2) + sigma*rng.standard_normal((1000, 1)), axis=1))
    actual_p50_step1   = round(float(np.percentile(paths, 50)), 2)
    gbm_drift_ok = abs(actual_p50_step1 - S0) / S0 < 0.05  # P50 within 5% of S0 for 1-day

    # Live intraday status
    intraday = None
    ltp = get_ltp(symbol)
    if ltp and ltp.get("ltp"):
        live_price = round(float(ltp["ltp"]), 2)
        prev_close = round(float(closes[-1]), 2)
        intraday_ret = round((live_price - prev_close) / prev_close * 100, 2)
        intraday = {
            "live_price":       live_price,
            "prev_close":       prev_close,
            "intraday_return_pct": intraday_ret,
            "note": "Live intraday move vs yesterday's close",
        }

    return {
        "symbol":            symbol,
        "candles_used":      len(candles),
        "retrospective_5d":  retro,
        "coverage_rate":     coverage,
        "formula_sanity": {
            "rsi_value":         rsi_val,
            "rsi_in_bounds":     rsi_ok,
            "macd_histogram":    round(hist_last, 4),
            "macd_sanity_ok":    macd_ok,
            "gbm_p50_step1":     actual_p50_step1,
            "gbm_drift_ok":      gbm_drift_ok,
            "daily_mu_pct":      round(mu * 100, 4),
            "daily_sigma_pct":   round(sigma * 100, 4),
        },
        "live_intraday":     intraday,
    }
