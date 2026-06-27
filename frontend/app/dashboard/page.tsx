"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [page,     setPage]     = useState(0);
  const PAGE_SIZE = 8;

  useEffect(() => {
    const loadFast = async () => {
      try {
        const [r, s] = await Promise.all([api.getRegime(), api.getTopSignals(50)]);
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

  const totalPages  = Math.max(1, Math.ceil(signals.length / PAGE_SIZE));
  const pagedSignals = useMemo(
    () => signals.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [signals, page, PAGE_SIZE]
  );

  const vix = regime?.vix ?? null;
  const vixSentiment = vix === null ? null
    : vix < 15 ? "LOW FEAR" : vix > 22 ? "HIGH FEAR" : "MODERATE";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text">
          Dashboard
        </h1>
        <p className="text-xs mt-0.5 text-muted">
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
        className="border overflow-hidden bg-surface"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text)" }}>
            Strategy Performance
          </p>
          <p className="font-mono text-[9px] mt-0.5" style={{ color: "var(--muted)" }}>
            Composite Signal vs Nifty 50 · ₹1L starting capital
          </p>
        </div>
        <div className="p-4">
          {backtest && <EquityCurve data={backtest.equity_curve} capital={100000} />}
          {!backtest && btLoading && (
            <div
              className="h-56 animate-pulse flex items-center justify-center"
              style={{ background: "var(--surface-hover)" }}
            >
              <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>Computing equity curve…</p>
            </div>
          )}
          {!backtest && !btLoading && (
            <div
              className="h-32 flex items-center justify-center"
              style={{ background: "var(--surface-hover)" }}
            >
              <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>Equity curve unavailable</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text)" }}>Top Buy Signals</p>
            {loading ? (
              <span className="font-mono text-[9px]" style={{ color: "var(--muted)" }}>
                Computing live signals…
              </span>
            ) : signals.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px]" style={{ color: "var(--muted)" }}>
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, signals.length)} of {signals.length}
                </span>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-6 h-6 border flex items-center justify-center disabled:opacity-30 hover:bg-surface-hover transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  <ChevronLeft size={12} style={{ color: "var(--text)" }} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="w-6 h-6 border flex items-center justify-center disabled:opacity-30 hover:bg-surface-hover transition-colors cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  <ChevronRight size={12} style={{ color: "var(--text)" }} />
                </button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                />
              ))}
            </div>
          ) : signals.length > 0 ? (
            <SignalFeed signals={pagedSignals} />
          ) : (
            <div
              className="h-32 border flex items-center justify-center"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>No signals available</p>
            </div>
          )}
        </div>

        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text)" }}>India VIX</p>
          <VixGauge vix={vix} sentiment={vixSentiment} />

          {regime && (
            <div
              className="mt-3 border px-4 py-3 bg-surface"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                SMA Status
              </p>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  { label: "Nifty",   value: regime.nifty?.toLocaleString("en-IN") },
                  { label: "SMA 50",  value: regime.sma50?.toLocaleString("en-IN") },
                  { label: "SMA 200", value: regime.sma200?.toLocaleString("en-IN") },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: "var(--muted-2)" }}>{label}</span>
                    <span style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
                  </div>
                ))}
                <div
                  className="flex justify-between pt-1.5 border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span style={{ color: "var(--muted-2)" }}>vs SMA200</span>
                  <span style={{
                    color: regime.nifty_vs_sma200 >= 0 ? "var(--bull)" : "var(--bear)",
                    fontVariantNumeric: "tabular-nums"
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
