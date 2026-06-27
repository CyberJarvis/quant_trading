"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { StressTestResult, PortfolioAllocation } from "@/lib/types";
import ScenarioPicker from "@/components/stress/ScenarioPicker";
import ImpactChart from "@/components/stress/ImpactChart";
import { Zap, Loader2 } from "lucide-react";

const DEFAULT_PORTFOLIO: Record<string, number> = {
  "RELIANCE.NS":  0.15, "TCS.NS": 0.12, "HDFCBANK.NS":  0.12,
  "INFY.NS":      0.10, "ICICIBANK.NS": 0.10, "SBIN.NS": 0.08,
  "BHARTIARTL.NS":0.08, "ITC.NS": 0.07, "LT.NS":   0.08,
  "AXISBANK.NS":  0.10,
};

export default function StressTestPage() {
  const [scenario, setScenario]   = useState("covid_2020");
  const [customDrop, setCustomDrop] = useState(-20);
  const [result, setResult]       = useState<StressTestResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [portfolioJson, setPortfolioJson] = useState(
    JSON.stringify(DEFAULT_PORTFOLIO, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleRun = async () => {
    setJsonError(null);
    let portfolio: Record<string, number>;
    try {
      portfolio = JSON.parse(portfolioJson);
    } catch {
      setJsonError("Invalid JSON — check the portfolio format");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.runStressTest(
        portfolio,
        scenario,
        scenario === "custom" ? customDrop : undefined
      );
      if ("error" in res) throw new Error((res as any).error);
      setResult(res);
    } catch (e: any) {
      setError(e.message ?? "Stress test failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="font-mono text-lg font-bold uppercase tracking-wider text-gray-100 font-mono">
          Stress Test Desk
        </h1>
        <p className="font-mono text-[10px] text-gray-500 mt-0.5 uppercase">
          Simulate your portfolio through India's worst historical market crashes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: controls */}
        <div className="space-y-4">
          <div className="bg-surface border p-4" style={{ borderColor: "var(--border)" }}>
            <p className="font-mono text-xs font-bold uppercase text-gray-200 mb-3">Select Scenario</p>
            <ScenarioPicker
              selected={scenario}
              customDrop={customDrop}
              onSelect={setScenario}
              onCustomDrop={setCustomDrop}
            />
          </div>

          <div className="bg-surface border p-4" style={{ borderColor: "var(--border)" }}>
            <p className="font-mono text-xs font-bold uppercase text-text mb-2">Portfolio Weights Matrix</p>
            <p className="font-mono text-[9px] text-gray-500 mb-2 uppercase">
              Symbol → weight (0–1). Must sum to 1.0
            </p>
            <textarea
              value={portfolioJson}
              onChange={(e) => setPortfolioJson(e.target.value)}
              rows={8}
              className="w-full bg-surface border px-3 py-2 text-xs font-mono text-text focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 resize-none"
              style={{ borderColor: "var(--border)" }}
            />
            {jsonError && <p className="font-mono text-xs text-red-600 font-bold mt-1 uppercase">{jsonError}</p>}
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 border font-mono text-xs uppercase font-bold bg-amber text-black hover:bg-transparent hover:text-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            style={{ borderColor: "var(--amber)" }}
          >
            {loading ? (
              <>Running Simulations…</>
            ) : (
              <>[RUN] Execute Stress Test</>
            )}
          </button>
        </div>

        {/* Right: results */}
        <div className="lg:col-span-2">
          {error && (
            <div className="border px-4 py-3 font-mono text-xs text-red-400 bg-red-500/5 mb-4" style={{ borderColor: "var(--bear-border)" }}>
              {error}
            </div>
          )}
          {loading && (
            <div className="h-64 bg-surface border flex items-center justify-center animate-pulse" style={{ borderColor: "var(--border)" }}>
              <p className="font-mono text-xs text-gray-500 uppercase">Fetching historical crash data…</p>
            </div>
          )}
          {!result && !loading && !error && (
            <div className="h-64 bg-surface border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
              <div className="text-center">
                <p className="font-mono text-xs font-bold uppercase text-gray-500 mb-1">Select a scenario and run the stress test</p>
                <p className="font-mono text-[9px] text-gray-600 uppercase">
                  Uses real historical price data for each crash period
                </p>
              </div>
            </div>
          )}
          {result && !loading && <ImpactChart result={result} />}
        </div>
      </div>
    </div>
  );
}
