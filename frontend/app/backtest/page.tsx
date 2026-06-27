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
        <h1 className="text-xl font-bold text-gray-100">Backtester</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Test quantitative strategies against historical Nifty 50 data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <BacktestForm onRun={handleRun} loading={loading} />
        </div>
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}
          {!result && !loading && (
            <div className="h-64 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center">
              <p className="text-gray-600 text-sm">Configure and run a backtest to see results</p>
            </div>
          )}
          {loading && (
            <div className="h-64 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center animate-pulse">
              <p className="text-gray-600 text-sm">Running backtest…</p>
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
