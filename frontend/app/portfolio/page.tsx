"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { api } from "@/lib/api";
import type { PortfolioResult, PortfolioAllocation } from "@/lib/types";
import BriefChat from "@/components/portfolio/BriefChat";
import ReceiptBox from "@/components/portfolio/ReceiptBox";
import AllocationPie from "@/components/portfolio/AllocationPie";
import HoldingsTable, { type EnrichedAllocation } from "@/components/portfolio/HoldingsTable";
import PerformanceChart, { type StockSeries } from "@/components/portfolio/PerformanceChart";
import BrokerImport from "@/components/portfolio/BrokerImport";

// ─── helpers ──────────────────────────────────────────────────────────────────

function rescaleWeights(allocations: EnrichedAllocation[]): EnrichedAllocation[] {
  const total = allocations.reduce((s, a) => s + a.weight, 0);
  if (total === 0) return allocations;
  return allocations.map((a) => ({
    ...a,
    weight: parseFloat(((a.weight / total) * 100).toFixed(2)),
    amount_inr: 0,
  }));
}

function applyBudget(allocations: EnrichedAllocation[], budget: number): EnrichedAllocation[] {
  return allocations.map((a) => ({
    ...a,
    amount_inr: parseFloat((budget * a.weight / 100).toFixed(2)),
  }));
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [result,   setResult]   = useState<PortfolioResult | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [holdings, setHoldings] = useState<EnrichedAllocation[]>([]);
  const [budget,   setBudget]   = useState(0);

  const [chartSeries,     setChartSeries]     = useState<StockSeries[]>([]);
  const [benchmarkSeries, setBenchmarkSeries] = useState<StockSeries | null>(null);
  const [chartLoading,    setChartLoading]    = useState(false);
  const [showImport,      setShowImport]      = useState(false);

  // ── enrich holdings with live price, RSI, 1Y return ──────────────────────
  const enrich = useCallback(async (
    allocs: PortfolioAllocation[], bgt: number
  ): Promise<EnrichedAllocation[]> => {
    const results = await Promise.allSettled(
      allocs.map(async (a) => {
        try {
          const [sig, stockData] = await Promise.allSettled([
            api.getSignals(a.symbol),
            api.getStockData(a.symbol, "1y"),
          ]);
          const sigVal  = sig.status  === "fulfilled" ? sig.value  : null;
          const dataVal = stockData.status === "fulfilled" ? stockData.value : null;

          let return_1y: number | null = null;
          const candles = dataVal?.candles;
          if (candles && candles.length >= 2) {
            const first = candles[0].close;
            const last  = candles[candles.length - 1].close;
            return_1y   = parseFloat(((last - first) / first * 100).toFixed(2));
          }

          return {
            ...a,
            amount_inr:    parseFloat((bgt * a.weight / 100).toFixed(2)),
            current_price: (sigVal as any)?.current_price ?? null,
            rsi:           (sigVal as any)?.rsi           ?? null,
            macd_signal:   (sigVal as any)?.macd_signal   ?? null,
            return_1y,
          } as EnrichedAllocation;
        } catch {
          return { ...a, amount_inr: parseFloat((bgt * a.weight / 100).toFixed(2)) } as EnrichedAllocation;
        }
      })
    );
    return results.map((r, i) =>
      r.status === "fulfilled" ? r.value
        : { ...allocs[i], amount_inr: parseFloat((bgt * allocs[i].weight / 100).toFixed(2)) }
    );
  }, []);

  // ── load comparison chart ─────────────────────────────────────────────────
  const loadChartData = useCallback(async (symbols: string[]) => {
    setChartLoading(true);
    try {
      const [stockResults, niftyResult] = await Promise.allSettled([
        Promise.allSettled(
          symbols.map((s) => api.getStockData(s, "1y").then((d) => ({ symbol: s, candles: d?.candles ?? [] })))
        ),
        api.getStockData("^NSEI", "1y").then((d) => ({ symbol: "^NSEI", candles: d?.candles ?? [] })),
      ]);

      const series: StockSeries[] = [];
      if (stockResults.status === "fulfilled") {
        for (const r of stockResults.value) {
          if (r.status === "fulfilled" && r.value.candles.length > 0) {
            series.push({ symbol: r.value.symbol, candles: r.value.candles });
          }
        }
      }
      setChartSeries(series);
      setBenchmarkSeries(
        niftyResult.status === "fulfilled" && niftyResult.value.candles.length > 0
          ? { symbol: "^NSEI", candles: niftyResult.value.candles }
          : null
      );
    } finally {
      setChartLoading(false);
    }
  }, []);

  // ── optimise ──────────────────────────────────────────────────────────────
  const handleBrief = async (brief: string) => {
    setLoading(true);
    setError(null);
    setChartSeries([]);
    setBenchmarkSeries(null);
    try {
      const res = await api.createPortfolio(brief);
      setResult(res);
      const bgt = res.receipt.budget_inr;
      setBudget(bgt);
      const enriched = await enrich(res.allocation, bgt);
      setHoldings(enriched);
      await loadChartData(res.allocation.map((a) => a.symbol));
    } catch (e: any) {
      setError(e.message ?? "Failed to optimise portfolio");
    } finally {
      setLoading(false);
    }
  };

  // ── import from broker ────────────────────────────────────────────────────
  const handleImportConfirm = useCallback((imported: EnrichedAllocation[], totalValue: number) => {
    setShowImport(false);
    setBudget((prev) => prev + totalValue);
    setHoldings((prev) => {
      const existingSymbols = new Set(prev.map((h) => h.symbol));
      const newHoldings = imported.filter((h) => !existingSymbols.has(h.symbol));
      const merged = [...prev, ...newHoldings];
      loadChartData(merged.map((h) => h.symbol));
      return merged;
    });
    // Show holdings section even if no AI brief was run yet
    if (!result) {
      setResult({
        receipt: {
          budget_inr:       totalValue,
          horizon_months:   60,
          risk_level:       "MODERATE",
          current_regime:   "UNKNOWN",
          strategy_applied: "Broker Import",
        },
        allocation: [],
        metrics: { expected_return: null, sharpe_estimate: null, num_stocks: 0, total_weight: 100, metrics_note: "" },
      } as any);
    }
  }, [result, loadChartData]);

  // ── remove stock ──────────────────────────────────────────────────────────
  const handleRemove = useCallback((symbol: string) => {
    setHoldings((prev) => {
      const next = applyBudget(rescaleWeights(prev.filter((a) => a.symbol !== symbol)), budget);
      loadChartData(next.map((a) => a.symbol));
      return next;
    });
  }, [budget, loadChartData]);

  // ── add stock ─────────────────────────────────────────────────────────────
  const handleAdd = useCallback(async (symbol: string, weight: number) => {
    const [sigResult, stockResult] = await Promise.allSettled([
      api.getSignals(symbol),
      api.getStockData(symbol, "1y"),
    ]);
    const sig     = sigResult.status  === "fulfilled" ? sigResult.value  as any : null;
    const dataVal = stockResult.status === "fulfilled" ? stockResult.value        : null;

    let return_1y: number | null = null;
    const addCandles = dataVal?.candles;
    if (addCandles && addCandles.length >= 2) {
      const first = addCandles[0].close;
      const last  = addCandles[addCandles.length - 1].close;
      return_1y   = parseFloat(((last - first) / first * 100).toFixed(2));
    }

    const newAlloc: EnrichedAllocation = {
      symbol,
      weight,
      amount_inr:    parseFloat((budget * weight / 100).toFixed(2)),
      sector:        sig?.sector       ?? "Other",
      signal:        sig?.verdict      ?? "HOLD",
      score:         sig?.composite_score ?? 0,
      current_price: sig?.current_price   ?? null,
      rsi:           sig?.rsi             ?? null,
      macd_signal:   sig?.macd_signal     ?? null,
      return_1y,
    };

    setHoldings((prev) => {
      const next = applyBudget(rescaleWeights([...prev, newAlloc]), budget);
      loadChartData(next.map((a) => a.symbol));
      return next;
    });
  }, [budget, loadChartData]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {showImport && (
        <BrokerImport
          onConfirm={handleImportConfirm}
          onClose={() => setShowImport(false)}
        />
      )}
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#E2E8F0" }}>
          Portfolio Builder
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
          Signal-weighted portfolio construction · Live NSE signals · Angel One SmartAPI
        </p>
      </div>

      {/* Input + receipt row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BriefChat onSubmit={handleBrief} loading={loading} />
        {result ? (
          <ReceiptBox receipt={result.receipt} metrics={result.metrics} />
        ) : (
          <div
            className="rounded-xl border flex flex-col items-center justify-center min-h-[220px] gap-4"
            style={{ background: "#0B1320", borderColor: "#1A2B40" }}
          >
            <div className="text-center">
              <p className="text-sm" style={{ color: "#334155" }}>
                Your analysis will appear here
              </p>
              <p className="text-xs mt-1" style={{ color: "#1E3451" }}>
                Describe your goal and click Optimize
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-16 bg-[#1A2B40]" />
              <span className="text-[10px] text-gray-700">or</span>
              <div className="h-px w-16 bg-[#1A2B40]" />
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1A2B40] text-xs font-medium text-gray-400 hover:border-amber-500/40 hover:text-amber-400 transition-all"
            >
              <Upload size={13} /> Import from Broker
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ background: "rgba(244,63,94,0.08)", borderColor: "rgba(244,63,94,0.25)", color: "#FB7185" }}
        >
          {error}
        </div>
      )}

      {result && (
        <>
          {/* Performance chart — full width */}
          <PerformanceChart
            series={chartSeries}
            benchmarkSeries={benchmarkSeries}
            loading={chartLoading}
          />

          {/* Pie + Holdings side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-2">
              <AllocationPie allocations={holdings} />
            </div>
            <div className="lg:col-span-3">
              <HoldingsTable
                allocations={holdings}
                onRemove={handleRemove}
                onAdd={handleAdd}
                onImport={() => setShowImport(true)}
                budget={budget}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
