# PRAVAH — Quant Trading Intelligence Platform

PRAVAH is a full-stack quantitative trading platform built for Indian equity markets. It combines live NSE/BSE data via Angel One SmartAPI, multi-model portfolio optimization, and a conformal prediction layer that gives mathematically guaranteed uncertainty bounds on 5-day return forecasts.

Built in 24 hours for a hackathon. The math is real.

---

## What it actually does

**Market Regime Detection** — On startup, PRAVAH pulls Nifty 50 candles and classifies the current market into BULL / SIDEWAYS / BEAR using a scoring system: price vs SMA50, price vs SMA200, golden/death cross, 20-day momentum, and India VIX. The regime label isn't cosmetic — it directly feeds the portfolio optimizer's risk budget.

**Signal Engine** — Computes composite buy/sell scores (-10 to +10) for 379 NSE stocks across 22 sectors. Each stock gets RSI (14), MACD (12/26/9), Bollinger Bands (20, 2σ), SMA crossovers, and volume trend signals. Signals are cached in MongoDB and refreshed in the background — the first request for any stock is slow, subsequent ones are instant.

**CQR — Conformalized Quantile Regression** — The headline feature. Trains three LightGBM models (Q5, Q50, Q95) on 1 year of daily candle features (lagged returns, rolling vol, RSI, MACD histogram) to predict the cumulative 5-day log return. A split conformal calibration step computes a coverage correction `q_hat` over the holdout set, which inflates the raw quantile interval until 90% historical coverage is achieved. This is a provable guarantee — not a heuristic.

The `q_hat` formula:

```Java
q_hat = quantile(E, min(0.90 × (1 + 1/n_cal), 1.0))
E_i   = max(q_lo(X_i) − y_i, y_i − q_hi(X_i))
```

Models are persisted to `/tmp/pravah_cqr/` keyed by symbol + date, so repeat requests within the same day skip retraining (~15s → ~0.3s).

**VERIFY endpoint** — `/api/verify/{symbol}` runs a live retrospective. It trains on all data, takes the last feature row (which anchors 5 trading days before yesterday due to the shifted target), predicts the interval, then compares against the *already-realized* return. On TCS as of June 2026: predicted [-7.5%, 6.3%], actual was -5.05% → PASS. Historical coverage across the calibration set: 90.5% (86/95 windows).

**GBM Monte Carlo** — Separate from CQR. Pure numpy Geometric Brownian Motion simulation for fan chart visualization. Estimates drift (μ) and vol (σ) from log returns, runs 500 paths forward 30 days, returns P10/P25/P50/P75/P90 percentile bands. Not a prediction — explicitly labeled as scenario visualization.

**Black-Litterman Portfolio Optimizer** — Takes CQR's Q50 median forecast as the view vector Q (annualized via ×252/5), and uses CQR interval width as the uncertainty matrix Ω. Narrow interval → model is confident → B-L tilts aggressively toward the view. Wide interval → model abstains → weights stay near market-cap equilibrium.

The B-L posterior:

```
E[R] = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ × [(τΣ)⁻¹Π + P'Ω⁻¹Q]
```

Also ships Markowitz mean-variance (with ridge regularization for numerical stability) and Hierarchical Risk Parity (HRP via single-linkage clustering + inverse variance allocation) as comparison optimizers.

**Groq LLM Integration** — Portfolio briefs are parsed by `llama-3.3-70b` running on Groq's inference API. User writes natural language ("I want to invest 5 lakhs for 3 years, moderate risk, focus on IT and pharma") → Groq extracts capital, horizon, risk tolerance, sector preferences → signal engine picks top stocks per sector → B-L optimizes weights.

**Backtest Engine** — Vectorized Python backtest over historical daily candles. Supports five strategies: composite signal (all indicators combined), RSI mean reversion, MACD crossover, SMA crossover, and Bollinger Band reversion. Returns equity curve, Sharpe ratio, max drawdown, alpha vs Nifty 50, total return.

**Stress Test** — Simulates portfolio through five historical Indian market crashes (COVID March 2020: -38%, Bear Market 2022: -16%, Demonetisation 2016: -9%, Adani Crisis 2023: -7%, IL&FS 2018: -14%) using actual per-stock historical returns for each crash period. Also supports custom shock (-1% to -60%).

**Angel One SmartAPI Integration** — Live NSE data, LTP feeds, and order placement (BUY/SELL with market/limit/SL types). Falls back to yfinance if Angel One is unavailable or rate-limited. The order flow is real but gated behind a confirmation step in the UI.

---

## Architecture

```
quant_trading/
├── backend/                    # FastAPI — Python 3.14
│   ├── main.py                 # App init, Angel One login, cache warm on startup
│   ├── angel_client.py         # SmartAPI wrapper — candles, LTP, orders
│   ├── signal_engine.py        # 379-stock signal computation + CQR training
│   ├── regime_detector.py      # Nifty + VIX → BULL/SIDEWAYS/BEAR
│   ├── black_litterman.py      # B-L optimizer (CQR views → weights)
│   ├── backtest_engine.py      # Vectorized strategy backtester
│   ├── stress_test.py          # Historical crash scenario simulator
│   ├── groq_client.py          # Llama-3.3-70B for portfolio brief parsing
│   ├── data_cache.py           # In-memory + MongoDB signal/candle cache
│   ├── markowitz.py            # Mean-variance optimizer with ridge
│   ├── hrp.py                  # Hierarchical Risk Parity
│   ├── optimizer_comparison.py # Runs all three optimizers, returns comparison
│   ├── risk_metrics.py         # Sharpe, Sortino, max drawdown, VaR, CVaR
│   ├── db.py                   # MongoDB client (optional — degrades gracefully)
│   ├── schemas.py              # Pydantic request/response models
│   └── routers/
│       ├── market.py           # /stock, /indices, /caps, /forecast, /verify
│       ├── signals.py          # /signals, /signals/top
│       ├── regime.py           # /regime
│       ├── portfolio.py        # /create, /brief, /order, /holdings
│       ├── backtest.py         # /backtest
│       ├── stress.py           # /stress-test
│       ├── optimizer.py        # /optimize
│       ├── news.py             # /news, /news/sentiment
│       └── auth.py             # signup, login, OTP verify, onboarding
│
└── frontend/                   # Next.js 15, TypeScript, Tailwind
    ├── app/
    │   ├── dashboard/          # Regime badge, equity curve, signal feed, VIX gauge
    │   ├── research/           # Candlestick + RSI + MACD charts, CQR, GBM, VERIFY
    │   ├── portfolio/          # Natural-language brief → B-L allocation
    │   ├── backtest/           # Strategy backtester with drawdown charts
    │   ├── stress-test/        # Crash scenario simulator
    │   ├── profile/            # Quant params, behavioral profiling, API keys
    │   ├── login/              # Email + password → OTP flow
    │   └── signup/             # Account creation with email verification
    ├── components/
    │   ├── dashboard/          # EquityCurve, MetricCard, RegimeBadge, SignalFeed, VixGauge
    │   ├── research/           # CandlestickChart (lightweight-charts), RsiChart, MacdChart, ForecastChart
    │   ├── portfolio/          # BriefChat, AllocationPie, HoldingsTable, OrderModal
    │   ├── backtest/           # BacktestForm, MetricsPanel, DrawdownChart
    │   ├── stress/             # ScenarioPicker, ImpactChart
    │   └── layout/             # Sidebar, TopBar (live Nifty/Sensex/VIX ticker)
    └── lib/
        ├── api.ts              # Typed API client (BASE = http://localhost:8000)
        └── types.ts            # Shared TypeScript interfaces
```

---

## Setup

### Prerequisites

- Python 3.11+ (tested on 3.14)
- Node.js 18+
- Angel One demat account (for live data + orders)
- MongoDB Atlas URI (optional — app runs without it, signals aren't persisted)
- Groq API key (for portfolio brief parsing)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file:

```env
# Angel One SmartAPI
ANGEL_API_KEY=your_api_key
ANGEL_CLIENT_ID=your_client_id
ANGEL_PASSWORD=your_password
ANGEL_TOTP_SECRET=your_totp_secret

# Groq
GROQ_API_KEY=your_groq_api_key

# MongoDB (optional)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/pravah

# Email OTP (optional — OTP prints to console if not set)
SMTP_USER=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password
```

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

On startup: Angel One login runs, then Nifty 50 signals warm in the background. First `/api/signals/top` call may take 20-30s if cache is cold.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:3000`. All API calls go to `http://localhost:8000` directly (no Next.js proxy).

### Demo mode

Skip Angel One credentials entirely — click **Quick Demo** on the login page, or set localStorage manually:

```javascript
localStorage.setItem('pravah_user', JSON.stringify({name:'Demo User',email:'demo@pravah.ai',isDemo:true}));
localStorage.setItem('pravah_onboarding_completed','true');
```

Demo mode bypasses auth and uses yfinance as the data source fallback.

---

## API Reference

```
GET  /api/regime                    Market regime (BULL/SIDEWAYS/BEAR) + score
GET  /api/market/indices            Nifty 50, Sensex, Bank Nifty, VIX, FII
GET  /api/market/stock              OHLCV candles + live price
GET  /api/market/caps               Market cap dict for all tracked symbols
GET  /api/forecast                  GBM Monte Carlo fan chart (P10–P90)
GET  /api/verify/{symbol}           CQR retrospective + coverage audit
GET  /api/signals                   Composite signal for one stock (cqr=true for intervals)
GET  /api/signals/top               Top N buy signals across all 379 stocks
POST /api/portfolio/create          NLP brief → B-L optimized allocation
POST /api/portfolio/brief           Risk brief + optimizer comparison
POST /api/backtest                  Vectorized strategy backtest
POST /api/stress-test               Historical crash scenario simulation
POST /api/optimize                  Run all three optimizers, return comparison
GET  /api/news                      NSE market news feed
GET  /api/news/sentiment            Sentiment scores for given symbols
POST /api/portfolio/order           Place order via Angel One SmartAPI
GET  /api/portfolio/holdings        Live holdings from Angel One
POST /api/auth/signup               Create account + send OTP
POST /api/auth/verify-otp           Verify OTP → activate account
POST /api/auth/login                Login → OTP if unverified
POST /api/auth/onboarding           Save user risk profile
```

---

## Key technical decisions

**Why CQR over a point forecast?** Point forecasts for individual stocks are essentially noise at a 5-day horizon. CQR doesn't pretend otherwise — it gives a calibrated interval and lets the optimizer decide how much to trust it based on width. A 2% wide interval and a 15% wide interval both "pass" coverage, but B-L treats them very differently.

**Why LightGBM over ARIMA/GARCH?** GARCH convergence is fragile on short history and breaks silently on extreme returns. ARIMA assumes linearity. LightGBM handles non-linear feature interactions and missing data without tuning. The pinball loss directly targets quantile regression without any distributional assumptions.

**Why B-L over pure Markowitz?** Markowitz mean-variance is notoriously sensitive to return estimates — garbage in, garbage out, and the resulting weights are often extreme (100% in one stock). B-L mixes the prior (market-cap equilibrium) with views (CQR forecasts), dampened by view uncertainty (interval width). The result is more stable and interpretable.

**Why Angel One SmartAPI + yfinance?** Angel One gives real-time NSE/BSE data and order routing at near-zero latency. yfinance is the fallback for historical data, extended history, and when Angel One rate-limits. They're not equivalent — Angel One data is tick-accurate, yfinance has daily granularity artifacts on adjusted prices.

**Data cache design** — Candles are expensive to fetch (Angel One has rate limits). `data_cache.py` maintains an in-memory dict with TTLs (candles: 24h, regime: 15min, signals: 10min). MongoDB backs the signal cache across restarts. If MongoDB is unavailable, the app falls back to pure in-memory — everything still works, signals just recompute on restart.

---

## What's not production-ready

- Order placement has no order book, no partial fill handling, and no position tracking beyond what Angel One returns. It's functional for demo but not for serious trading.

---

## Tech stack

**Backend**: FastAPI, LightGBM, NumPy, Pandas, SciPy, scikit-learn, PyMongo, smartapi-python, yfinance, groq, feedparser

**Frontend**: Next.js 15, TypeScript, Tailwind CSS, lightweight-charts (TradingView), Recharts, Lucide React

**Infrastructure**: MongoDB Atlas, Angel One SmartAPI, Groq (Llama 3.3 70B)
