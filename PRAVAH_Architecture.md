# PRAVAH — Technical Architecture Reference
### Predictive Regime-Adaptive Valuation & Allocation Hub

---

## System Overview

Full-stack Indian equity quant trading platform.  
**Backend**: Python + FastAPI | **Frontend**: Next.js (TypeScript) | **DB**: MongoDB  
**Broker**: Angel One SmartAPI | **Market Data**: yfinance fallback  
**LLM**: Groq (`llama-3.3-70b-versatile`) + FinLlama subprocess fallback

```
Frontend (Next.js / TSX)              Backend (FastAPI / Python)
┌──────────────────────────┐          ┌─────────────────────────────────────────┐
│  /dashboard              │          │  main.py                                 │
│  /portfolio              │──HTTP───▶│  ├── angel_client.py  (Angel One API)    │
│  /research               │          │  ├── data_cache.py    (Mongo + mem)      │
│  /backtest               │          │  ├── signal_engine.py (TA + CQR)         │
│  /stress-test            │          │  ├── regime_detector.py                  │
│  /profile                │          │  ├── black_litterman.py                  │
│  /login /signup          │          │  ├── markowitz.py                        │
│  /onboarding             │          │  ├── hrp.py                              │
│                          │          │  ├── backtest_engine.py                  │
│  lib/api.ts              │          │  ├── stress_test.py                      │
│  (fetch wrappers)        │          │  ├── groq_client.py   (LLM)              │
└──────────────────────────┘          │  ├── risk_metrics.py                     │
                                      │  └── routers/ (9 routers)                │
                                      └──────────────┬──────────────────────────┘
                                                     │
                                       ┌─────────────▼───────────────┐
                                       │  MongoDB "pravah" database    │
                                       │  collections:                 │
                                       │   users, portfolios,          │
                                       │   candles, signals, cache,    │
                                       │   imported_holdings           │
                                       └─────────────────────────────┘
```

---

## Backend Modules

### `main.py` — Entry Point

FastAPI app titled "PRAVAH API".

**Startup lifespan** (runs before first request):
1. `angel_client.login()` — TOTP-based JWT auth with Angel One
2. `_warm_cache()` in thread pool executor (non-blocking) — prefetches Nifty50 candles + computes signals for all 379 tickers in background daemon thread

**CORS**: allows `http://localhost:3000` and `http://127.0.0.1:3000`

**Global exception handler**: catches all unhandled exceptions, returns JSON `{error, type}` with correct CORS headers on 500.

9 routers mounted at `/api`:
```
/api/auth        /api/regime      /api/market
/api/signals     /api/portfolio   /api/backtest
/api/stress-test /api/optimize    /api/news
```

---

### `db.py` — MongoDB Connection

Connects to MongoDB at `MONGODB_URI` env var. On success sets `MONGO_AVAILABLE = True` and initializes 6 collections:

| Collection | Purpose |
|---|---|
| `users` | Auth + onboarding + behavioral profiling |
| `portfolios` | Saved portfolios |
| `imported_holdings` | CSV-imported holding data |
| `cache` | Generic TTL cache (regime, market caps, FII) |
| `candles` | OHLCV candle cache (6h TTL) |
| `signals` | Technical signal cache (1h TTL) |

TTL indexes on `expires_at` field → MongoDB auto-deletes expired documents.

If `MONGODB_URI` absent or connection fails → `MONGO_AVAILABLE = False`, all ops fall back to in-memory dicts.

---

### `angel_client.py` — Angel One SmartAPI Client

Singleton auth + market data wrapper.

**Auth flow**:
- `login()`: generates TOTP via `pyotp`, POSTs to Angel One `/loginByPassword`, caches JWT (1h expiry)
- `get_token()`: returns cached JWT, re-calls `login()` if within 60s of expiry
- Public IP fetched via `api.ipify.org` — required by Angel One headers

**Instrument master**:
- Downloads `OpenAPIScripMaster.json` from Angel One margin calculator (24h disk cache)
- Builds `_instrument_cache`: `"RELIANCE-EQ" → {token, exchange}`
- Static `_INDEX_TOKENS` for Nifty50 / BankNifty / VIX / Sensex (permanent system tokens)
- `_resolve_token(symbol)`: index map first → then master lookup

**Data functions**:

`get_candles(symbol, interval, days_back)`:
```
1. Check MongoDB cache → return if hit
2. If days_back > 30: try yfinance first (Angel free tier truncates history)
3. Sanity check: if Angel returns < 30% of expected trading days → force yfinance
4. Store result to MongoDB cache
```

`get_holdings()` / `get_positions()` — live portfolio from Angel One REST API

`_yfinance_fallback()` — `auto_adjust=False` (raw prices matching NSE/BSE display)

---

### `data_cache.py` — Tiered Cache

Two tiers: **MongoDB (persistent across restarts)** → **in-memory dict (5min hot layer)**

| Data | TTL |
|---|---|
| Candles | 6h MongoDB, 5min in-memory |
| Signals | 1h |
| Market caps | 24h |
| Sectors | 24h |
| FII net flow | 1h (15min on failure) |
| Regime | 15min |

`prefetch_candles(tickers)`:
- Batch-downloads via `yf.download(tickers, group_by="ticker")` for uncached tickers
- Falls back to individual downloads for batch failures (0.3s sleep between requests)
- Stores each result to MongoDB

`get_market_caps()` — yfinance batch download for Nifty50 market caps; fallback to individual  
`get_sectors()` — yfinance `.info["sector"]` per Nifty50 ticker  
`get_fii_net()` — NSE India `fiidiiTradeReact` API with session spoofing (User-Agent + Referer cookie)  
`compute_portfolio_metrics()` — weighted daily returns → annualized return + Sharpe estimate

---

### `signal_engine.py` — Technical Analysis + CQR

**Universe**: 379 Indian stocks (`ALL_TICKERS`), 48 Nifty50 subset (`NIFTY50_TICKERS`).

#### Technical Signal Computation (`_compute_signals_inner`)

Requires ≥ 50 candles. Computes on close/high/low series:

```
RSI(14)     = 100 - 100/(1 + avg_gain/avg_loss)
MACD        = EMA(12) - EMA(26)
MACD_SIG    = EMA(9) of MACD
SMA_50      = rolling mean 50
SMA_200     = rolling mean 200
BB_UPPER    = SMA(20) + 2σ(20)
BB_LOWER    = SMA(20) - 2σ(20)
```

**Composite Score** (raw -7 to +7, normalized to -10..+10 via `score/7 * 10`):

| Indicator | Signal | Score |
|---|---|---|
| RSI | < 30 oversold | +2 |
| RSI | 30-40 leaning oversold | +1 |
| RSI | 60-70 leaning overbought | -1 |
| RSI | > 70 overbought | -2 |
| RSI | 40-60 | 0 (NEUTRAL) |
| MACD | fresh crossover above zero line | +2 BULLISH CROSSOVER |
| MACD | crossover, both lines negative | +1 RECOVERING |
| MACD | above signal + above zero | +1 BULLISH |
| MACD | fresh bearish crossover | -2 BEARISH CROSSOVER |
| MACD | above zero but below signal | -1 WEAKENING |
| MACD | below zero + below signal | -1 BEARISH |
| Trend | SMA50 > SMA200 | +2 GOLDEN CROSS |
| Trend | SMA50 < SMA200 | -2 DEATH CROSS |
| Bollinger | price below lower band | +1 OVERSOLD |
| Bollinger | price above upper band | -1 OVERBOUGHT |

**Verdict thresholds**:
```
normalized > 5  → STRONG BUY
normalized > 2  → BUY
normalized > -2 → HOLD
normalized > -5 → SELL
else            → STRONG SELL
```

**Cache flow** (`compute_signals`):
```
MongoDB signal cache hit (1h TTL)? → return
Miss → _compute_signals_raw() → store to MongoDB → return
```

**Background warm** (`_compute_all_signals_bg`):
- `prefetch_candles(ALL_TICKERS, 365)`
- Compute signals for all 379, store each
- Sort by composite score descending
- Store full ranked list to `top_signals_v1` cache (1h TTL)

**Cold start strategy** (`get_top_signals`):
1. Full cached list exists → return slice
2. ≥ 10 individual signal cache hits → sort and return
3. Cold start: compute Nifty50 synchronously (~20s), store with 10min TTL, kick off full 379 in daemon thread

---

#### CQR — Conformalized Quantile Regression (`compute_cqr_signals`)

Predicts **5-day log return** with **90% guaranteed prediction interval**.

Requires ≥ 250 candles. Uses LightGBM; returns `{"prediction_interval": None}` if unavailable.

**Features** (engineered from close prices):
```
ret_lag1, ret_lag2, ret_lag3, ret_lag5   — lagged log returns
vol_5d, vol_10d, vol_20d                 — rolling log return std dev
rsi                                      — RSI(14)
macd_hist                                — MACD histogram / close (normalized)
target = log(close.shift(-5) / close)    — 5-day forward log return
```

**Training**:
```
Train/Cal split: 80% train, 20% calibration
LightGBM quantile regressors:
  lo  (α=0.05) — lower bound
  mid (α=0.50) — median forecast
  hi  (α=0.95) — upper bound
params: n_estimators=200, learning_rate=0.05, num_leaves=31
```

**Conformalization** (the "C" in CQR):
```python
E_i = max(q_lo(x_i) - y_i,  y_i - q_hi(x_i))
q_hat = quantile(E, (1 - 0.10) × (1 + 1/n_cal))
```
This `q_hat` is the conformalization correction — expands the interval to achieve exact 90% marginal coverage.

**Inference on latest candle**:
```python
lower = q_lo(x_new) - q_hat
pred  = q_mid(x_new)
upper = q_hi(x_new) + q_hat
```

**Output**:
```json
{
  "pred_realist": <Q50 in %>,
  "prediction_interval": {
    "lower_pct": ...,
    "pred_realist": ...,
    "upper_pct": ...,
    "width": ...,
    "confidence": 0.90,
    "abstain": <true if width > 10%>,
    "model_source": "cached" | "trained"
  }
}
```

**Disk caching**: models joblib-saved keyed by `md5(symbol + n_candles + date)` under `/tmp/pravah_cqr/`. Retrained at most once per stock per calendar day.

---

### `regime_detector.py` — Market Regime Detection

Fetches 400 days Nifty50 + 30 days India VIX. Cached 15min.

**Scoring**:
```
+2  current > SMA200
+1  current > SMA50
+2  SMA50 > SMA200 (golden cross)
+1  20d return > 3%
-2  20d return < -3%
+2  VIX < 15
-2  VIX > 20
-3  VIX > 25
```

**Classification**:
```
score ≥ 4  → BULL     "Aggressive — buy momentum stocks"
score 1-3  → SIDEWAYS "Neutral — use RSI mean reversion"
score ≤ 0  → BEAR     "Defensive — reduce exposure"
```

Returns: `{regime, score, vix, nifty, sma50, sma200, nifty_vs_sma200, description, strategy_hint}`

---

### `black_litterman.py` — PRAVAH Primary Optimizer

Black-Litterman with CQR uncertainty injected into the view confidence matrix (Ω).

**Key insight**: CQR `width` (the interval width) directly controls how much B-L trusts the view for each stock:
- Wide interval (model uncertain) → large Ω → B-L ignores view → weights stay near market cap
- Narrow interval (model confident) → small Ω → B-L tilts aggressively toward view

**Algorithm**:

```
Step 1: Equilibrium returns (the prior)
  Π = λ × Σ × w_market
  where w_market = market cap weights, λ = 2.5 (risk aversion)

Step 2: View vector Q (from CQR Q50 median, annualized)
  Q_i = pred_realist_i / 100 × (252/5)

Step 3: View matrix P = identity (one absolute view per stock)

Step 4: Uncertainty matrix Ω (diagonal, from CQR width)
  Ω_ii = (CQR_width_i / 100 × √(252/5))²
  floor = 0.0001 (prevents division-by-zero)

Step 5: B-L posterior expected returns
  E[R] = [(τΣ)⁻¹ + P'Ω⁻¹P]⁻¹ × [(τΣ)⁻¹Π + P'Ω⁻¹Q]
  τ = 0.05 (uncertainty in prior)
  Posterior covariance = Σ + left_bracket

Step 6: Maximize posterior Sharpe (SLSQP)
  risk-free rate = 6.5% (RBI repo)
  bounds: [0%, 40%] per stock (long-only, max 40% concentration)
  max_iter = 2000, ftol = 1e-12
  fallback to equal-weight if optimizer diverges
```

**Covariance**: annualized (`× 252`), ridge regularized (`+ 1e-6 × I`)

**Market caps**: live from yfinance, fallback to hardcoded approximations (INR) for 20 major stocks

**Output**: `{method, weights, expected_return, expected_volatility, sharpe_ratio, tau, view_vs_prior, optimiser_converged, cov_condition}`

---

### `markowitz.py` — MVO Baseline

Classic Markowitz Mean-Variance Optimization. No ML, no views.

```
expected_returns = historical_mean × 252
cov_matrix       = historical_cov × 252 + 1e-6 × I
maximize Sharpe via SLSQP, bounds [0, 0.40]
```

Edge case: if all expected returns ≤ risk-free rate → equal-weight fallback (avoids degenerate optimization in bear markets).

---

### `hrp.py` — Hierarchical Risk Parity

Uses PyPortfolioOpt `HRPOpt` (Lopez de Prado 2016). No return forecasts needed — purely correlation/covariance driven.

```
1. Build correlation matrix from daily returns
2. Hierarchical clustering (Ward linkage)
3. Quasi-diagonalization of covariance matrix
4. Recursive bisection with inverse-variance weighting
```

Note in output: "Return estimate uses historical mean — HRP is return-agnostic by design"

---

### `optimizer_comparison.py` — Side-by-Side Comparison

`run_comparison(symbols, days_back)`:
1. `prefetch_candles` for all symbols
2. Build aligned returns matrix
3. Run CQR on each symbol (for B-L views)
4. Run all 3 optimizers: `black_litterman_optimize`, `markowitz_optimize`, `hrp_optimize`
5. Compute `risk_metrics` for each optimizer's weights via `portfolio_daily_returns`
6. Determine winner by Sharpe ratio
7. Return comparison table

---

### `risk_metrics.py` — Portfolio Risk Statistics

`compute_risk_metrics(daily_returns)`:

```
annualised_return     = mean × 252
annualised_volatility = std × √252
sharpe_ratio          = (ann_return - rf) / ann_vol
sortino_ratio         = (ann_return - rf) / downside_vol
  where downside_vol  = √(mean(r²) for r < 0) × √252
var_95                = percentile(r, 5)            ← 5th percentile daily loss
cvar_95               = mean(r where r ≤ var)       ← expected tail loss
max_drawdown          = min(cumulative / running_max - 1)
calmar_ratio          = ann_return / |max_drawdown|
```

`portfolio_daily_returns(weights, candles_by_symbol)`:
- Builds weighted return series from candle dicts
- Aligns all symbols to shortest available history

---

### `backtest_engine.py` — Strategy Backtester

`BacktestEngine(symbol, start, end, capital)`:
- Fetches 900 days candles (covers all date range + enough lookback for SMA200)
- Precomputes all indicators: SMA50/200, RSI(14), MACD, BB(20)
- Filters to `[start, end]` window

5 strategies via `run(strategy)`:

| Strategy | Entry | Exit |
|---|---|---|
| `ma_crossover` | SMA50 > SMA200 | SMA50 < SMA200 |
| `rsi` | RSI < 30 | RSI > 70 |
| `macd` | MACD > signal line | MACD < signal line |
| `bollinger` | price < BB_LOWER | price > BB_UPPER |
| `composite` | combined score ≥ 2 | combined score ≤ -2 |

Position logic: signal → `ffill` (hold last position) → `shift(1)` (execute next day open)

**Output metrics**:
```
total_return, annual_return, market_return (buy-hold benchmark)
alpha = (strategy_equity - market_equity) / capital × 100
sharpe, sortino, max_drawdown
var_95 (5th percentile daily return)
win_rate, total_trades
final_value
equity_curve: [{date, strategy, market}]
drawdown_curve: [{date, drawdown%}]
```

---

### `stress_test.py` — Historical Stress Testing

5 predefined scenarios with real OHLCV data:

| Scenario | Period |
|---|---|
| COVID Crash 2020 | 2020-01-15 → 2020-03-24 |
| Bear Market 2022 | 2022-01-01 → 2022-06-17 |
| Demonetisation 2016 | 2016-11-08 → 2016-12-26 |
| Adani Crisis 2023 | 2023-01-24 → 2023-02-22 |
| IL&FS Crisis 2018 | 2018-09-21 → 2018-10-26 |

`run_stress_test(portfolio, scenario)`:
- Fetches 2000 days candles per ticker
- Computes `(p_end - p_start) / p_start × 100` for each stock in the scenario window
- `portfolio_after = Σ weight_i × (1 + drop_i/100)`
- Reports: `portfolio_loss_pct`, `stock_impacts`, `worst_stock`, `best_stock`

**Custom mode**: uses `yfinance beta` per stock, applies `custom_drop × beta` per holding.

---

### `groq_client.py` — LLM Intelligence Layer

**Primary**: Groq API, `llama-3.3-70b-versatile`, temperature 0.2  
**Fallback 1**: FinLlama via llama.cpp subprocess (offline GGUF, paths via env vars)  
**Fallback 2**: stub string "LLM unavailable..."

**`score_sentiment(symbols)`**:
1. Fetches RSS from 3 feeds (Economic Times, MoneyControl, NDTV Profit)
2. Filters to headlines mentioning any stock's bare name (without `.NS`)
3. Sends ≤ 30 headlines to LLM with structured JSON prompt
4. Returns per-symbol: `{score: -1..+1, label: BULLISH|BEARISH|NEUTRAL, headlines: [...]}`

**`generate_risk_brief(portfolio, optimizer_result, sentiment, regime)`**:
- Formats top 8 holdings + optimizer winner + Sharpe + drawdown + sentiment alerts
- Prompts LLM for structured JSON: `{brief, risk_flags: [], opportunities: []}`
- Falls back to raw text if JSON parsing fails

---

### `routers/auth.py` — Authentication

Flows:
```
signup   → generate 6-digit OTP → email via SMTP → store unverified user
verify-otp → mark verified in MongoDB
login    → password check → verify flag check → return profile
onboarding → save capital/goal/risk/horizon/sectors
```

**Demo mode** (no MongoDB): `otp_fallback = "123456"`, all auth succeeds with hardcoded `DEMO_USER`.

**Behavioral profiling** (`/auth/user/profiling`): saves `past_experience`, `investment_style`, `loss_behavior`, `financial_knowledge`, `tax_slab`.

Security note: passwords stored as plaintext (hackathon tradeoff). No JWT on frontend — session via email stored in client state.

---

## Frontend Architecture

### Pages → Components

```
/dashboard
  ├── RegimeBadge         — BULL/BEAR/SIDEWAYS pill with score
  ├── VixGauge            — VIX level gauge chart
  ├── EquityCurve         — portfolio equity curve chart
  ├── SignalFeed          — live top signals ranked by composite score
  ├── NewsIntelligence    — RSS headlines with LLM sentiment scores
  └── MetricCard          — Sharpe / return / drawdown tiles

/portfolio
  ├── HoldingsTable       — live Angel One holdings (qty, avg, LTP, P&L)
  ├── AllocationPie       — portfolio weight pie chart
  ├── PerformanceChart    — portfolio vs benchmark
  ├── StockAdder          — manually add stocks to optimize
  ├── OrderModal          — BUY/SELL order placement via Angel One
  ├── BrokerImport        — CSV import for offline portfolios
  ├── ReceiptBox          — order confirmation display
  └── BriefChat           — AI risk brief (Groq-powered chatbot interface)

/research
  ├── CandlestickChart    — OHLCV candlestick
  ├── PriceChart          — close price + SMA50/200
  ├── RsiChart            — RSI(14) with 30/70 bands
  ├── MacdChart           — MACD + signal + histogram
  ├── ForecastChart       — Monte Carlo price simulation
  └── SignalsPanel        — TA composite + CQR prediction interval + VERIFY button

/backtest
  ├── BacktestForm        — symbol / strategy / dates / capital inputs
  ├── EquityCurveChart    — strategy vs buy-hold equity curves
  ├── DrawdownChart       — drawdown over time
  └── MetricsPanel        — Sharpe, Sortino, alpha, win rate, VaR tiles

/stress-test
  ├── ScenarioPicker      — select historical scenario or custom drop %
  └── ImpactChart         — per-stock impact bar chart

/profile
  └── BehavioralProfiling — risk tolerance quiz (experience / style / loss behavior)
```

### `lib/api.ts`

Typed fetch wrappers (`get<T>`, `post<T>`). Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

Exposes single `api` object with all endpoints:

```typescript
api.getRegime()                         // GET /api/regime
api.getIndices()                        // GET /api/market/indices
api.getStockData(symbol, period, interval)
api.getSignals(symbol)                  // TA signals
api.getSignalsCQR(symbol)              // TA + CQR prediction interval
api.getTopSignals(n)
api.getForecast(symbol, horizon, sims)  // Monte Carlo
api.runBacktest(symbol, strategy, start, end, capital)
api.runStressTest(portfolio, scenario, custom_drop?)
api.optimizePortfolio(symbols, days_back)  // B-L + MVO + HRP comparison
api.getPortfolioBrief(portfolio, regime)   // Groq risk brief
api.getLiveHoldings()                   // Angel One live portfolio
api.placeOrder(order)                   // Angel One order placement
api.importCSV(file)
api.signup / login / verifyOtp / saveOnboarding / getUserProfile / updateProfiling
api.getNews(limit)
api.getSymbolSentiment(symbols)
```

---

## Key Design Patterns

### 1. Tiered Cache (everywhere)
```
MongoDB (persistent) → in-memory (5min hot layer) → live fetch
```
Nothing blocks the request path if already cached. TTL indexes auto-expire Mongo docs.

### 2. Startup Warm (cold start prevention)
```
Startup → Nifty50 synchronous (~20s) → return to serve requests
          ↓ background thread
          379 stocks computed + stored → overwrites cache with full ranked list
```

### 3. CQR → B-L Coupling (core innovation)
CQR `width` → Ω diagonal → B-L view confidence.  
Uncertain predictions don't distort the portfolio — they dissolve toward the market prior.

### 4. Graceful Degradation Stack
```
Angel One unavailable → yfinance
MongoDB unavailable   → in-memory dict
Groq unavailable      → FinLlama subprocess
FinLlama unavailable  → stub text
No SMTP               → OTP printed to console (demo OTP "123456")
No MongoDB users      → hardcoded DEMO_USER returned for all auth
```

### 5. Signal Caching at Two Levels
- Per-symbol signal: 1h TTL in `signals` collection
- Full ranked list: `top_signals_v1` key in `cache` collection, 1h TTL (10min for Nifty50-only partial result)

---

## Environment Variables

```bash
# Angel One
ANGEL_API_KEY=
ANGEL_CLIENT_CODE=
ANGEL_PIN=
ANGEL_TOTP_SECRET=

# MongoDB
MONGODB_URI=

# Groq LLM
GROQ_API_KEY=

# FinLlama (offline fallback)
FINLLAMA_PATH=
FINLLAMA_MODEL=

# SMTP (OTP emails)
SMTP_USER=
SMTP_PASSWORD=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Data Schemas

### Candle (internal)
```json
{"date": "2024-01-15", "open": 1234.5, "high": 1250.0, "low": 1220.0, "close": 1245.0, "volume": 1234567}
```

### Signal (from `compute_signals`)
```json
{
  "symbol": "RELIANCE.NS",
  "composite_score": 7.1,
  "verdict": "BUY",
  "rsi": 42.3,
  "rsi_signal": "BUY",
  "macd_line": 12.4,
  "macd_signal_line": 10.2,
  "macd_histogram": 2.2,
  "macd_signal": "BULLISH",
  "sma50": 2890.0,
  "sma200": 2750.0,
  "trend_signal": "GOLDEN CROSS",
  "bb_upper": 3050.0,
  "bb_lower": 2730.0,
  "bb_middle": 2890.0,
  "bb_signal": "NEUTRAL",
  "current_price": 2945.0
}
```

### B-L Optimizer Output
```json
{
  "method": "PRAVAH Black-Litterman",
  "weights": {"RELIANCE.NS": 0.18, "TCS.NS": 0.14, ...},
  "expected_return": 0.142,
  "expected_volatility": 0.187,
  "sharpe_ratio": 0.41,
  "tau": 0.05,
  "view_vs_prior": {
    "RELIANCE.NS": {
      "prior_belief": 0.089,
      "your_view": 0.134,
      "uncertainty": 0.031,
      "posterior": 0.118,
      "final_weight": 0.18,
      "cqr_abstain": false,
      "cqr_width": 3.2,
      "pred_realist": 1.05
    }
  },
  "optimiser_converged": true,
  "cov_condition": 4821.3
}
```

---

## Stock Universe

**Nifty50** (48 tickers, `NIFTY50_TICKERS`): warmed on startup, B-L fallback caps  
**ALL_TICKERS** (379 stocks): 15 sectors including Banking, NBFC, Insurance, IT, Auto, Pharma, FMCG, Energy, Metals, Cement, Real Estate, Capital Goods, Chemicals, Telecom/Media, Logistics/Aviation, Conglomerate, New Age Tech

Sectors covered: Banking (PSU + Private + SFB), NBFC, Insurance, AMC, IT (large + mid + product), Auto (OEM + ancillary), Pharma (large + CDMO + diagnostics), FMCG, Consumer Discretionary, Energy (oil + gas + power + renewables), Metals & Mining, Cement, Real Estate, Capital Goods, Specialty Chemicals, Telecom/Media, Logistics, Conglomerates, New Age (Zomato, Paytm, Nykaa, etc.)
