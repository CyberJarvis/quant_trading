"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { StockData, StockSignal, Candle } from "@/lib/types";
import CandlestickChart from "@/components/research/CandlestickChart";
import RsiChart from "@/components/research/RsiChart";
import MacdChart, { type MacdPoint } from "@/components/research/MacdChart";
import SignalsPanel from "@/components/research/SignalsPanel";
import { ChevronDown } from "lucide-react";

const STOCKS = [
  "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
  "SBIN.NS","BHARTIARTL.NS","ITC.NS","LT.NS","AXISBANK.NS",
  "KOTAKBANK.NS","HINDUNILVR.NS","BAJFINANCE.NS","MARUTI.NS","TITAN.NS",
  "WIPRO.NS","HCLTECH.NS","NESTLEIND.NS","ULTRACEMCO.NS","ASIANPAINT.NS",
];

const PERIODS = [
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y",  label: "1Y" },
  { value: "2y",  label: "2Y" },
];

// ── Client-side indicator computation ─────────────────────────────────────────

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let val = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(val);
  for (let i = period; i < values.length; i++) {
    val = values[i] * k + val * (1 - k);
    result.push(val);
  }
  return result;
}

function computeRsi(candles: Candle[] | undefined | null): { date: string; rsi: number }[] {
  if (!candles) return [];
  const result: { date: string; rsi: any }[] = [];
  if (candles.length < 15) {
    return candles.map((c) => ({ date: c.date, rsi: null as any }));
  }
  const period = 14;

  // Pad the first 14 elements (0 to 13) with null values
  for (let i = 0; i < period; i++) {
    result.push({ date: candles[i].date, rsi: null as any });
  }

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;

  // First valid RSI is at index 14
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ date: candles[period].date, rsi: parseFloat((100 - 100 / (1 + rs0)).toFixed(2)) });

  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ date: candles[i].date, rsi: parseFloat((100 - 100 / (1 + rs)).toFixed(2)) });
  }
  return result;
}

function computeMacd(candles: Candle[] | undefined | null): MacdPoint[] {
  if (!candles) return [];
  const result: any[] = [];
  if (candles.length < 35) {
    return candles.map((c) => ({
      date: c.date,
      macd: null as any,
      signal: null as any,
      histogram: null as any,
    }));
  }

  const closes = candles.map((c) => c.close);
  const ema12 = ema(closes, 12);   // length = closes.length - 11
  const ema26 = ema(closes, 26);   // length = closes.length - 25

  // ema26 is shorter — align to same tail window
  const offset = ema12.length - ema26.length;  // = 14
  const macdLine = ema26.map((v26, i) => ema12[i + offset] - v26);

  const signalLine = ema(macdLine, 9);
  const sigOffset  = macdLine.length - signalLine.length; // = 8

  // Pad the first 33 elements (0 to 32) with null values
  for (let i = 0; i < 33; i++) {
    result.push({
      date:      candles[i].date,
      macd:      null,
      signal:    null,
      histogram: null,
    });
  }

  signalLine.forEach((sig, i) => {
    const macd = macdLine[i + sigOffset];
    const candleIdx = 33 + i;
    result.push({
      date:      candles[candleIdx]?.date ?? "",
      macd:      parseFloat(macd.toFixed(4)),
      signal:    parseFloat(sig.toFixed(4)),
      histogram: parseFloat((macd - sig).toFixed(4)),
    });
  });

  return result.filter((p) => p.date);
}

function isValidSignal(s: unknown): s is StockSignal {
  return (
    typeof s === "object" && s !== null &&
    "composite_score" in s &&
    typeof (s as any).composite_score === "number"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [symbol, setSymbol]           = useState("RELIANCE.NS");
  const [period, setPeriod]           = useState("1y");
  const [stockData, setStockData]     = useState<StockData | null>(null);
  const [signal, setSignal]           = useState<StockSignal | null>(null);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  // Sync ref for multi-chart scrolling and panning
  const syncRef = useRef<{
    charts: Map<string, any>;
    isSyncing: boolean;
  }>({ charts: new Map(), isSyncing: false });

  const handleChartInit = useCallback((id: string, chart: any) => {
    const sync = syncRef.current;
    sync.charts.set(id, chart);

    const timeScale = chart.timeScale();
    
    // Sync visible date ranges
    const handler = (newRange: any) => {
      if (sync.isSyncing) return;
      if (!newRange) return;
      sync.isSyncing = true;
      sync.charts.forEach((c, key) => {
        if (key !== id) {
          try {
            c.timeScale().setVisibleRange(newRange);
          } catch (e) {}
        }
      });
      sync.isSyncing = false;
    };

    // Sync logical ranges (indices) to align charts with slight length disparities
    const logicalHandler = (newLogicalRange: any) => {
      if (sync.isSyncing) return;
      if (!newLogicalRange) return;
      sync.isSyncing = true;
      sync.charts.forEach((c, key) => {
        if (key !== id) {
          try {
            c.timeScale().setVisibleLogicalRange(newLogicalRange);
          } catch (e) {}
        }
      });
      sync.isSyncing = false;
    };

    timeScale.subscribeVisibleTimeRangeChange(handler);
    try {
      timeScale.subscribeVisibleLogicalRangeChange(logicalHandler);
    } catch (e) {}

    return () => {
      try {
        timeScale.unsubscribeVisibleTimeRangeChange(handler);
        timeScale.unsubscribeVisibleLogicalRangeChange(logicalHandler);
      } catch (e) {}
      sync.charts.delete(id);
    };
  }, []);

  const load = useCallback(async (sym: string, per: string) => {
    setLoading(true);
    setSignalError(null);
    setStockData(null);
    setSignal(null);
    try {
      const [d, s] = await Promise.all([api.getStockData(sym, per), api.getSignals(sym)]);
      if (d && Array.isArray((d as any).candles) && (d as any).candles.length > 0) {
        setStockData(d);
      }
      if (isValidSignal(s)) {
        setSignal(s);
      } else {
        setSignalError((s as any)?.error ?? "Could not compute signals");
      }
    } catch (e: any) {
      console.error(e);
      setSignalError(e.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(symbol, period); }, [symbol, period, load]);

  const candles  = stockData?.candles ?? [];
  const rsiData  = computeRsi(candles);
  const macdData = computeMacd(candles);

  const selectClass =
    "bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-gray-200 " +
    "focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer";

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header + controls */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Research</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Candlestick · Volume · RSI · MACD · Composite signal
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className={selectClass}
            >
              {STOCKS.map((s) => (
                <option key={s} value={s} className="bg-[#111827]">
                  {s.replace(".NS", "")}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          <div className="flex gap-1 bg-[#111827] border border-[#1F2937] rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  period === p.value
                    ? "bg-amber-500 text-black"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="h-[380px] rounded-xl bg-[#111827] border border-[#1F2937] animate-pulse" />
          <div className="h-28 rounded-xl bg-[#111827] border border-[#1F2937] animate-pulse" />
          <div className="h-36 rounded-xl bg-[#111827] border border-[#1F2937] animate-pulse" />
        </div>
      )}

      {/* Main layout */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Charts column — min-w-0 prevents grid blowout from lightweight-charts canvas */}
          <div className="lg:col-span-3 space-y-3 min-w-0 overflow-hidden">
            <CandlestickChart
              candles={candles}
              symbol={symbol}
              livePrice={stockData?.live_price}
              liveChange={stockData?.live_change}
              liveChangePct={stockData?.live_change_pct}
              onChartInit={(chart) => handleChartInit("candlestick", chart)}
            />
            <RsiChart data={rsiData} onChartInit={(chart) => handleChartInit("rsi", chart)} />
            <MacdChart data={macdData} onChartInit={(chart) => handleChartInit("macd", chart)} />
          </div>

          {/* Signals column */}
          <div>
            <SignalsPanel signal={signal} error={signalError} />
          </div>
        </div>
      )}
    </div>
  );
}
