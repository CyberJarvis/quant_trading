"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { BacktestResult } from "@/lib/types";
import BacktestForm from "@/components/backtest/BacktestForm";
import EquityCurve from "@/components/dashboard/EquityCurve";
import DrawdownChart from "@/components/backtest/DrawdownChart";
import MetricsPanel from "@/components/backtest/MetricsPanel";

interface Config {
  symbol: string;
  strategy: string;
  start: string;
  end: string;
  capital: number;
}

export default function BacktestPage() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleRun = async (config: Config) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBacktest(
        config.symbol, config.strategy, config.start, config.end, config.capital
      );
      if ("error" in res) throw new Error((res as any).error);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "Backtest failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="font-mono text-lg font-bold uppercase tracking-wider text-text">Backtest Desk</h1>
        <p className="font-mono text-[10px] text-gray-500 mt-0.5 uppercase">
          Test quantitative strategies against historical Nifty 50 data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <BacktestForm onRun={handleRun} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          {error && (
            <div className="border px-4 py-3 font-mono text-xs text-red-700 bg-red-50/50 mb-4 font-bold uppercase" style={{ borderColor: "var(--bear-border)" }}>
              {error}
            </div>
          )}
          {!result && !loading && (
            <div className="h-64 bg-surface border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
              <p className="font-mono text-xs text-gray-500 uppercase">Configure and run a backtest to see results</p>
            </div>
          )}
          {loading && (
            <div className="h-64 bg-surface border flex items-center justify-center animate-pulse" style={{ borderColor: "var(--border)" }}>
              <p className="font-mono text-xs text-gray-500 uppercase">Running backtest…</p>
            </div>
          )}
          {result && !loading && (
            <MetricsPanel result={result} />
          )}
        </div>
      </div>

      {result && !loading && (
        <div className="space-y-4">
          <EquityCurve data={result.equity_curve} capital={100000} />
          <DrawdownChart data={result.drawdown_curve} />
        </div>
      )}
    </div>
  );
}
