import type {
  RegimeData, MarketIndices, StockSignal, StockData,
  PortfolioResult, BacktestResult, StressTestResult,
} from "./types";

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
  getRegime: () => get<RegimeData>("/api/regime"),

  getIndices: () => get<MarketIndices>("/api/market/indices"),

  getStockData: (symbol: string, period = "1y") =>
    get<StockData>(`/api/market/stock?symbol=${encodeURIComponent(symbol)}&period=${period}`),

  getMarketCaps: () => get<Record<string, number>>("/api/market/caps"),

  getSignals: (symbol: string) =>
    get<StockSignal>(`/api/signals?symbol=${encodeURIComponent(symbol)}`),

  getTopSignals: (n = 10) => get<StockSignal[]>(`/api/signals/top?n=${n}`),

  createPortfolio: (brief: string) =>
    post<PortfolioResult>("/api/portfolio/create", { brief }),

  runBacktest: (symbol: string, strategy: string, start: string, end: string, capital: number) =>
    post<BacktestResult>("/api/backtest", { symbol, strategy, start, end, capital }),

  runStressTest: (portfolio: Record<string, number>, scenario: string, custom_drop?: number) =>
    post<StressTestResult>("/api/stress-test", { portfolio, scenario, custom_drop }),
};
