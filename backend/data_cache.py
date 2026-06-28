"""
Tiered cache: MongoDB (persistent, survives restarts) → in-memory TTL → live fetch.
Candles: 6h TTL.  Signals: 1h TTL.  Market caps / sectors: 24h TTL.
"""

import time
from datetime import datetime, timezone, timedelta

import yfinance as yf
from signal_engine import NIFTY50_TICKERS

# ── In-memory fallback ────────────────────────────────────────────────────────

_mem: dict = {}
_candle_mem: dict = {}


def _mem_get(key: str):
    e = _mem.get(key)
    return e["value"] if e and time.time() < e["expires"] else None


def _mem_set(key: str, value, ttl: int):
    _mem[key] = {"value": value, "expires": time.time() + ttl}


# ── MongoDB helpers ───────────────────────────────────────────────────────────

def _mongo_get(collection, key: str):
    try:
        doc = collection.find_one({"_id": key})
        if doc and doc["expires_at"] > datetime.now(timezone.utc):
            return doc["value"]
    except Exception:
        pass
    return None


def _mongo_set(collection, key: str, value, ttl: int):
    try:
        collection.replace_one(
            {"_id": key},
            {"_id": key, "value": value, "expires_at": datetime.now(timezone.utc) + timedelta(seconds=ttl)},
            upsert=True,
        )
    except Exception:
        pass


# ── Generic TTL cache (market caps, sectors, FII) ────────────────────────────

def _get(key: str, ttl: int):
    try:
        from db import cache_collection, MONGO_AVAILABLE
        if MONGO_AVAILABLE and cache_collection is not None:
            v = _mongo_get(cache_collection, key)
            if v is not None:
                return v
    except Exception:
        pass
    return _mem_get(key)


def _set(key: str, value, ttl: int):
    _mem_set(key, value, ttl)
    try:
        from db import cache_collection, MONGO_AVAILABLE
        if MONGO_AVAILABLE and cache_collection is not None:
            _mongo_set(cache_collection, key, value, ttl)
    except Exception:
        pass


# ── Candle cache ──────────────────────────────────────────────────────────────

CANDLE_TTL = 6 * 3600  # 6h — covers full trading day between opens


def get_cached_candles(symbol: str, days_back: int = 365) -> list | None:
    key = f"{symbol}:{days_back}"

    # 1. MongoDB
    try:
        from db import candles_collection, MONGO_AVAILABLE
        if MONGO_AVAILABLE and candles_collection is not None:
            v = _mongo_get(candles_collection, key)
            if v is not None:
                _candle_mem[key] = {"value": v, "expires": time.time() + 300}
                return v
    except Exception:
        pass

    # 2. In-memory
    e = _candle_mem.get(key)
    if e and time.time() < e["expires"]:
        return e["value"]

    return None


def _store_candles(symbol: str, days_back: int, candles: list):
    key = f"{symbol}:{days_back}"
    _candle_mem[key] = {"value": candles, "expires": time.time() + 300}
    try:
        from db import candles_collection, MONGO_AVAILABLE
        if MONGO_AVAILABLE and candles_collection is not None:
            _mongo_set(candles_collection, key, candles, CANDLE_TTL)
    except Exception:
        pass


# ── DataFrame helpers (unchanged logic) ──────────────────────────────────────

def _rows_to_candles(ticker_df) -> list[dict]:
    ticker_df = ticker_df.dropna(how="all").reset_index()
    candles = []
    for _, row in ticker_df.iterrows():
        try:
            close_val = row.get("Close") if hasattr(row, "get") else row["Close"]
            if close_val != close_val:
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
    for key in (sym, sym.split(".")[0]):
        try:
            sub = df[key]
            if sub is not None and not sub.empty:
                return sub
        except (KeyError, TypeError):
            pass
        sub = df.get(key)
        if sub is not None and hasattr(sub, "empty") and not sub.empty:
            return sub
    return None


# ── Prefetch (batch yfinance, store in MongoDB) ───────────────────────────────

def prefetch_candles(tickers: list[str], days_back: int = 365) -> None:
    uncached = [s for s in tickers if get_cached_candles(s, days_back) is None]
    if not uncached:
        return

    if days_back <= 30:    period = "1mo"
    elif days_back <= 90:  period = "3mo"
    elif days_back <= 180: period = "6mo"
    elif days_back <= 365: period = "1y"
    elif days_back <= 730: period = "2y"
    else:                  period = "5y"
    batch_missed: list[str] = []

    try:
        df = yf.download(uncached, period=period, auto_adjust=False, progress=False, group_by="ticker")
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
                        _store_candles(sym, days_back, candles)
                    else:
                        batch_missed.append(sym)
                except Exception:
                    batch_missed.append(sym)
        else:
            batch_missed = list(uncached)
    except Exception:
        batch_missed = list(uncached)

    for sym in batch_missed:
        try:
            single_df = yf.download(sym, period=period, auto_adjust=False, progress=False)
            if single_df is not None and not single_df.empty:
                if hasattr(single_df.columns, "levels"):
                    single_df.columns = [c[0] if isinstance(c, tuple) else c for c in single_df.columns]
                candles = _rows_to_candles(single_df)
                if candles:
                    _store_candles(sym, days_back, candles)
        except Exception:
            pass
        time.sleep(0.3)


# ── Signals cache ─────────────────────────────────────────────────────────────

SIGNAL_TTL = 3600  # 1h


def get_cached_signal(symbol: str) -> dict | None:
    try:
        from db import signals_collection, MONGO_AVAILABLE
        if MONGO_AVAILABLE and signals_collection is not None:
            v = _mongo_get(signals_collection, symbol)
            if v is not None:
                return v
    except Exception:
        pass
    return _mem_get(f"sig:{symbol}")


def store_signal(symbol: str, data: dict):
    _mem_set(f"sig:{symbol}", data, SIGNAL_TTL)
    try:
        from db import signals_collection, MONGO_AVAILABLE
        if MONGO_AVAILABLE and signals_collection is not None:
            _mongo_set(signals_collection, symbol, data, SIGNAL_TTL)
    except Exception:
        pass


# ── Market caps ───────────────────────────────────────────────────────────────

def get_market_caps() -> dict[str, int]:
    cached = _get("market_caps", 86400)
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
        for symbol in NIFTY50_TICKERS:
            try:
                cap = yf.Ticker(symbol).info.get("marketCap")
                if cap:
                    caps[symbol] = int(cap)
            except Exception:
                pass

    _set("market_caps", caps, 86400)
    return caps


# ── Sectors ───────────────────────────────────────────────────────────────────

_STATIC_SECTORS: dict[str, str] = {
    # Banks
    "HDFCBANK.NS":"Banking","ICICIBANK.NS":"Banking","SBIN.NS":"Banking","AXISBANK.NS":"Banking",
    "KOTAKBANK.NS":"Banking","INDUSINDBK.NS":"Banking","BANKBARODA.NS":"Banking","CANBK.NS":"Banking",
    "PNB.NS":"Banking","UNIONBANK.NS":"Banking","INDIANB.NS":"Banking","FEDERALBNK.NS":"Banking",
    "IDFCFIRSTB.NS":"Banking","BANDHANBNK.NS":"Banking","YESBANK.NS":"Banking","RBLBANK.NS":"Banking",
    # NBFC / Finance
    "BAJFINANCE.NS":"NBFC","BAJAJFINSV.NS":"NBFC","LICHSGFIN.NS":"NBFC","CHOLAFIN.NS":"NBFC",
    "MUTHOOTFIN.NS":"NBFC","MANAPPURAM.NS":"NBFC","SHRIRAMFIN.NS":"NBFC","SUNDARMFIN.NS":"NBFC",
    "PNBHOUSING.NS":"NBFC","SBICARD.NS":"NBFC","ABCAPITAL.NS":"NBFC","LTFH.NS":"NBFC",
    # Insurance & AMC
    "SBILIFE.NS":"Insurance","HDFCLIFE.NS":"Insurance","ICICIPRULI.NS":"Insurance",
    "ICICIGI.NS":"Insurance","MFSL.NS":"Insurance","LICI.NS":"Insurance","STARHEALTH.NS":"Insurance",
    "HDFCAMC.NS":"Asset Management","NIPPONLIFE.NS":"Asset Management","ABSLAMC.NS":"Asset Management",
    "UTI.NS":"Asset Management","360ONE.NS":"Asset Management","ANGELONE.NS":"Broking",
    # IT
    "TCS.NS":"IT","INFY.NS":"IT","HCLTECH.NS":"IT","WIPRO.NS":"IT","TECHM.NS":"IT",
    "LTIM.NS":"IT","MPHASIS.NS":"IT","OFSS.NS":"IT","PERSISTENT.NS":"IT","KPITTECH.NS":"IT",
    "TATAELXSI.NS":"IT","COFORGE.NS":"IT","CYIENT.NS":"IT","BIRLASOFT.NS":"IT",
    "ZENSAR.NS":"IT","HEXAWARE.NS":"IT","TATACOMM.NS":"IT","MASTEK.NS":"IT",
    # Internet / New-Age Tech
    "ZOMATO.NS":"Internet","NAUKRI.NS":"Internet","POLICYBZR.NS":"Insurance Tech",
    "INDIAMART.NS":"Internet","CARTRADE.NS":"Internet","PAYTM.NS":"Fintech",
    "NYKAA.NS":"E-Commerce","EASEMYTRIP.NS":"Travel Tech","IXIGO.NS":"Travel Tech",
    # Auto
    "MARUTI.NS":"Automobile","TATAMOTORS.NS":"Automobile","HEROMOTOCO.NS":"Automobile",
    "EICHERMOT.NS":"Automobile","TVSMOTOR.NS":"Automobile","ASHOKLEY.NS":"Commercial Vehicles",
    "FORCEMOT.NS":"Automobile","BALKRISIND.NS":"Auto Ancillary","APOLLOTYRE.NS":"Tyres",
    "MRF.NS":"Tyres","BOSCHLTD.NS":"Auto Ancillary","BHARATFORG.NS":"Auto Ancillary",
    "MOTHERSON.NS":"Auto Ancillary","TIINDIA.NS":"Auto Ancillary","EXIDEIND.NS":"Auto Ancillary",
    # Pharma & Healthcare
    "SUNPHARMA.NS":"Pharma","DRREDDY.NS":"Pharma","CIPLA.NS":"Pharma","DIVISLAB.NS":"Pharma",
    "LUPIN.NS":"Pharma","AUROPHARMA.NS":"Pharma","TORNTPHARM.NS":"Pharma","ZYDUSLIFE.NS":"Pharma",
    "ALKEM.NS":"Pharma","GLENMARK.NS":"Pharma","BIOCON.NS":"Pharma","LALPATHLAB.NS":"Diagnostics",
    "APOLLOHOSP.NS":"Healthcare","FORTIS.NS":"Healthcare","MAXHEALTH.NS":"Healthcare",
    # FMCG
    "HINDUNILVR.NS":"FMCG","ITC.NS":"FMCG","NESTLEIND.NS":"FMCG","BRITANNIA.NS":"FMCG",
    "TATACONSUM.NS":"FMCG","DABUR.NS":"FMCG","MARICO.NS":"FMCG","GODREJCP.NS":"FMCG",
    "COLPAL.NS":"FMCG","EMAMILTD.NS":"FMCG","RADICO.NS":"Beverages","VBL.NS":"Beverages",
    "ASIANPAINT.NS":"Paints","TITAN.NS":"Jewellery","TRENT.NS":"Retail","DMART.NS":"Retail",
    # Energy & Oil
    "RELIANCE.NS":"Oil & Gas","ONGC.NS":"Oil & Gas","BPCL.NS":"Oil & Gas","IOC.NS":"Oil & Gas",
    "HINDPETRO.NS":"Oil & Gas","PETRONET.NS":"Oil & Gas","GAIL.NS":"Gas","MGL.NS":"Gas",
    "IGL.NS":"Gas","COALINDIA.NS":"Mining",
    # Power & Renewables
    "NTPC.NS":"Power","POWERGRID.NS":"Power","ADANIGREEN.NS":"Renewables","TATAPOWER.NS":"Power",
    "TORNTPOWER.NS":"Power","SJVN.NS":"Power","NHPC.NS":"Power","RECLTD.NS":"Power Finance",
    "PFC.NS":"Power Finance","IRFC.NS":"Infrastructure Finance","SUZLON.NS":"Renewables",
    # Metals & Mining
    "HINDALCO.NS":"Metals","JSWSTEEL.NS":"Steel","TATASTEEL.NS":"Steel","GRASIM.NS":"Diversified",
    "VEDL.NS":"Metals","SAIL.NS":"Steel","NMDC.NS":"Mining","JINDALSTEL.NS":"Steel",
    "JSPL.NS":"Steel","HINDCOPPER.NS":"Metals","NALCO.NS":"Metals",
    # Cement
    "ULTRACEMCO.NS":"Cement","SHREECEM.NS":"Cement","AMBUJACEM.NS":"Cement","ACC.NS":"Cement",
    "RAMCOCEM.NS":"Cement","JKCEMENT.NS":"Cement","DALMIACENTB.NS":"Cement",
    # Real Estate
    "DLF.NS":"Real Estate","GODREJPROP.NS":"Real Estate","OBEROIRLTY.NS":"Real Estate",
    "PHOENIXLTD.NS":"Real Estate","PRESTIGE.NS":"Real Estate","LODHA.NS":"Real Estate",
    # Capital Goods & Infra
    "LT.NS":"Engineering","SIEMENS.NS":"Engineering","ABB.NS":"Engineering",
    "BHEL.NS":"Engineering","HAL.NS":"Defence","BEL.NS":"Defence","BEML.NS":"Defence",
    "CGPOWER.NS":"Electrical","HAVELLS.NS":"Electrical","POLYCAB.NS":"Electrical",
    "RVNL.NS":"Infrastructure","IRCON.NS":"Infrastructure","NBCC.NS":"Infrastructure",
    "ADANIPORTS.NS":"Ports","ADANIENT.NS":"Diversified",
    # Chemicals
    "PIDILITE.NS":"Chemicals","SRF.NS":"Chemicals","DEEPAKNTR.NS":"Chemicals",
    "UPL.NS":"Agrochemicals","COROMANDEL.NS":"Agrochemicals","TATACHEM.NS":"Chemicals",
    # Telecom & Media
    "BHARTIARTL.NS":"Telecom","INDUSTOWER.NS":"Telecom","IDEA.NS":"Telecom",
    "SUNTV.NS":"Media","ZEEL.NS":"Media","SAREGAMA.NS":"Media",
    # Logistics
    "INDIGO.NS":"Aviation","DELHIVERY.NS":"Logistics","BLUEDART.NS":"Logistics",
    "CONCOR.NS":"Logistics","IRCTC.NS":"Railways",
}


def get_sectors() -> dict[str, str]:
    return _STATIC_SECTORS


# ── FII net ───────────────────────────────────────────────────────────────────

def get_fii_net() -> float | None:
    cached = _get("fii_net", 3600)
    if cached is not None:
        return cached

    try:
        import requests
        session = requests.Session()
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.nseindia.com/",
        })
        session.get("https://www.nseindia.com", timeout=8)
        resp = session.get("https://www.nseindia.com/api/fiidiiTradeReact", timeout=8)
        if resp.status_code == 200:
            for entry in resp.json():
                if "FII" in entry.get("category", "").upper():
                    net = float(entry.get("netValue", 0))
                    _set("fii_net", net, 3600)
                    return net
    except Exception:
        pass

    _set("fii_net", None, 900)
    return None


# ── Portfolio metrics (pure compute, no cache needed) ────────────────────────

def compute_portfolio_metrics(allocations: list, candles_by_symbol: dict) -> dict:
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
