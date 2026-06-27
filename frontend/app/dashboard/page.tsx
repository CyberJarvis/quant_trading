"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { RegimeData, StockSignal, BacktestResult } from "@/lib/types";
import RegimeBadge from "@/components/dashboard/RegimeBadge";
import MetricCard from "@/components/dashboard/MetricCard";
import EquityCurve from "@/components/dashboard/EquityCurve";
import SignalFeed from "@/components/dashboard/SignalFeed";
import VixGauge from "@/components/dashboard/VixGauge";

function isValidBacktest(bt: unknown): bt is BacktestResult {
  return (
    bt !== null && typeof bt === "object" &&
    "total_return" in bt && typeof (bt as any).total_return === "number"
  );
}

export default function DashboardPage() {
  const [regime,   setRegime]   = useState<RegimeData | null>(null);
  const [signals,  setSignals]  = useState<StockSignal[]>([]);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [btLoading,setBtLoading]= useState(true);

  useEffect(() => {
    const loadFast = async () => {
      try {
        const [r, s] = await Promise.all([api.getRegime(), api.getTopSignals(10)]);
        setRegime(r);
        setSignals(s);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };

    const loadBacktest = async () => {
      try {
        const bt = await api.runBacktest(
          "^NSEI", "composite", "2023-01-01",
          new Date().toISOString().slice(0, 10), 100000
        );
        if (isValidBacktest(bt)) setBacktest(bt);
      } catch (e) { console.error(e); }
      finally { setBtLoading(false); }
    };

    loadFast();
    loadBacktest();
  }, []);

  const vix = regime?.vix ?? null;
  const vixSentiment = vix === null ? null
    : vix < 15 ? "LOW FEAR" : vix > 22 ? "HIGH FEAR" : "MODERATE";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#E2E8F0" }}>
          Dashboard
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
          Powered by Angel One SmartAPI · Live NSE/BSE Data
        </p>
      </div>

      {/* Regime hero */}
      <RegimeBadge data={regime} />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Return"
          value={btLoading ? null : backtest ? `${backtest.total_return >= 0 ? "+" : ""}${backtest.total_return.toFixed(1)}` : "—"}
          unit="%"
          trend={backtest ? (backtest.total_return >= 0 ? "up" : "down") : "neutral"}
          description="Strategy vs Nifty · 2023–now"
        />
        <MetricCard
          label="Sharpe Ratio"
          value={btLoading ? null : backtest ? backtest.sharpe.toFixed(2) : "—"}
          trend={backtest ? (backtest.sharpe >= 1 ? "up" : "neutral") : "neutral"}
          description="Risk-adjusted return"
        />
        <MetricCard
          label="Max Drawdown"
          value={btLoading ? null : backtest ? backtest.max_drawdown.toFixed(1) : "—"}
          unit="%"
          trend={backtest ? "down" : "neutral"}
          description="Worst peak-to-trough"
        />
        <MetricCard
          label="Alpha"
          value={btLoading ? null : backtest ? `${backtest.alpha >= 0 ? "+" : ""}${backtest.alpha.toFixed(1)}` : "—"}
          unit="%"
          trend={backtest ? (backtest.alpha >= 0 ? "up" : "down") : "neutral"}
          description="Outperformance vs index"
        />
      </div>

      {/* Equity curve */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "#1A2B40", background: "#0B1320" }}
      >
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1A2B40" }}>
          <p className="text-sm font-semibold" style={{ color: "#CBD5E1" }}>
            Strategy Performance
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#475569" }}>
            Composite Signal vs Nifty 50 · ₹1L starting capital
          </p>
        </div>
        <div className="p-4">
          {backtest && <EquityCurve data={backtest.equity_curve} capital={100000} />}
          {!backtest && btLoading && (
            <div
              className="h-56 rounded-lg animate-pulse flex items-center justify-center"
              style={{ background: "#111F30" }}
            >
              <p className="text-xs" style={{ color: "#334155" }}>Computing equity curve…</p>
            </div>
          )}
          {!backtest && !btLoading && (
            <div
              className="h-32 rounded-lg flex items-center justify-center"
              style={{ background: "#111F30" }}
            >
              <p className="text-sm" style={{ color: "#475569" }}>Equity curve unavailable</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: "#CBD5E1" }}>Top Buy Signals</p>
            {loading && (
              <span className="text-[10px] font-medium" style={{ color: "#475569" }}>
                Computing live signals…
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg animate-pulse"
                  style={{ background: "#0B1320", border: "1px solid #1A2B40" }}
                />
              ))}
            </div>
          ) : signals.length > 0 ? (
            <SignalFeed signals={signals} />
          ) : (
            <div
              className="h-32 rounded-xl border flex items-center justify-center"
              style={{ background: "#0B1320", borderColor: "#1A2B40" }}
            >
              <p className="text-sm" style={{ color: "#475569" }}>No signals available</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: "#CBD5E1" }}>India VIX</p>
          <VixGauge vix={vix} sentiment={vixSentiment} />

          {regime && (
            <div
              className="mt-3 rounded-xl border px-4 py-3"
              style={{ background: "#0B1320", borderColor: "#1A2B40" }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#334155" }}>
                SMA Status
              </p>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  { label: "Nifty",   value: regime.nifty?.toLocaleString("en-IN") },
                  { label: "SMA 50",  value: regime.sma50?.toLocaleString("en-IN") },
                  { label: "SMA 200", value: regime.sma200?.toLocaleString("en-IN") },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: "#475569" }}>{label}</span>
                    <span style={{ color: "#CBD5E1" }}>{value}</span>
                  </div>
                ))}
                <div
                  className="flex justify-between pt-1.5 border-t"
                  style={{ borderColor: "#1A2B40" }}
                >
                  <span style={{ color: "#475569" }}>vs SMA200</span>
                  <span style={{
                    color: regime.nifty_vs_sma200 >= 0 ? "#22C55E" : "#F43F5E",
                  }}>
                    {regime.nifty_vs_sma200 >= 0 ? "+" : ""}{regime.nifty_vs_sma200?.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
