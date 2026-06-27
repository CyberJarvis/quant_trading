"""
Angel One SmartAPI client — singleton auth + data fetching.
Token refreshes automatically when expired.
"""

import os
import time
import pyotp
import requests
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY     = os.getenv("ANGEL_API_KEY")
CLIENT_CODE = os.getenv("ANGEL_CLIENT_CODE")
PIN         = os.getenv("ANGEL_PIN")
TOTP_SECRET = os.getenv("ANGEL_TOTP_SECRET")

BASE_URL = "https://apiconnect.angelbroking.com"

_token_cache = {"jwt": None, "refresh": None, "feed_token": None, "expires_at": 0}
_public_ip: str = "127.0.0.1"


def _fetch_public_ip() -> str:
    """Fetch real public IP once at startup."""
    try:
        return requests.get("https://api.ipify.org", timeout=5).text.strip()
    except Exception:
        return "127.0.0.1"


def _headers(jwt: str = None) -> dict:
    h = {
        "Content-Type":     "application/json",
        "Accept":           "application/json",
        "X-UserType":       "USER",
        "X-SourceID":       "WEB",
        "X-ClientLocalIP":  "127.0.0.1",
        "X-ClientPublicIP": _public_ip,
        "X-MACAddress":     "00:00:00:00:00:00",
        "X-PrivateKey":     API_KEY,
    }
    if jwt:
        h["Authorization"] = f"Bearer {jwt}"
    return h


def login() -> dict:
    """Login to Angel One and cache JWT token. Returns token dict."""
    global _public_ip
    _public_ip = _fetch_public_ip()

    totp = pyotp.TOTP(TOTP_SECRET).now()
    resp = requests.post(
        f"{BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword",
        headers=_headers(),
        json={"clientcode": CLIENT_CODE, "password": PIN, "totp": totp},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json().get("data", {})

    _token_cache["jwt"]        = data.get("jwtToken")
    _token_cache["refresh"]    = data.get("refreshToken")
    _token_cache["feed_token"] = data.get("feedToken")
    _token_cache["expires_at"] = time.time() + 3600
    return _token_cache


def get_token() -> str:
    """Return a valid JWT, re-logging in if expired."""
    if not _token_cache["jwt"] or time.time() > _token_cache["expires_at"] - 60:
        login()
    return _token_cache["jwt"]


# ── Instrument master ─────────────────────────────────────────────────────────
# Angel One publishes a live instrument master JSON with all token IDs.
# We fetch it once and build a lookup map: "RELIANCE-EQ" → token.
# NSE equity suffix is "-EQ", indices have their own tokens below.

_MASTER_URL = (
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
)
_instrument_cache: dict = {}   # "SYMBOL-EQ" → {"token": "...", "exchange": "NSE"}
_master_loaded = False


def _load_instrument_master():
    global _master_loaded
    if _master_loaded:
        return
    cache_path = os.path.join(os.path.dirname(__file__), "OpenAPIScripMaster.json")
    data = None
    if os.path.exists(cache_path):
        mtime = os.path.getmtime(cache_path)
        if time.time() - mtime < 86400:  # 24 hours TTL
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                pass
    if not data:
        try:
            resp = requests.get(_MASTER_URL, timeout=20)
            if resp.status_code == 200:
                data = resp.json()
                try:
                    with open(cache_path, "w", encoding="utf-8") as f:
                        json.dump(data, f)
                except Exception:
                    pass
        except Exception:
            pass
    if data:
        try:
            for row in data:
                sym   = row.get("symbol", "")
                token = row.get("token", "")
                exch  = row.get("exch_seg", "")
                if exch in ("NSE", "BSE") and token:
                    _instrument_cache[sym] = {"token": token, "exchange": exch}
            _master_loaded = True
        except Exception:
            pass


def _nse_symbol(yf_symbol: str) -> str:
    """Convert yfinance symbol to Angel One NSE trading symbol."""
    return yf_symbol.replace(".NS", "-EQ").replace(".BO", "-EQ")


# Static map for indices (these are permanent system tokens, not market data)
_INDEX_TOKENS = {
    "^NSEI":     {"token": "99926000", "exchange": "NSE"},   # Nifty 50
    "^NSEBANK":  {"token": "99926009", "exchange": "NSE"},   # Bank Nifty
    "^INDIAVIX": {"token": "99919000", "exchange": "NSE"},   # India VIX
    "^BSESN":    {"token": "1",        "exchange": "BSE"},   # Sensex (BSE)
}


def _resolve_token(symbol: str) -> dict | None:
    """Resolve any symbol to {token, exchange}. Tries index map first, then master."""
    if symbol in _INDEX_TOKENS:
        return _INDEX_TOKENS[symbol]

    _load_instrument_master()
    nse_sym = _nse_symbol(symbol)
    if nse_sym in _instrument_cache:
        return _instrument_cache[nse_sym]

    return None


# Keep SYMBOL_TOKEN_MAP as a convenience alias used by routers
@property
def SYMBOL_TOKEN_MAP():
    return _instrument_cache


# ── Market data helpers ────────────────────────────────────────────────────────

def get_ltp(symbol: str) -> dict | None:
    """Get last traded price for a symbol."""
    info = _resolve_token(symbol)
    if not info:
        return None

    jwt = get_token()
    resp = requests.post(
        f"{BASE_URL}/rest/secure/angelbroking/market/v1/quote/",
        headers=_headers(jwt),
        json={"mode": "LTP", "exchangeTokens": {info["exchange"]: [info["token"]]}},
        timeout=10,
    )
    if resp.status_code != 200:
        return None

    fetched = resp.json().get("data", {}).get("fetched", [])
    return fetched[0] if fetched else None


def get_candles(symbol: str, interval: str = "ONE_DAY",
                days_back: int = 365) -> list[dict]:
    """
    Fetch OHLCV candle data. Checks MongoDB cache first — cold fetch only on miss.
    For periods > 30 days, yfinance is preferred over Angel One free tier.
    """
    try:
        from data_cache import get_cached_candles, _store_candles
        cached = get_cached_candles(symbol, days_back)
        if cached is not None:
            return cached
    except Exception:
        pass

    if days_back > 30:
        data = _yfinance_fallback(symbol, days_back)
        if data:
            try:
                from data_cache import _store_candles
                _store_candles(symbol, days_back, data)
            except Exception:
                pass
            return data
        result = _angel_candles(symbol, interval, days_back)
    else:
        result = _angel_candles(symbol, interval, days_back)

    if result:
        try:
            from data_cache import _store_candles
            _store_candles(symbol, days_back, result)
        except Exception:
            pass
    return result


def _angel_candles(symbol: str, interval: str, days_back: int) -> list[dict]:
    """Fetch candles from Angel One API with yfinance fallback."""
    info = _resolve_token(symbol)
    if not info:
        return _yfinance_fallback(symbol, days_back)

    from_dt = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d %H:%M")
    to_dt   = datetime.now().strftime("%Y-%m-%d %H:%M")

    try:
        jwt = get_token()
        resp = requests.post(
            f"{BASE_URL}/rest/secure/angelbroking/historical/v1/getCandleData",
            headers=_headers(jwt),
            json={
                "exchange":    info["exchange"],
                "symboltoken": info["token"],
                "interval":    interval,
                "fromdate":    from_dt,
                "todate":      to_dt,
            },
            timeout=15,
        )
        if resp.status_code != 200:
            return _yfinance_fallback(symbol, days_back)

        candles = resp.json().get("data", [])
        if not candles:
            return _yfinance_fallback(symbol, days_back)

        # Sanity check: Angel One free tier often returns partial data.
        # If returned candles cover less than 30% of expected trading days,
        # the data is truncated — fall back to yfinance for full history.
        expected_trading_days = int(days_back * 0.7)  # ~5/7 of calendar days
        if len(candles) < int(expected_trading_days * 0.3):
            yf_data = _yfinance_fallback(symbol, days_back)
            if yf_data:
                return yf_data

        return [
            {
                "date":   c[0][:10],
                "open":   round(float(c[1]), 2),
                "high":   round(float(c[2]), 2),
                "low":    round(float(c[3]), 2),
                "close":  round(float(c[4]), 2),
                "volume": int(c[5]),
            }
            for c in candles
        ]
    except Exception:
        return _yfinance_fallback(symbol, days_back)


def get_holdings() -> list[dict]:
    """Fetch live equity holdings from Angel One portfolio."""
    try:
        jwt = get_token()
        resp = requests.get(
            f"{BASE_URL}/rest/secure/angelbroking/portfolio/v1/getHolding",
            headers=_headers(jwt),
            timeout=10,
        )
        if resp.status_code != 200:
            return []
        data = resp.json().get("data", []) or []
        result = []
        for h in data:
            qty = int(h.get("quantity", 0) or 0)
            if qty <= 0:
                continue
            ltp = round(float(h.get("ltp", 0) or 0), 2)
            avg = round(float(h.get("averageprice", 0) or 0), 2)
            trading_sym = h.get("tradingsymbol", "")
            display = trading_sym.replace("-EQ", "").replace("-BE", "").strip()
            total_val = round(ltp * qty if ltp else avg * qty, 2)
            result.append({
                "symbol":         display + ".NS",
                "display_symbol": display,
                "qty":            qty,
                "avg_price":      avg,
                "current_price":  ltp,
                "pnl":            round(float(h.get("profitandloss", 0) or 0), 2),
                "pnl_pct":        round(float(h.get("pnlpercentage", 0) or 0), 2),
                "total_value":    total_val,
                "isin":           h.get("isin", ""),
            })
        return result
    except Exception:
        return []


def get_positions() -> list[dict]:
    """Fetch intraday/open positions from Angel One."""
    try:
        jwt = get_token()
        resp = requests.get(
            f"{BASE_URL}/rest/secure/angelbroking/order/v1/getPosition",
            headers=_headers(jwt),
            timeout=10,
        )
        if resp.status_code != 200:
            return []
        data = resp.json().get("data", []) or []
        result = []
        for p in data:
            net_qty = int(p.get("netqty", 0) or 0)
            if net_qty == 0:
                continue
            ltp = round(float(p.get("ltp", 0) or 0), 2)
            avg = round(float(p.get("netprice", 0) or 0), 2)
            trading_sym = p.get("tradingsymbol", "")
            display = trading_sym.replace("-EQ", "").replace("-BE", "").strip()
            result.append({
                "symbol":         display + ".NS",
                "display_symbol": display,
                "qty":            net_qty,
                "avg_price":      avg,
                "current_price":  ltp,
                "pnl":            round(float(p.get("pnl", 0) or 0), 2),
                "product":        p.get("producttype", "CNC"),
                "exchange":       p.get("exchange", "NSE"),
            })
        return result
    except Exception:
        return []


def _yfinance_fallback(symbol: str, days_back: int = 365) -> list[dict]:
    """yfinance historical OHLCV — raw (unadjusted) prices to match NSE/BSE quotes."""
    try:
        import yfinance as yf
        if days_back <= 30:    period = "1mo"
        elif days_back <= 90:  period = "3mo"
        elif days_back <= 180: period = "6mo"
        elif days_back <= 365: period = "1y"
        elif days_back <= 730: period = "2y"
        elif days_back <= 1825: period = "5y"
        else:                   period = "10y"
        # auto_adjust=False → raw traded prices that match what NSE/BSE display
        df = yf.download(symbol, period=period, progress=False, auto_adjust=False)
        if df.empty:
            return []
        df = df.reset_index()
        # Column names vary by yfinance version — handle both flat and MultiIndex
        cols = [c[0] if isinstance(c, tuple) else c for c in df.columns]
        df.columns = cols
        return [
            {
                "date":   str(row["Date"])[:10],
                "open":   round(float(row["Open"]), 2),
                "high":   round(float(row["High"]), 2),
                "low":    round(float(row["Low"]), 2),
                "close":  round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            }
            for _, row in df.iterrows()
        ]
    except Exception:
        return []
