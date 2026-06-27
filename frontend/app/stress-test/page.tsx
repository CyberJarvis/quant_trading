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
        <h1 className="text-xl font-bold text-gray-100">Stress Test</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Simulate your portfolio through India's worst historical market crashes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: controls */}
        <div className="space-y-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-200 mb-3">Select Scenario</p>
            <ScenarioPicker
              selected={scenario}
              customDrop={customDrop}
              onSelect={setScenario}
              onCustomDrop={setCustomDrop}
            />
          </div>

          <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-200 mb-2">Portfolio Weights</p>
            <p className="text-[10px] text-gray-600 mb-2">
              Symbol → weight (0–1). Must sum to 1.0
            </p>
            <textarea
              value={portfolioJson}
              onChange={(e) => setPortfolioJson(e.target.value)}
              rows={8}
              className="w-full bg-[#0D1220] border border-[#1F2937] rounded-lg px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-amber-500/50 resize-none"
            />
            {jsonError && <p className="text-xs text-red-400 mt-1">{jsonError}</p>}
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Running…</>
            ) : (
              <><Zap size={15} /> Run Stress Test</>
            )}
          </button>
        </div>

        {/* Right: results */}
        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}
          {loading && (
            <div className="h-64 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center animate-pulse">
              <p className="text-gray-600 text-sm">Fetching historical crash data…</p>
            </div>
          )}
          {!result && !loading && !error && (
            <div className="h-64 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center">
              <div className="text-center">
                <Zap size={32} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Select a scenario and run the stress test</p>
                <p className="text-gray-700 text-xs mt-1">
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
