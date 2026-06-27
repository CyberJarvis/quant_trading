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

  const fieldClass = "w-full bg-[#0D1220] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500/50 transition-colors";

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-200">Backtest Configuration</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Symbol</label>
          <select value={config.symbol} onChange={set("symbol")} className={fieldClass}>
            {SYMBOLS.map((s) => (
              <option key={s} value={s} className="bg-[#111827]">
                {s.replace("^", "").replace(".NS", "")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Strategy</label>
          <select value={config.strategy} onChange={set("strategy")} className={fieldClass}>
            {STRATEGIES.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111827]">{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Start Date</label>
          <input type="date" value={config.start} onChange={set("start")} className={fieldClass} />
        </div>

        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">End Date</label>
          <input type="date" value={config.end} onChange={set("end")} className={fieldClass} />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            Initial Capital (₹)
          </label>
          <input
            type="number"
            value={config.capital}
            onChange={set("capital")}
            min={10000}
            step={10000}
            className={fieldClass}
          />
        </div>
      </div>

      <button
        onClick={() => onRun(config)}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Running…</>
        ) : (
          <><Play size={15} /> Run Backtest</>
        )}
      </button>
    </div>
  );
}
