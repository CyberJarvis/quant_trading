import pandas as pd
import numpy as np

NIFTY50_TICKERS = [
    "HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","KOTAKBANK.NS",
    "BAJFINANCE.NS","BAJAJFINSV.NS","INDUSINDBK.NS","SBILIFE.NS","HDFCLIFE.NS",
    "TCS.NS","INFY.NS","HCLTECH.NS","WIPRO.NS","TECHM.NS","LTIM.NS",
    "RELIANCE.NS","ONGC.NS","BPCL.NS","COALINDIA.NS","NTPC.NS","POWERGRID.NS",
    "HINDALCO.NS","JSWSTEEL.NS","TATASTEEL.NS","GRASIM.NS",
    "HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","BRITANNIA.NS","TATACONSUM.NS",
    "ASIANPAINT.NS","TITAN.NS","TRENT.NS","ZOMATO.NS",
    "MARUTI.NS","TATAMOTORS.NS","HEROMOTOCO.NS","EICHERMOT.NS",
    "SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS","APOLLOHOSP.NS",
    "LT.NS","ADANIENT.NS","ADANIPORTS.NS","BHARTIARTL.NS","ULTRACEMCO.NS",
]

# All 379 stocks across Research page categories — used for signal feed
ALL_TICKERS = [
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "AXISBANK.NS", "KOTAKBANK.NS", "INDUSINDBK.NS", "BANKBARODA.NS", "CANBK.NS",
    "PNB.NS", "UNIONBANK.NS", "INDIANB.NS", "UCOBANK.NS", "MAHABANK.NS", "BANKINDIA.NS", "IOB.NS", "CENTRALBK.NS",
    "FEDERALBNK.NS", "IDFCFIRSTB.NS", "BANDHANBNK.NS", "YESBANK.NS", "RBLBANK.NS", "CUB.NS", "DCBBANK.NS", "KARURVYSYA.NS",
    "SOUTHBANK.NS", "UJJIVANSFB.NS", "EQUITASBNK.NS", "ESAFSFB.NS", "SURYODAY.NS", "JKBANK.NS", "LAKSHVIL.NS", "BAJFINANCE.NS",
    "BAJAJFINSV.NS", "LICHSGFIN.NS", "CHOLAFIN.NS", "MUTHOOTFIN.NS", "MANAPPURAM.NS", "POONAWALLA.NS", "ABCAPITAL.NS", "LTFH.NS",
    "SBICARD.NS", "SHRIRAMFIN.NS", "SUNDARMFIN.NS", "PNBHOUSING.NS", "CANFINHOME.NS", "AAVAS.NS", "HOMEFIRST.NS", "APTUS.NS",
    "REPCO.NS", "CREDITACC.NS", "SBILIFE.NS", "HDFCLIFE.NS", "ICICIPRULI.NS", "ICICIGI.NS", "MFSL.NS", "LICI.NS",
    "NIACL.NS", "GICRE.NS", "STARHEALTH.NS", "HDFCAMC.NS", "NIPPONLIFE.NS", "ABSLAMC.NS", "UTI.NS", "360ONE.NS",
    "ANGELONE.NS", "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS", "TECHM.NS", "LTIM.NS", "MPHASIS.NS",
    "OFSS.NS", "PERSISTENT.NS", "KPITTECH.NS", "TATAELXSI.NS", "TATACOMM.NS", "COFORGE.NS", "CYIENT.NS", "MASTEK.NS",
    "BIRLASOFT.NS", "SONATSOFTW.NS", "RATEGAIN.NS", "INTELLECT.NS", "NIITLTD.NS", "ZENSAR.NS", "HEXAWARE.NS", "NEWGEN.NS",
    "TANLA.NS", "KRSNAA.NS", "ROUTE.NS", "INDIAMART.NS", "NAUKRI.NS", "POLICYBZR.NS", "CARTRADE.NS", "ZOMATO.NS",
    "MARUTI.NS", "TATAMOTORS.NS", "HEROMOTOCO.NS", "EICHERMOT.NS", "TVSMOTOR.NS", "ASHOKLEY.NS", "FORCEMOT.NS", "MAHINDCIE.NS",
    "MOTHERSON.NS", "BALKRISIND.NS", "APOLLOTYRE.NS", "CEATLTD.NS", "MRF.NS", "BOSCHLTD.NS", "EXIDEIND.NS", "SUNDRMFAST.NS",
    "TIINDIA.NS", "BHARATFORG.NS", "SCHAEFFLER.NS", "TIMKEN.NS", "MINDAIND.NS", "SUPRAJIT.NS", "LUMAXTECH.NS", "CRAFTSMAN.NS",
    "ENDURANCE.NS", "GABRIEL.NS", "HAPPYFORGE.NS", "SANSERA.NS", "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS",
    "LUPIN.NS", "AUROPHARMA.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS", "ABBOTINDIA.NS", "PFIZER.NS", "ALKEM.NS", "GLENMARK.NS",
    "BIOCON.NS", "LALPATHLAB.NS", "METROPOLIS.NS", "SYNGENE.NS", "GRANULES.NS", "IPCALAB.NS", "AJANTPHARM.NS", "NATCOPHARM.NS",
    "LAURUSLABS.NS", "ERISLIFE.NS", "JBCHEPHARM.NS", "SOLARA.NS", "STRIDES.NS", "APOLLOHOSP.NS", "NARAYANAHEALTH.NS", "FORTIS.NS",
    "MAXHEALTH.NS", "KIMS.NS", "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS", "TATACONSUM.NS", "DABUR.NS",
    "MARICO.NS", "GODREJCP.NS", "COLPAL.NS", "EMAMILTD.NS", "RADICO.NS", "UNITDSPR.NS", "VBL.NS", "VARUN.NS",
    "BIKAJI.NS", "PATANJALI.NS", "HATSUN.NS", "HERITAGE.NS", "KRBL.NS", "LTFOODS.NS", "ASIANPAINT.NS", "TITAN.NS",
    "TRENT.NS", "BATAINDIA.NS", "PAGEIND.NS", "RELAXO.NS", "HAVELLS.NS", "VOLTAS.NS", "VGUARD.NS", "BLUESTARCO.NS",
    "CROMPTON.NS", "POLYCAB.NS", "WHIRLPOOL.NS", "RAJESHEXPO.NS", "KALYAN.NS", "JUBLFOOD.NS", "WESTLIFE.NS", "DEVYANI.NS",
    "SAPPHIRE.NS", "PVRINOX.NS", "INOXGREEN.NS", "DMART.NS", "VMART.NS", "SHOPERSTOP.NS", "CANTABIL.NS", "RELIANCE.NS",
    "ONGC.NS", "BPCL.NS", "IOC.NS", "HINDPETRO.NS", "PETRONET.NS", "GAIL.NS", "MGL.NS", "IGL.NS",
    "GSPL.NS", "GUJGASLTD.NS", "AEGASIND.NS", "GASCO.NS", "MRPL.NS", "CPCL.NS", "NTPC.NS", "POWERGRID.NS",
    "ADANIGREEN.NS", "TATAPOWER.NS", "TORNTPOWER.NS", "SJVN.NS", "NLCINDIA.NS", "NHPC.NS", "RECLTD.NS", "PFC.NS",
    "IRFC.NS", "CESC.NS", "JSWENERGY.NS", "ADANITRANS.NS", "ADANIPOWER.NS", "COALINDIA.NS", "RKFORGE.NS", "INOXWIND.NS",
    "SUZLON.NS", "WINDWORLD.NS", "HINDALCO.NS", "JSWSTEEL.NS", "TATASTEEL.NS", "GRASIM.NS", "VEDL.NS", "SAIL.NS",
    "NMDC.NS", "NATIONALUM.NS", "JINDALSTEL.NS", "MOIL.NS", "APLAPOLLO.NS", "RATNAMANI.NS", "WELCORP.NS", "JSPL.NS",
    "TINPLATE.NS", "KALYANKJIL.NS", "GRAVITA.NS", "HINDCOPPER.NS", "NALCO.NS", "MIDHANI.NS", "ULTRACEMCO.NS", "SHREECEM.NS",
    "AMBUJACEM.NS", "ACC.NS", "DALMIACENTB.NS", "RAMCOCEM.NS", "JKCEMENT.NS", "HEIDELBERG.NS", "INDIACEM.NS", "PRISM.NS",
    "BIRLACORPN.NS", "NUVOCO.NS", "ORIENTCEM.NS", "KESORAMIND.NS", "SANGHI.NS", "DLF.NS", "GODREJPROP.NS", "OBEROIRLTY.NS",
    "PHOENIXLTD.NS", "PRESTIGE.NS", "SOBHA.NS", "BRIGADE.NS", "MAHLIFE.NS", "KOLTEPATIL.NS", "SUNTECK.NS", "LODHA.NS",
    "ARVINDFASN.NS", "ASHIANA.NS", "PODDARMENT.NS", "IBREALEST.NS", "LT.NS", "SIEMENS.NS", "ABB.NS", "HONAUT.NS",
    "THERMAX.NS", "BHEL.NS", "HAL.NS", "BEL.NS", "BEML.NS", "CGPOWER.NS", "CUMMINSIND.NS", "KALPATPOWR.NS",
    "AIAENG.NS", "ELGIEQUIP.NS", "GRINDWELL.NS", "SKFINDIA.NS", "GMRINFRA.NS", "KEC.NS", "POWERMECH.NS", "PRAJIND.NS",
    "TEXMACO.NS", "TITAGARH.NS", "RVNL.NS", "IRCON.NS", "NBCC.NS", "PIDILITE.NS", "SRF.NS", "DEEPAKNTR.NS",
    "UPL.NS", "COROMANDEL.NS", "ATUL.NS", "NAVINFLUOR.NS", "VINATIORGA.NS", "FINEORG.NS", "GALAXYSURF.NS", "GNFC.NS",
    "CLEAN.NS", "NOCIL.NS", "ALKYLAMINE.NS", "BALAMINES.NS", "SUDARSCHEM.NS", "ROSSARI.NS", "NEOGEN.NS", "TATACHEM.NS",
    "CHAMBAL.NS", "GSFC.NS", "FACT.NS", "RALLIS.NS", "DHANUKA.NS", "BHARTIARTL.NS", "INDUSTOWER.NS", "IDEA.NS",
    "SUNTV.NS", "ZEEL.NS", "SAREGAMA.NS", "NETWORK18.NS", "TV18BRDCST.NS", "HATHWAY.NS", "DISHTV.NS", "NAZARA.NS",
    "PLAYSTUDIOS.NS", "INDIGO.NS", "DELHIVERY.NS", "BLUEDART.NS", "CONCOR.NS", "IRCTC.NS", "MAHINDRALOG.NS", "VRL.NS",
    "GATI.NS", "AEGISLOG.NS", "TVSSCS.NS", "TCI.NS", "CONTAINERCO.NS", "ALLCARGO.NS", "SPICEJET.NS", "GOAIR.NS",
    "ADANIENT.NS", "ADANIPORTS.NS", "TATAMETALI.NS", "JSWINFRA.NS", "WELSPUNIND.NS", "NHAI.NS", "ENGINERSIN.NS", "RITES.NS",
    "WABCOINDIA.NS", "NYKAA.NS", "PAYTM.NS", "EASEMYTRIP.NS", "IXIGO.NS", "MAPMYINDIA.NS", "AWFIS.NS", "SIGNATURE.NS",
    "SYRMA.NS", "VEDANT.NS", "FRESHWORKS.NS",
]


def _compute_signals_inner(symbol: str, candles: list | None = None) -> dict:
    if not candles or len(candles) < 50:
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


def compute_signals(symbol: str, candles: list | None = None) -> dict:
    # Check MongoDB signal cache first — avoids recompute within 1h TTL
    from data_cache import get_cached_signal, store_signal as _store
    cached = get_cached_signal(symbol)
    if cached:
        return cached
    result = _compute_signals_raw(symbol, candles)
    if result:
        _store(symbol, result)
    return result


def _compute_signals_raw(symbol: str, candles: list | None = None) -> dict:
    """Raw signal computation — called only on cache miss."""
    from angel_client import get_candles as _get_candles
    if candles is None:
        candles = _get_candles(symbol, interval="ONE_DAY", days_back=365)
    return _compute_signals_inner(symbol, candles)


def _compute_all_signals_bg():
    """Background: compute signals for all 379 tickers, store to MongoDB."""
    try:
        from data_cache import prefetch_candles, get_cached_candles, get_cached_signal, store_signal as _store, _set
        from angel_client import get_candles as _get_candles
        prefetch_candles(ALL_TICKERS, days_back=365)
        results = []
        for ticker in ALL_TICKERS:
            try:
                sig = get_cached_signal(ticker)
                if not sig:
                    candles = get_cached_candles(ticker, 365) or _get_candles(ticker, "ONE_DAY", 365)
                    sig = _compute_signals_inner(ticker, candles)
                    if sig:
                        _store(ticker, sig)
                if sig:
                    results.append(sig)
            except Exception:
                pass
        results.sort(key=lambda x: x["composite_score"], reverse=True)
        _set("top_signals_v1", results, 3600)
        print(f"[signals] BG warm done: {len(results)} signals cached")
    except Exception as e:
        print(f"[signals] BG warm error: {e}")


def compute_cqr_signals(symbol: str, candles: list) -> dict:
    """Conformalized Quantile Regression — 90% guaranteed prediction interval for 5-day return.

    Returns prediction_interval with lower_pct, pred_realist (Q50 → Black-Litterman view),
    upper_pct, width, confidence, and abstain flag (width > 10%).
    Returns {"prediction_interval": None} when data < 100 bars or lightgbm unavailable.
    """
    try:
        import lightgbm as lgb
    except ImportError:
        return {"prediction_interval": None}

    if not candles or len(candles) < 250:
        return {"prediction_interval": None}

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
    macd = ema12 - ema26
    feat["macd_hist"] = macd - macd.ewm(span=9, adjust=False).mean()

    feat["target"] = log_ret.shift(-5)
    feat = feat.dropna()

    if len(feat) < 50:
        return {"prediction_interval": None}

    feature_cols = [c for c in feat.columns if c != "target"]
    X = feat[feature_cols]
    y = feat["target"].values

    split = int(len(X) * 0.8)
    X_train, X_cal = X.iloc[:split], X.iloc[split:]
    y_train, y_cal = y[:split], y[split:]

    if len(X_cal) < 10:
        return {"prediction_interval": None}

    params_base = {
        "objective": "quantile",
        "n_estimators": 200,
        "learning_rate": 0.05,
        "num_leaves": 31,
        "verbose": -1,
    }
    models = {}
    for name, alpha_val in [("lo", 0.05), ("mid", 0.50), ("hi", 0.95)]:
        m = lgb.LGBMRegressor(**{**params_base, "alpha": alpha_val})
        m.fit(X_train, y_train)
        models[name] = m

    q_lo_cal = models["lo"].predict(X_cal)
    q_hi_cal = models["hi"].predict(X_cal)
    E = np.maximum(q_lo_cal - y_cal, y_cal - q_hi_cal)

    alpha = 0.10
    n_cal = len(X_cal)
    q_hat_level = min((1 - alpha) * (1 + 1 / n_cal), 1.0)
    q_hat = float(np.quantile(E, q_hat_level))

    X_new = X.iloc[[-1]]
    lower = float(models["lo"].predict(X_new)[0]) - q_hat
    pred  = float(models["mid"].predict(X_new)[0])
    upper = float(models["hi"].predict(X_new)[0]) + q_hat
    width = upper - lower

    lower_pct = round(lower * 100, 2)
    pred_pct  = round(pred  * 100, 2)
    upper_pct = round(upper * 100, 2)
    width_pct = round(width * 100, 2)

    return {
        "prediction_interval": {
            "lower_pct":    lower_pct,
            "pred_realist": pred_pct,
            "upper_pct":    upper_pct,
            "width":        width_pct,
            "confidence":   0.90,
            "abstain":      width_pct > 10.0,
        }
    }


def get_top_signals(n: int = 10) -> list:
    from data_cache import get_cached_signal, _get, _set, get_cached_candles

    # 1. Full cached list → instant return
    cached_list = _get("top_signals_v1", 3600)
    if cached_list:
        return cached_list[:n]

    # 2. Return whatever individual signals are already in cache (no blocking compute)
    cached_results = []
    for ticker in ALL_TICKERS:
        try:
            sig = get_cached_signal(ticker)
            if sig:
                cached_results.append(sig)
        except Exception:
            pass

    if len(cached_results) >= 10:
        cached_results.sort(key=lambda x: x["composite_score"], reverse=True)
        return cached_results[:n]

    # 3. Cold start: compute Nifty50 only (fast, ~20s), trigger full BG compute
    import threading
    from data_cache import prefetch_candles, store_signal as _store
    from angel_client import get_candles as _get_candles
    prefetch_candles(NIFTY50_TICKERS, days_back=365)
    results = []
    for ticker in NIFTY50_TICKERS:
        try:
            sig = get_cached_signal(ticker)
            if not sig:
                candles = get_cached_candles(ticker, 365) or _get_candles(ticker, "ONE_DAY", 365)
                sig = _compute_signals_inner(ticker, candles)
                if sig:
                    _store(ticker, sig)
            if sig:
                results.append(sig)
        except Exception:
            pass
    results.sort(key=lambda x: x["composite_score"], reverse=True)
    # Kick off full 379-stock compute in background
    threading.Thread(target=_compute_all_signals_bg, daemon=True).start()
    return results[:n]
