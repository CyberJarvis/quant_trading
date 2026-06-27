export type Regime = "BULL" | "BEAR" | "SIDEWAYS";
export type Signal = "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL";
export type Risk = "LOW" | "MODERATE" | "HIGH";

export interface RegimeData {
  regime: Regime;
  score: number;
  vix: number;
  nifty: number;
  sma50: number;
  sma200: number;
  nifty_vs_sma200: number;
  description: string;
  strategy_hint: string;
}

export interface IndexQuote {
  value: number | null;
  change: number | null;
  change_pct: number | null;
}

export interface MarketIndices {
  nifty50: IndexQuote;
  sensex: IndexQuote;
  banknifty: IndexQuote;
  vix: { value: number | null; sentiment: string | null };
  fii_net: number | null;
  fii_net_available: boolean;
}

export interface PredictionInterval {
  lower_pct: number;
  pred_realist: number;
  upper_pct: number;
  width: number;
  confidence: number;
  abstain: boolean;
}

export interface StockSignal {
  symbol: string;
  composite_score: number;
  verdict: Signal;
  // RSI
  rsi: number;
  rsi_signal: string;
  // MACD — raw values
  macd_line: number;
  macd_signal_line: number;
  macd_histogram: number;
  macd_signal: string;
  // Trend / SMA
  sma50: number;
  sma200: number;
  trend_signal: string;
  // Bollinger Bands — raw values
  bb_upper: number;
  bb_lower: number;
  bb_middle: number;
  bb_signal: string;
  // Price
  current_price: number;
  signals: Record<string, string>;
  // CQR — present only when fetched with cqr=true
  prediction_interval?: PredictionInterval | null;
}

export interface ForecastBands {
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
}

export interface ForecastData {
  symbol: string;
  current_price: number;
  horizon_days: number;
  simulations: number;
  bands: ForecastBands;
  label: string;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number; // Unix seconds — present for intraday candles
}

export interface StockData {
  symbol: string;
  period: string;
  candles: Candle[];
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  live_price?: number | null;
  live_change?: number | null;
  live_change_pct?: number | null;
}

export interface PortfolioAllocation {
  symbol: string;
  weight: number;
  amount_inr: number;
  sector: string;
  signal: Signal;
  score: number;
}

export interface PortfolioReceipt {
  budget_inr: number;
  horizon_months: number;
  risk_level: Risk;
  current_regime: Regime;
  strategy_applied: string;
}

export interface PortfolioMetrics {
  expected_return: number | null;
  sharpe_estimate: number | null;
  num_stocks: number;
  total_weight: number;
  metrics_note: string;
}

export interface PortfolioResult {
  receipt: PortfolioReceipt;
  allocation: PortfolioAllocation[];
  metrics: PortfolioMetrics;
}

export interface EquityPoint {
  date: string;
  strategy: number;
  market: number;
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
}

export interface BacktestResult {
  total_return: number;
  annual_return: number;
  market_return: number;
  alpha: number;
  sharpe: number;
  sortino: number;
  max_drawdown: number;
  var_95: number;
  win_rate: number;
  total_trades: number;
  final_value: number;
  equity_curve: EquityPoint[];
  drawdown_curve: DrawdownPoint[];
}

export interface StockImpact {
  symbol: string;
  impact: number;
}

export interface StressTestResult {
  scenario: string;
  nifty_drop: number;
  portfolio_before: number;
  portfolio_after: number;
  portfolio_loss_pct: number;
  stock_impacts: StockImpact[];
  worst_stock: string;
  best_stock: string;
}

export interface ComparisonRow {
  metric: string;
  pravah_bl: number | null;
  markowitz: number | null;
  hrp: number | null;
}

export interface RiskMetrics {
  annualised_return: number;
  annualised_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  var_95: number;
  cvar_95: number;
  max_drawdown: number;
  calmar_ratio: number;
  n_days: number;
}

export interface OptimizerResult {
  method: string;
  weights: Record<string, number>;
  expected_return: number;
  expected_volatility: number;
  sharpe_ratio: number;
  risk_metrics?: RiskMetrics;
  error?: string;
}

export interface OptimizerComparison {
  symbols: string[];
  optimizers: {
    pravah_bl: OptimizerResult;
    markowitz: OptimizerResult;
    hrp: OptimizerResult;
  };
  comparison_table: ComparisonRow[];
  winner: string;
}

export interface SentimentScore {
  score: number;
  label: string;
  headlines: string[];
}

export interface RiskBrief {
  brief: string;
  risk_flags: string[];
  opportunities: string[];
  generated_at: string;
  model: string;
  sentiment?: { scores: Record<string, SentimentScore> };
}
