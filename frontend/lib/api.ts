import type {
  RegimeData, MarketIndices, StockSignal, StockData,
  PortfolioResult, BacktestResult, StressTestResult, ForecastData,
} from "./types";

export interface OrderResult {
  order_id: string;
  status: string;
  message: string;
  symbol: string;
  display_symbol: string;
  qty: number;
  transaction_type: string;
  order_type: string;
  executed_price: number;
  total_value: number;
  exchange: string;
  timestamp: string;
  mock: boolean;
}

export interface LiveHolding {
  symbol: string;
  display_symbol: string;
  qty: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
  total_value: number;
  isin: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export const api = {
  // Auth
  signup: (name: string, email: string, password: string) =>
    fetch(`${BASE}/api/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) }).then(r => r.json()),

  login: (email: string, password: string) =>
    fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).then(r => r.json()),

  verifyOtp: (email: string, otp: string) =>
    fetch(`${BASE}/api/auth/verify-otp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp }) }).then(r => r.json()),

  saveOnboarding: (email: string, capital: number, goal: string, risk: string, horizon: string, sectors: string) =>
    fetch(`${BASE}/api/auth/onboarding`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, capital, goal, risk, horizon, sectors }) }).then(r => r.json()),

  getUserProfile: (email: string) =>
    fetch(`${BASE}/api/auth/user/profile?email=${encodeURIComponent(email)}`).then(r => r.json()),

  updateProfiling: (email: string, profiling: Record<string, unknown>) =>
    fetch(`${BASE}/api/auth/user/profiling`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, ...profiling }) }).then(r => r.json()),

  getLiveHoldings: () =>
    get<{ holdings: LiveHolding[]; total_value: number; count: number; error?: string }>("/api/portfolio/holdings"),

  placeOrder: (order: {
    symbol: string; display_symbol: string; qty: number; price: number;
    transaction_type: "BUY" | "SELL"; order_type?: string; product_type?: string;
  }) => post<OrderResult>("/api/portfolio/order", order),

  getHoldingsAnalysis: (holdings: unknown[]) =>
    fetch(`${BASE}/api/portfolio/holdings-analysis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holdings }) }).then(r => r.json()),

  importCSV: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/api/portfolio/import-csv`, { method: "POST", body: fd }).then(r => r.json());
  },

  getRegime: () => get<RegimeData>("/api/regime"),

  getIndices: () => get<MarketIndices>("/api/market/indices"),

  getStockData: (symbol: string, period = "1y", interval = "1d") =>
    get<StockData>(`/api/market/stock?symbol=${encodeURIComponent(symbol)}&period=${period}&interval=${interval}`),

  getMarketCaps: () => get<Record<string, number>>("/api/market/caps"),

  getSignals: (symbol: string) =>
    get<StockSignal>(`/api/signals?symbol=${encodeURIComponent(symbol)}`),

  getSignalsCQR: (symbol: string) =>
    get<StockSignal>(`/api/signals?symbol=${encodeURIComponent(symbol)}&cqr=true`),

  getForecast: (symbol: string, horizon = 30, simulations = 500) =>
    get<ForecastData>(`/api/forecast?symbol=${encodeURIComponent(symbol)}&horizon=${horizon}&simulations=${simulations}`),

  getTopSignals: (n = 10) => get<StockSignal[]>(`/api/signals/top?n=${n}`),

  createPortfolio: (brief: string) =>
    post<PortfolioResult>("/api/portfolio/create", { brief }),

  runBacktest: (symbol: string, strategy: string, start: string, end: string, capital: number) =>
    post<BacktestResult>("/api/backtest", { symbol, strategy, start, end, capital }),

  runStressTest: (portfolio: Record<string, number>, scenario: string, custom_drop?: number) =>
    post<StressTestResult>("/api/stress-test", { portfolio, scenario, custom_drop }),
};
