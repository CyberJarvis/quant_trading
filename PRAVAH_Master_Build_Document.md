# P.R.A.V.A.H — Master Build Document
## Predictive Regime-Adaptive Valuation & Allocation Hub
### PS-3 · Ignite Room Hackathon · 24 Hours

---

## Quick Reference

```
Project Name:   P.R.A.V.A.H (QuantEdge AI)
Problem:        PS-3 — Quant Trading Intelligence Platform
Team Size:      4 people
Hardware:       MacBook M4 Pro + HP Victus RTX GPU
Duration:       24 Hours
Stack:          Next.js + FastAPI + Python ML + yfinance
```

---

## Team Split — Who Does What

| Person | Track | Hours | Machine |
|--------|-------|-------|---------|
| **You (Frontend)** | Next.js Dashboard | All 24h | M4 Pro |
| **ML Guy** | Regime + Signals + Backtest + Stress Test | 8h ML then integrate | M4 Pro |
| **Backend Guy** | FastAPI + Data Pipeline + WebSocket | All 24h | Either |
| **PM/Docs Guy** | Documentation + Pitch + Integration QA | All 24h | Either |

---

# TRACK 1 — FRONTEND (YOUR TRACK)
## Everything You Build in Claude Code

---

## Setup First (Hour 0 — 30 mins)

```bash
npx create-next-app@latest pravah --typescript --tailwind --app
cd pravah
npm install recharts axios socket.io-client lucide-react
npm install @radix-ui/react-tabs @radix-ui/react-select
npm install clsx tailwind-merge
```

---

## Folder Structure

```
apps/web/
├── app/
│   ├── page.tsx                 # Landing / home redirect
│   ├── dashboard/
│   │   └── page.tsx             # Main dashboard
│   ├── portfolio/
│   │   └── page.tsx             # Portfolio builder
│   ├── research/
│   │   └── page.tsx             # Charts + signals
│   ├── backtest/
│   │   └── page.tsx             # Backtest runner
│   └── layout.tsx               # Root layout + sidebar
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── MarketTicker.tsx
│   │
│   ├── dashboard/
│   │   ├── RegimeBadge.tsx      # BULL/BEAR/SIDEWAYS pill
│   │   ├── MetricCard.tsx       # Sharpe, Return, VaR cards
│   │   ├── EquityCurve.tsx      # Strategy vs benchmark
│   │   ├── SignalFeed.tsx       # Buy/Sell signal cards
│   │   └── VixGauge.tsx         # India VIX meter
│   │
│   ├── portfolio/
│   │   ├── BriefChat.tsx        # NL input interface
│   │   ├── ReceiptBox.tsx       # "What we understood"
│   │   ├── AllocationPie.tsx    # Portfolio pie chart
│   │   └── HoldingsTable.tsx    # Stock allocation table
│   │
│   ├── research/
│   │   ├── CandlestickChart.tsx # OHLCV chart
│   │   ├── IndicatorPanel.tsx   # RSI, MACD, BB display
│   │   └── SignalOverlay.tsx    # Buy/Sell markers on chart
│   │
│   ├── backtest/
│   │   ├── BacktestForm.tsx     # Config form
│   │   ├── EquityCurveChart.tsx # Returns chart
│   │   ├── DrawdownChart.tsx    # Drawdown visualization
│   │   └── MetricsPanel.tsx     # All performance numbers
│   │
│   └── stress/
│       ├── ScenarioPicker.tsx   # Select crash scenario
│       └── ImpactChart.tsx      # Before/after comparison
│
└── lib/
    ├── api.ts                   # All backend API calls
    ├── websocket.ts             # Live price connection
    └── types.ts                 # All TypeScript types
```

---

## Design System

```
Background:    #0A0E1A  (deep navy — Indian night market feel)
Surface:       #111827  (card backgrounds)
Border:        #1F2937  (subtle dividers)
Primary:       #F59E0B  (amber — Nifty gold)
Bull Green:    #10B981  (gains)
Bear Red:      #EF4444  (losses)
Sideways:      #6B7280  (neutral)
Text Primary:  #F9FAFB  (white)
Text Muted:    #9CA3AF  (grey)

Font:
  Display:  Inter 700/800 (numbers, headers)
  Body:     Inter 400/500 (labels, descriptions)
  Mono:     JetBrains Mono (prices, tickers)
```

---

## Screen 1 — Main Dashboard

### Layout
```
┌─────────────────────────────────────────────────────┐
│ TOP BAR: [NIFTY 24,156 +0.34%] [SENSEX] [VIX 14.2] │
│          [● MARKET OPEN]              [User Avatar]  │
├──────────┬──────────────────────────────────────────┤
│          │  REGIME BADGE: 🟢 BULL MARKET            │
│ SIDEBAR  │  "Market trending above SMA 200, VIX low" │
│          ├──────────────────────────────────────────┤
│ Dashboard│  [Sharpe 1.42] [Return 34.2%] [MDD -11%] │
│ Portfolio│                                           │
│ Research │  EQUITY CURVE CHART                       │
│ Backtest │  Strategy vs Nifty 50 (2yr)              │
│ Stress   │  [Recharts LineChart]                    │
│          ├────────────────────┬─────────────────────┤
│          │  TOP SIGNALS       │  INDIA VIX GAUGE    │
│          │  RELIANCE  BUY 78% │  [14.2 — LOW FEAR] │
│          │  TCS       BUY 71% │                     │
│          │  HDFC      HOLD    │  FII NET: +₹2,340Cr │
└──────────┴────────────────────┴─────────────────────┘
```

### Component: RegimeBadge.tsx
```tsx
// Shows BULL / BEAR / SIDEWAYS with color + description
// Data comes from GET /api/regime

interface RegimeData {
  regime: 'BULL' | 'BEAR' | 'SIDEWAYS'
  score: number
  vix: number
  nifty_vs_sma200: number
  description: string
  strategy_hint: string
}

const colors = {
  BULL:     'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  BEAR:     'bg-red-500/20 text-red-400 border-red-500/30',
  SIDEWAYS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
}
```

### Component: MetricCard.tsx
```tsx
// Reusable card for Sharpe, Return, VaR, Sortino etc
interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  description?: string
}
```

### Component: EquityCurve.tsx
```tsx
// Recharts LineChart
// Two lines: strategy_equity + market_equity
// X axis: dates
// Y axis: portfolio value in ₹
// Tooltip shows date + both values + alpha

import { LineChart, Line, XAxis, YAxis, 
         Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Data shape from backend:
// [{ date: "2024-01-15", strategy: 124500, market: 118200 }]
```

---

## Screen 2 — Portfolio Builder

### Layout
```
┌─────────────────────────────────────────────────────┐
│  CREATE YOUR PORTFOLIO                              │
├─────────────────────────┬───────────────────────────┤
│  BRIEF CHAT             │  RECEIPT BOX              │
│                         │  ┌─────────────────────┐  │
│  "I want to invest      │  │ We understood:      │  │
│   5 lakhs for 5 years   │  │ Budget: ₹5,00,000   │  │
│   moderate risk"        │  │ Horizon: 5 years    │  │
│                         │  │ Risk: Moderate      │  │
│  [Type your goal...]    │  │ Regime: BULL        │  │
│  [→ Optimize]           │  └─────────────────────┘  │
├─────────────────────────┴───────────────────────────┤
│  OPTIMIZED PORTFOLIO                                │
│  [Allocation Pie] [Holdings Table]                  │
│  Expected Return: 16.2%   Sharpe: 1.34             │
│  [Run Stress Test] [View Backtest]                  │
└─────────────────────────────────────────────────────┘
```

### Component: BriefChat.tsx
```tsx
// Simple text input — NOT a chat loop
// User types one investment goal
// Sends to POST /api/portfolio/create
// Returns structured extraction + portfolio

// NO LLM — backend parses using regex rules
// Rule-based parser (no AI wrapper)

const extractFromText = (text: string) => {
  // Backend handles this
  // Frontend just sends raw text
  // Shows loading state
  // Displays ReceiptBox when done
}
```

### Component: ReceiptBox.tsx
```tsx
// Shows EXACTLY what system understood
// Critical for judge demo — transparency
// "This is what we parsed from your words"

interface Receipt {
  budget_inr: number
  horizon_months: number
  risk_level: 'LOW' | 'MODERATE' | 'HIGH'
  current_regime: string
  strategy_applied: string
}
```

### Component: AllocationPie.tsx
```tsx
// Recharts PieChart
// Shows stock allocations from BL optimizer
// Color coded by sector
// Click slice → shows stock details

// Data from backend:
// [{ name: "RELIANCE", value: 15.2, sector: "Energy" }]
```

---

## Screen 3 — Research (Charts + Signals)

### Layout
```
┌─────────────────────────────────────────────────────┐
│  [Stock Selector: RELIANCE.NS ▼] [Period: 1Y ▼]    │
├────────────────────────────────────┬────────────────┤
│                                    │ SIGNALS PANEL  │
│  OHLCV CHART (Recharts)           │                │
│  Candlestick simulation           │ RSI:  42.3     │
│  (Recharts doesn't have candles   │ → BUY          │
│   use Area chart + bars)          │                │
│                                    │ MACD:          │
│  [Indicator toggles]              │ → BULLISH X    │
│  [✓ SMA50] [✓ SMA200] [✓ BB]     │                │
│                                    │ TREND:         │
├────────────────────────────────────┤ → GOLDEN CROSS │
│  RSI CHART  [Recharts LineChart]  │                │
│  [30 line] [70 line]              │ COMPOSITE:     │
├────────────────────────────────────┤ STRONG BUY     │
│  MACD CHART [Bar + Line]          │ Score: 7.2/10  │
└────────────────────────────────────┴────────────────┘
```

---

## Screen 4 — Backtester

### Layout
```
┌─────────────────────────────────────────────────────┐
│  BACKTEST CONFIGURATION                             │
│  Symbol: [^NSEI ▼]  Strategy: [Composite ▼]        │
│  Period: [2023-01-01] to [2025-06-27]              │
│  Capital: [₹1,00,000]  [▶ RUN BACKTEST]            │
├────────────────────────────────┬────────────────────┤
│  EQUITY CURVE                  │  PERFORMANCE       │
│  Strategy vs Nifty 50         │  Total Return 34%  │
│  [Recharts LineChart]         │  Alpha      +12%   │
│                                │  Sharpe     1.42   │
├────────────────────────────────┤  Sortino    1.87   │
│  DRAWDOWN CHART               │  Max DD    -11%    │
│  [Recharts AreaChart]         │  Win Rate   61%    │
│  Shows underwater periods     │  Trades       42   │
└────────────────────────────────┴────────────────────┘
```

---

## Screen 5 — Stress Test

### Layout
```
┌─────────────────────────────────────────────────────┐
│  STRESS TEST YOUR PORTFOLIO                         │
├─────────────────────────────────────────────────────┤
│  SELECT SCENARIO:                                   │
│  [COVID Crash 2020 -38%]                           │
│  [Bear Market 2022 -16%]                           │
│  [Demonetisation 2016 -9%]                         │
│  [Adani Crisis 2023 -7%]                           │
│  [Custom: Nifty drops [__]%]                       │
├──────────────────┬──────────────────────────────────┤
│  BEFORE          │  AFTER SHOCK                    │
│  Value: ₹5,48,500│  Value: ₹4,71,710              │
│  Return: +9.7%   │  Simulated Loss: -14.0%         │
│                  │  Worst Stock: HDFCBANK -18.2%   │
│  [Bar chart per stock showing impact]               │
└──────────────────┴──────────────────────────────────┘
```

---

## API Integration Layer (lib/api.ts)

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  
  // Regime
  getRegime: () => 
    fetch(`${BASE}/api/regime`).then(r => r.json()),
  
  // Market data
  getIndices: () => 
    fetch(`${BASE}/api/market/indices`).then(r => r.json()),
  
  getStockData: (symbol: string, period = '1y') =>
    fetch(`${BASE}/api/market/stock?symbol=${symbol}&period=${period}`)
      .then(r => r.json()),
  
  // Signals
  getSignals: (symbol: string) =>
    fetch(`${BASE}/api/signals?symbol=${symbol}`).then(r => r.json()),
  
  getTopSignals: () =>
    fetch(`${BASE}/api/signals/top`).then(r => r.json()),
  
  // Portfolio
  createPortfolio: (brief: string) =>
    fetch(`${BASE}/api/portfolio/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief })
    }).then(r => r.json()),
  
  // Backtest
  runBacktest: (symbol: string, strategy: string, 
                period: string, capital: number) =>
    fetch(`${BASE}/api/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, strategy, period, capital })
    }).then(r => r.json()),
  
  // Stress test
  runStressTest: (portfolio: any, scenario: string, custom_drop?: number) =>
    fetch(`${BASE}/api/stress-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portfolio, scenario, custom_drop })
    }).then(r => r.json()),
  
  // Market caps (for BL optimizer)
  getMarketCaps: () =>
    fetch(`${BASE}/api/market/caps`).then(r => r.json()),
}
```

---

## TypeScript Types (lib/types.ts)

```typescript
export type Regime = 'BULL' | 'BEAR' | 'SIDEWAYS'
export type Signal = 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL'
export type Risk   = 'LOW' | 'MODERATE' | 'HIGH'

export interface RegimeData {
  regime:          Regime
  score:           number
  vix:             number
  description:     string
  strategy_hint:   string
}

export interface StockSignal {
  symbol:          string
  composite_score: number
  verdict:         Signal
  rsi:             number
  rsi_signal:      string
  macd_signal:     string
  trend_signal:    string
  bb_signal:       string
}

export interface PortfolioAllocation {
  symbol:          string
  weight:          number
  amount_inr:      number
  sector:          string
  signal:          Signal
}

export interface BacktestResult {
  total_return:    number
  annual_return:   number
  market_return:   number
  alpha:           number
  sharpe:          number
  sortino:         number
  max_drawdown:    number
  var_95:          number
  win_rate:        number
  total_trades:    number
  equity_curve:    { date: string; strategy: number; market: number }[]
  drawdown_curve:  { date: string; drawdown: number }[]
}

export interface StressTestResult {
  scenario:        string
  portfolio_before: number
  portfolio_after:  number
  portfolio_loss:   number
  stock_impacts:   { symbol: string; impact: number }[]
}

export interface MarketIndices {
  nifty50:  { value: number; change: number; change_pct: number }
  sensex:   { value: number; change: number; change_pct: number }
  banknifty:{ value: number; change: number; change_pct: number }
  vix:      { value: number; sentiment: string }
  fii_net:  number
}
```

---

## Hour by Hour — Frontend Build Plan

```
HOUR 0.0-0.5:  Create Next.js app, install deps, folder structure
HOUR 0.5-1.5:  Layout: Sidebar + TopBar + MarketTicker component
HOUR 1.5-3.0:  Dashboard: RegimeBadge + MetricCards + EquityCurve
HOUR 3.0-4.5:  Dashboard: SignalFeed + VixGauge + connect to API
HOUR 4.5-6.0:  Portfolio: BriefChat + ReceiptBox + AllocationPie
HOUR 6.0-7.5:  Research: Stock selector + indicator charts
HOUR 7.5-9.0:  Backtest: Form + EquityCurve + DrawdownChart + Metrics
HOUR 9.0-10.5: Stress Test: ScenarioPicker + ImpactChart
HOUR 10.5-14:  Connect ALL screens to backend API endpoints
HOUR 14-18:    Full end-to-end testing + mock data fallbacks
HOUR 18-21:    UI polish + dark theme consistency + responsive
HOUR 21-23:    Demo flow rehearsal + fix blocking bugs
HOUR 23-24:    Freeze + pitch prep
```

---

## Claude Code Prompts To Use

### Prompt 1 — Initial Setup
```
Build a Next.js 14 TypeScript financial dashboard called PRAVAH with:
- Dark theme (#0A0E1A background, #F59E0B amber accent)
- Left sidebar navigation: Dashboard, Portfolio, Research, Backtest, Stress Test
- Top bar with market indices (Nifty 50, Sensex, VIX) as static placeholders
- Tailwind CSS throughout
- No authentication needed
Start with the layout shell only.
```

### Prompt 2 — Dashboard Page
```
Build the Dashboard page with:
1. RegimeBadge component showing BULL/BEAR/SIDEWAYS 
   (hardcode BULL for now, will connect to API)
2. Three MetricCards: Total Return 34.2%, Sharpe 1.42, Max Drawdown -11%
3. Recharts LineChart showing two lines: 
   "Strategy" and "Nifty 50" over 24 months
   (use mock data array of 24 points)
4. SignalFeed showing 5 stock cards with 
   BUY/SELL verdict and confidence percentage
Dark theme, amber accent color.
```

### Prompt 3 — Portfolio Builder
```
Build the Portfolio page with:
1. Left panel: Text input where user types investment goal
   Button "Optimize Portfolio" 
   POST to /api/portfolio/create with { brief: string }
2. Right panel: ReceiptBox showing:
   Budget, Horizon, Risk Level, Current Regime
   (show after API response)
3. Below: AllocationPie (Recharts PieChart) showing 
   stock allocations by percentage
4. HoldingsTable showing symbol, weight%, amount₹, signal
Add loading spinner during API call.
```

### Prompt 4 — Research Page
```
Build the Research page with:
1. Dropdown to select stock (RELIANCE.NS, TCS.NS, HDFCBANK.NS etc)
2. Recharts AreaChart for price history (GET /api/market/stock)
3. Recharts LineChart for RSI below main chart
   Add horizontal lines at 30 and 70
4. Signals panel on right showing:
   RSI value + BUY/SELL label
   MACD signal
   Trend (Golden Cross / Death Cross)
   Composite Score out of 10
   Final Verdict badge (STRONG BUY / BUY / HOLD / SELL)
```

### Prompt 5 — Backtest Page
```
Build the Backtest page with:
1. Config form: 
   Symbol dropdown (^NSEI, ^NSEBANK, RELIANCE.NS etc)
   Strategy dropdown (MA Crossover, RSI, MACD, Bollinger, Composite)
   Date range inputs (start, end)
   Initial Capital input (default 100000)
   "Run Backtest" button → POST /api/backtest
2. Results section (show after API response):
   Recharts LineChart: equity curve (strategy vs market)
   Recharts AreaChart: drawdown chart (negative values, red fill)
3. Metrics panel:
   Total Return, Annual Return, Alpha
   Sharpe, Sortino, Max Drawdown
   Win Rate, Total Trades, Final Value
```

### Prompt 6 — Stress Test Page
```
Build the Stress Test page with:
1. Scenario cards (clickable):
   COVID Crash 2020 (-38%)
   Bear Market 2022 (-16%)
   Demonetisation 2016 (-9%)
   Adani Crisis 2023 (-7%)
   Custom (slider for drop %)
2. Portfolio input: paste allocation or use last created
3. "Run Stress Test" button → POST /api/stress-test
4. Results: Before/After comparison cards
5. Recharts BarChart showing per-stock impact (negative bars, red)
```

---

# TRACK 2 — ML ENGINEER
## Complete ML Scope

---

## Install
```bash
pip install yfinance pandas-ta pypfopt numpy scipy 
pip install scikit-learn nsepython requests
pip install fastapi uvicorn  # for ML service
```

---

## File: regime_detector.py
```python
import yfinance as yf
import pandas as pd
import numpy as np
import pandas_ta as ta

def detect_regime():
    nifty = yf.download("^NSEI",     period="1y")['Close']
    vix   = yf.download("^INDIAVIX", period="1y")['Close']
    
    sma50    = nifty.rolling(50).mean().iloc[-1]
    sma200   = nifty.rolling(200).mean().iloc[-1]
    current  = nifty.iloc[-1]
    ret_20d  = nifty.pct_change(20).iloc[-1]
    vix_now  = vix.iloc[-1]
    
    score = 0
    if current > sma200:          score += 2
    if current > sma50:           score += 1
    if sma50 > sma200:            score += 2  # Golden cross
    if ret_20d > 0.03:            score += 1
    elif ret_20d < -0.03:         score -= 2
    if vix_now < 15:              score += 2
    elif vix_now > 20:            score -= 2
    elif vix_now > 25:            score -= 3
    
    if score >= 4:
        regime = "BULL"
        hint   = "Aggressive — buy momentum stocks"
    elif score <= 0:
        regime = "BEAR"
        hint   = "Defensive — reduce exposure"
    else:
        regime = "SIDEWAYS"
        hint   = "Neutral — use RSI mean reversion"
    
    return {
        "regime":      regime,
        "score":       score,
        "vix":         round(float(vix_now), 2),
        "nifty":       round(float(current), 2),
        "sma50":       round(float(sma50), 2),
        "sma200":      round(float(sma200), 2),
        "description": f"Nifty {'above' if current > sma200 else 'below'} SMA200, VIX at {vix_now:.1f}",
        "strategy_hint": hint
    }
```

## File: signal_engine.py
```python
import yfinance as yf
import pandas as pd
import pandas_ta as ta
import numpy as np

NIFTY50_TICKERS = [
    "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS",
    "ICICIBANK.NS","SBIN.NS","BHARTIARTL.NS","ITC.NS",
    "LT.NS","AXISBANK.NS","KOTAKBANK.NS","HINDUNILVR.NS",
    "BAJFINANCE.NS","MARUTI.NS","TITAN.NS","WIPRO.NS",
    "HCLTECH.NS","NESTLEIND.NS","ULTRACEMCO.NS","ASIANPAINT.NS"
]

def compute_signals(symbol: str) -> dict:
    df = yf.download(symbol, period="1y")
    if df.empty:
        return {}
    
    close  = df['Close']
    high   = df['High']
    low    = df['Low']
    volume = df['Volume']
    
    df['RSI']      = ta.rsi(close, 14)
    macd           = ta.macd(close)
    df['MACD']     = macd['MACD_12_26_9']
    df['MACD_SIG'] = macd['MACDs_12_26_9']
    df['SMA_50']   = ta.sma(close, 50)
    df['SMA_200']  = ta.sma(close, 200)
    bb             = ta.bbands(close)
    df['BB_UPPER'] = bb['BBU_5_2.0']
    df['BB_LOWER'] = bb['BBL_5_2.0']
    df['ADX']      = ta.adx(high, low, close)['ADX_14']
    df             = df.dropna()
    
    latest  = df.iloc[-1]
    prev    = df.iloc[-2]
    
    score = 0
    signals = {}
    
    # RSI
    rsi = float(latest['RSI'])
    if rsi < 30:   score += 2; signals['rsi'] = 'STRONG BUY'
    elif rsi < 45: score += 1; signals['rsi'] = 'BUY'
    elif rsi > 70: score -= 2; signals['rsi'] = 'STRONG SELL'
    elif rsi > 55: score -= 1; signals['rsi'] = 'SELL'
    else:                       signals['rsi'] = 'NEUTRAL'
    
    # MACD
    if latest['MACD'] > latest['MACD_SIG'] and prev['MACD'] < prev['MACD_SIG']:
        score += 2; signals['macd'] = 'BULLISH CROSSOVER'
    elif latest['MACD'] > latest['MACD_SIG']:
        score += 1; signals['macd'] = 'BULLISH'
    elif latest['MACD'] < latest['MACD_SIG'] and prev['MACD'] > prev['MACD_SIG']:
        score -= 2; signals['macd'] = 'BEARISH CROSSOVER'
    else:
        score -= 1; signals['macd'] = 'BEARISH'
    
    # Trend
    if latest['SMA_50'] > latest['SMA_200']:
        score += 2; signals['trend'] = 'GOLDEN CROSS'
    else:
        score -= 2; signals['trend'] = 'DEATH CROSS'
    
    # Bollinger
    cp = float(latest['Close'])
    if cp < float(latest['BB_LOWER']):
        score += 1; signals['bollinger'] = 'OVERSOLD'
    elif cp > float(latest['BB_UPPER']):
        score -= 1; signals['bollinger'] = 'OVERBOUGHT'
    else:
        signals['bollinger'] = 'NEUTRAL'
    
    # Verdict
    normalized = (score / 7) * 10
    if normalized > 5:    verdict = 'STRONG BUY'
    elif normalized > 2:  verdict = 'BUY'
    elif normalized > -2: verdict = 'HOLD'
    elif normalized > -5: verdict = 'SELL'
    else:                 verdict = 'STRONG SELL'
    
    return {
        "symbol":          symbol,
        "composite_score": round(normalized, 1),
        "verdict":         verdict,
        "rsi":             round(rsi, 1),
        "signals":         signals,
        "current_price":   round(cp, 2)
    }

def get_top_signals(n=10) -> list:
    results = []
    for ticker in NIFTY50_TICKERS:
        try:
            sig = compute_signals(ticker)
            if sig:
                results.append(sig)
        except:
            pass
    results.sort(key=lambda x: x['composite_score'], reverse=True)
    return results[:n]
```

## File: backtest_engine.py
```python
import yfinance as yf
import pandas as pd
import numpy as np
import pandas_ta as ta

class BacktestEngine:
    
    def __init__(self, symbol, start, end, capital=100000):
        self.symbol  = symbol
        self.capital = capital
        self.df      = yf.download(symbol, start=start, end=end)
        self._compute()
    
    def _compute(self):
        c = self.df['Close']
        h = self.df['High']
        l = self.df['Low']
        v = self.df['Volume']
        self.df['SMA_50']   = ta.sma(c, 50)
        self.df['SMA_200']  = ta.sma(c, 200)
        self.df['RSI']      = ta.rsi(c, 14)
        macd                = ta.macd(c)
        self.df['MACD']     = macd['MACD_12_26_9']
        self.df['MACD_SIG'] = macd['MACDs_12_26_9']
        bb                  = ta.bbands(c)
        self.df['BB_UPPER'] = bb['BBU_5_2.0']
        self.df['BB_LOWER'] = bb['BBL_5_2.0']
        self.df             = self.df.dropna()
    
    def run(self, strategy='composite'):
        df = self.df.copy()
        df['signal'] = 0
        
        if strategy == 'ma_crossover':
            df.loc[df['SMA_50'] > df['SMA_200'], 'signal'] = 1
            df.loc[df['SMA_50'] < df['SMA_200'], 'signal'] = -1
        elif strategy == 'rsi':
            df.loc[df['RSI'] < 30, 'signal'] = 1
            df.loc[df['RSI'] > 70, 'signal'] = -1
        elif strategy == 'macd':
            df.loc[df['MACD'] > df['MACD_SIG'], 'signal'] = 1
            df.loc[df['MACD'] < df['MACD_SIG'], 'signal'] = -1
        elif strategy == 'bollinger':
            df.loc[df['Close'] < df['BB_LOWER'], 'signal'] = 1
            df.loc[df['Close'] > df['BB_UPPER'], 'signal'] = -1
        elif strategy == 'composite':
            s = pd.Series(0, index=df.index)
            s += (df['SMA_50'] > df['SMA_200']).astype(int)
            s -= (df['SMA_50'] < df['SMA_200']).astype(int)
            s += (df['RSI'] < 30).astype(int) * 2
            s -= (df['RSI'] > 70).astype(int) * 2
            s += (df['MACD'] > df['MACD_SIG']).astype(int)
            s -= (df['MACD'] < df['MACD_SIG']).astype(int)
            df.loc[s >= 2,  'signal'] = 1
            df.loc[s <= -2, 'signal'] = -1
        
        df['position']         = df['signal'].replace(0, np.nan).ffill().fillna(0)
        df['market_ret']       = df['Close'].pct_change()
        df['strategy_ret']     = df['position'].shift(1) * df['market_ret']
        df['market_equity']    = self.capital * (1 + df['market_ret']).cumprod()
        df['strategy_equity']  = self.capital * (1 + df['strategy_ret']).cumprod()
        
        sr = df['strategy_ret'].dropna()
        rf = 0.065 / 252
        
        equity      = df['strategy_equity']
        roll_max    = equity.cummax()
        drawdown    = (equity - roll_max) / roll_max
        
        equity_curve = [
            {"date": str(d.date()), 
             "strategy": round(float(s)), 
             "market": round(float(m))}
            for d, s, m in zip(
                df.index,
                df['strategy_equity'],
                df['market_equity']
            )
        ]
        
        dd_curve = [
            {"date": str(d.date()), "drawdown": round(float(v)*100, 2)}
            for d, v in zip(df.index, drawdown)
        ]
        
        return {
            "total_return":   round((equity.iloc[-1]/self.capital - 1)*100, 2),
            "annual_return":  round(sr.mean()*252*100, 2),
            "market_return":  round((df['market_equity'].iloc[-1]/self.capital - 1)*100, 2),
            "alpha":          round((equity.iloc[-1] - df['market_equity'].iloc[-1])/self.capital*100, 2),
            "sharpe":         round((sr.mean()-rf)/sr.std()*np.sqrt(252), 2),
            "sortino":        round((sr.mean()-rf)/sr[sr<0].std()*np.sqrt(252), 2),
            "max_drawdown":   round(drawdown.min()*100, 2),
            "var_95":         round(np.percentile(sr, 5)*100, 2),
            "win_rate":       round((sr>0).sum()/(sr!=0).sum()*100, 2),
            "total_trades":   int((df['signal']!=df['signal'].shift(1)).sum()),
            "final_value":    round(float(equity.iloc[-1]), 2),
            "equity_curve":   equity_curve,
            "drawdown_curve": dd_curve
        }
```

## File: stress_test.py
```python
import yfinance as yf
import pandas as pd
import numpy as np

SCENARIOS = {
    "covid_2020":          ("2020-01-15", "2020-03-24"),
    "bear_2022":           ("2022-01-01", "2022-06-17"),
    "demonetisation_2016": ("2016-11-08", "2016-12-26"),
    "adani_2023":          ("2023-01-24", "2023-02-22"),
    "il_fs_2018":          ("2018-09-21", "2018-10-26"),
}

def run_stress_test(portfolio: dict, scenario: str, custom_drop: float = None):
    """
    portfolio = {"RELIANCE.NS": 0.15, "TCS.NS": 0.12, ...}
    scenario  = one of SCENARIOS keys or "custom"
    """
    tickers = list(portfolio.keys())
    
    if scenario == "custom" and custom_drop:
        # Apply uniform drop
        stock_impacts = {}
        for ticker in tickers:
            # Adjust by beta
            try:
                info = yf.Ticker(ticker).info
                beta = info.get('beta', 1.0) or 1.0
            except:
                beta = 1.0
            stock_impacts[ticker] = round(custom_drop * beta, 2)
        nifty_drop = custom_drop
        description = f"Custom Shock: Nifty -{abs(custom_drop)}%"
    
    else:
        # Use real historical crash data
        start, end = SCENARIOS[scenario]
        stock_impacts = {}
        
        # Get Nifty drop for this period
        nifty = yf.download("^NSEI", start=start, end=end)['Close']
        nifty_drop = round((nifty.iloc[-1] - nifty.iloc[0]) / nifty.iloc[0] * 100, 2)
        
        # Get each stock's real impact during this period
        for ticker in tickers:
            try:
                prices = yf.download(ticker, start=start, end=end)['Close']
                if len(prices) > 1:
                    impact = round((prices.iloc[-1] - prices.iloc[0]) / prices.iloc[0] * 100, 2)
                    stock_impacts[ticker] = impact
                else:
                    stock_impacts[ticker] = nifty_drop
            except:
                stock_impacts[ticker] = nifty_drop
        
        description = scenario.replace("_", " ").title()
    
    # Calculate portfolio impact
    portfolio_before = 100  # normalized to 100
    portfolio_after  = 0
    
    for ticker, weight in portfolio.items():
        stock_drop  = stock_impacts.get(ticker, nifty_drop) / 100
        contribution = weight * (1 + stock_drop)
        portfolio_after += contribution
    
    portfolio_loss = round((portfolio_after - portfolio_before), 2)
    
    return {
        "scenario":          description,
        "nifty_drop":        nifty_drop,
        "portfolio_before":  100,
        "portfolio_after":   round(portfolio_after * 100, 2),
        "portfolio_loss_pct": portfolio_loss,
        "stock_impacts":     [
            {"symbol": k, "impact": v} 
            for k, v in stock_impacts.items()
        ],
        "worst_stock": min(stock_impacts, key=stock_impacts.get),
        "best_stock":  max(stock_impacts, key=stock_impacts.get)
    }
```

---

## ML Hour by Hour Build Plan

```
HOUR 0.0-0.5:  pip install all deps, test yfinance download
HOUR 0.5-2.0:  regime_detector.py complete + tested
HOUR 2.0-3.5:  signal_engine.py complete + tested on 5 stocks
HOUR 3.5-5.5:  backtest_engine.py all 5 strategies working
HOUR 5.5-7.0:  stress_test.py all scenarios working
HOUR 7.0-8.0:  Wrap all in FastAPI endpoints
HOUR 8.0+:     Support backend integration + fix bugs
```

---

# TRACK 3 — BACKEND
## FastAPI Server

---

## File: main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PRAVAH API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import all routers
from routers import regime, market, signals, portfolio, backtest, stress

app.include_router(regime.router,    prefix="/api")
app.include_router(market.router,    prefix="/api")
app.include_router(signals.router,   prefix="/api")
app.include_router(portfolio.router, prefix="/api")
app.include_router(backtest.router,  prefix="/api")
app.include_router(stress.router,    prefix="/api")
```

## All API Endpoints

```python
# Regime
GET  /api/regime
# → { regime, score, vix, description, strategy_hint }

# Market
GET  /api/market/indices
# → { nifty50, sensex, banknifty, vix, fii_net }

GET  /api/market/stock?symbol=RELIANCE.NS&period=1y
# → { dates[], open[], high[], low[], close[], volume[] }

GET  /api/market/caps
# → { "RELIANCE.NS": 1950000000000, ... }

# Signals
GET  /api/signals?symbol=RELIANCE.NS
# → { symbol, composite_score, verdict, rsi, signals{} }

GET  /api/signals/top
# → [{ symbol, composite_score, verdict, rsi }] × 10

# Portfolio
POST /api/portfolio/create
# Body: { brief: "I want to invest 5 lakhs..." }
# → { receipt{}, allocation[], metrics{} }

# Backtest
POST /api/backtest
# Body: { symbol, strategy, start, end, capital }
# → { total_return, sharpe, equity_curve[], drawdown_curve[], ... }

# Stress Test
POST /api/stress-test
# Body: { portfolio{}, scenario, custom_drop? }
# → { scenario, portfolio_before, portfolio_after, stock_impacts[] }
```

---

# TRACK 4 — DOCUMENTATION
## PM/Docs Track

---

## Documents to Produce

```
1. README.md          → Setup instructions for judges
2. ARCHITECTURE.md    → System diagram + data flow
3. API_DOCS.md        → All endpoints with examples
4. PITCH_DECK.md      → 3 min pitch script
5. DEMO_SCRIPT.md     → Exact demo steps
```

## Demo Script (10 Minutes)

```
00:00 - 00:30  Open app. Show live Nifty ticker in topbar.
               "This is PRAVAH — Quant Intelligence for retail India."

00:30 - 01:00  Point at RegimeBadge: "The system detected we are 
               in a BULL market — Nifty above SMA 200, VIX at 14."

01:00 - 01:45  Navigate to Portfolio.
               Type: "I want to invest 5 lakhs for 5 years, moderate risk"
               Click Optimize.
               Point at ReceiptBox: "This is exactly what we understood."
               Show AllocationPie appearing.

01:45 - 02:30  Navigate to Research.
               Select RELIANCE.NS.
               Show candlestick chart + RSI below.
               Point at signals: "RSI 42 — not overbought.
               MACD bullish crossover confirmed.
               Composite: STRONG BUY with score 7.2/10"

02:30 - 03:30  Navigate to Backtest.
               Symbol: Nifty 50. Strategy: Composite. 2023-2025.
               Click Run Backtest.
               Show equity curve: "Our strategy returned 34.2%
               vs Nifty's 21.8% — alpha of 12.4%"
               Point at metrics: Sharpe 1.42, Sortino 1.87,
               Max Drawdown only -11%

03:30 - 04:15  Navigate to Stress Test.
               Select COVID Crash 2020.
               Click Run.
               "If COVID happened again, this portfolio
               loses only 21% vs Nifty's 38% drop.
               That's because our optimizer reduced 
               high-beta stock exposure."

04:15 - 04:30  "No AI wrapper. No GPT calls. 
               Pure quantitative mathematics.
               Goldman Sachs level tools for
               every retail investor in India."
```

---

# INTEGRATION CHECKLIST

```
Before demo — verify all these work end-to-end:

□ GET /api/regime → RegimeBadge shows correct color
□ GET /api/market/indices → TopBar shows real numbers
□ GET /api/signals/top → Dashboard SignalFeed populates
□ POST /api/portfolio/create → AllocationPie appears
□ GET /api/signals?symbol=X → Research signals populate
□ GET /api/market/stock?symbol=X → Chart renders
□ POST /api/backtest → EquityCurve + metrics appear
□ POST /api/stress-test → ImpactChart renders
□ All loading states show spinner
□ All error states show fallback message
□ Mobile responsive at 375px width
```

---

# RISK MITIGATIONS

| Risk | Fix |
|------|-----|
| yfinance rate limited | Cache all downloads at startup to dict |
| Markets closed Saturday | Mock +/- 0.1% random walk on cached prices |
| Backend API down | Frontend has mock JSON fallback for demo |
| Chart doesn't render | Pre-run backtest, save result as JSON |
| Regime detection fails | Hardcode BULL as default if VIX fails |
| Build breaks 1hr before demo | Freeze at Hour 21, no new features |

---

*PRAVAH — Predictive Regime-Adaptive Valuation & Allocation Hub*
*PS-3 · Ignite Room · 24 Hour Hackathon*
*Generated: June 27, 2026*
