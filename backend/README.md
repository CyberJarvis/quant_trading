# PRAVAH Backend

FastAPI server with Angel One SmartAPI + yfinance fallback.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Credentials

Copy `.env.example` to `.env` and fill in your Angel One credentials:
```
ANGEL_API_KEY=...
ANGEL_CLIENT_CODE=...
ANGEL_PIN=...
ANGEL_TOTP_SECRET=...
```

## Run

```bash
source .venv/bin/activate
python main.py
# Server starts at http://localhost:8000
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/regime | Market regime (BULL/BEAR/SIDEWAYS) |
| GET | /api/market/indices | Live Nifty, Sensex, VIX |
| GET | /api/market/stock?symbol=X&period=1y | OHLCV candles |
| GET | /api/signals?symbol=X | Technical signals for a stock |
| GET | /api/signals/top | Top 10 buy signals |
| POST | /api/portfolio/create | Optimize portfolio from brief text |
| POST | /api/backtest | Run backtest |
| POST | /api/stress-test | Stress test portfolio |
