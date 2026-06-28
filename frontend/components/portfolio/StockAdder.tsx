"use client";

import { useState } from "react";
import { Plus, Loader2, ChevronDown } from "lucide-react";

const ALL_STOCKS = [
  "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS",
  "SBIN.NS","BHARTIARTL.NS","ITC.NS","LT.NS","AXISBANK.NS",
  "KOTAKBANK.NS","HINDUNILVR.NS","BAJFINANCE.NS","MARUTI.NS","TITAN.NS",
  "WIPRO.NS","HCLTECH.NS","NESTLEIND.NS","ULTRACEMCO.NS","ASIANPAINT.NS",
];

interface Props {
  existing: string[];
  onAdd: (symbol: string, weight: number) => Promise<void>;
}

export default function StockAdder({ existing, onAdd }: Props) {
  const [open, setOpen]     = useState(false);
  const [symbol, setSymbol] = useState("");
  const [weight, setWeight] = useState("5");
  const [loading, setLoading] = useState(false);

  const available = ALL_STOCKS.filter((s) => !existing.includes(s));

  const handleAdd = async () => {
    if (!symbol || loading) return;
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0 || w > 100) return;
    setLoading(true);
    try {
      await onAdd(symbol, w);
      setSymbol("");
      setWeight("5");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-amber border border-dashed hover:bg-amber-glow px-3 py-2 transition-colors cursor-pointer"
        style={{ borderColor: "var(--amber-border)" }}
      >
        <Plus size={12} /> Add Asset holding
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Stock selector */}
      <div className="relative">
        <select aria-label="Select dropdown"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-[var(--surface)] border pl-3 pr-7 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
          style={{ borderColor: "var(--border)" }}
        >
          <option value="" className="bg-[var(--surface)]">Select asset…</option>
          {available.map((s) => (
            <option key={s} value={s} className="bg-[var(--surface)]">
              {s.replace(".NS", "")}
            </option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--muted-2)] pointer-events-none" />
      </div>

      {/* Weight */}
      <div className="flex items-center gap-1">
        <input aria-label="Input field"
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          min={1}
          max={100}
          step={1}
          className="w-16 bg-[var(--surface)] border px-2 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 text-center"
          style={{ borderColor: "var(--border)" }}
        />
        <span className="font-mono text-[10px] text-[color:var(--muted-2)] uppercase">%</span>
      </div>

      <button
        onClick={handleAdd}
        disabled={!symbol || loading}
        className="flex items-center gap-1.5 px-3 py-2 border font-mono text-xs uppercase font-bold bg-amber text-black hover:bg-transparent hover:text-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        style={{ borderColor: "var(--amber)" }}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        Add
      </button>

      <button
        onClick={() => { setOpen(false); setSymbol(""); }}
        className="font-mono text-xs uppercase text-[color:var(--muted-2)] hover:text-text px-2 py-2 cursor-pointer transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
