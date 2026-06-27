"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";

const SYMBOLS = [
  "^NSEI", "^NSEBANK", "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS",
  "INFY.NS", "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS",
];
const STRATEGIES = [
  { value: "composite",    label: "Composite (All Signals)" },
  { value: "ma_crossover", label: "MA Crossover (SMA50/200)" },
  { value: "rsi",          label: "RSI Mean Reversion" },
  { value: "macd",         label: "MACD Crossover" },
  { value: "bollinger",    label: "Bollinger Bands" },
];

interface Config {
  symbol: string;
  strategy: string;
  start: string;
  end: string;
  capital: number;
}

interface Props {
  onRun: (config: Config) => Promise<void>;
  loading: boolean;
}

export default function BacktestForm({ onRun, loading }: Props) {
  const [config, setConfig] = useState<Config>({
    symbol: "^NSEI",
    strategy: "composite",
    start: "2023-01-01",
    end: new Date().toISOString().slice(0, 10),
    capital: 100000,
  });

  const set = (k: keyof Config) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setConfig((c) => ({ ...c, [k]: k === "capital" ? Number(e.target.value) : e.target.value }));

  const fieldClass = "w-full bg-surface border px-3 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 transition-colors";

  return (
    <div className="bg-surface border p-5 space-y-4" style={{ borderColor: "var(--border)" }}>
      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text">Backtest Parameter Matrix</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Asset Symbol</label>
          <select value={config.symbol} onChange={set("symbol")} className={fieldClass} style={{ borderColor: "var(--border)" }}>
            {SYMBOLS.map((s) => (
              <option key={s} value={s} className="bg-surface">
                {s.replace("^", "").replace(".NS", "")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Strategy Core</label>
          <select value={config.strategy} onChange={set("strategy")} className={fieldClass} style={{ borderColor: "var(--border)" }}>
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value} className="bg-surface">{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Start Date</label>
          <input type="date" value={config.start} onChange={set("start")} className={fieldClass} style={{ borderColor: "var(--border)" }} />
        </div>

        <div>
          <label className="block font-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">End Date</label>
          <input type="date" value={config.end} onChange={set("end")} className={fieldClass} style={{ borderColor: "var(--border)" }} />
        </div>

        <div className="col-span-2">
          <label className="block font-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">
            Initial Capital (INR)
          </label>
          <input
            type="number"
            value={config.capital}
            onChange={set("capital")}
            min={10000}
            step={10000}
            className={fieldClass}
            style={{ borderColor: "var(--border)" }}
          />
        </div>
      </div>

      <button
        onClick={() => onRun(config)}
        disabled={loading}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 border font-mono text-xs uppercase font-bold bg-amber text-black hover:bg-transparent hover:text-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        style={{ borderColor: "var(--amber)" }}
      >
        {loading ? (
          <>Running Simulations…</>
        ) : (
          <>[RUN] Execute Backtest</>
        )}
      </button>
    </div>
  );
}
