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
        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-dashed border-amber-500/30 hover:border-amber-400/50 rounded-lg px-3 py-2 transition-colors"
      >
        <Plus size={13} /> Add Stock
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Stock selector */}
      <div className="relative">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="bg-[#0D1220] border border-[#2a3347] rounded-lg pl-3 pr-7 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer"
        >
          <option value="">Select stock…</option>
          {available.map((s) => (
            <option key={s} value={s} className="bg-[#111827]">
              {s.replace(".NS", "")}
            </option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
      </div>

      {/* Weight */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          min={1}
          max={100}
          step={1}
          className="w-16 bg-[#0D1220] border border-[#2a3347] rounded-lg px-2 py-2 text-xs text-gray-200 focus:outline-none focus:border-amber-500/50 font-mono text-center"
        />
        <span className="text-xs text-gray-500">%</span>
      </div>

      <button
        onClick={handleAdd}
        disabled={!symbol || loading}
        className="flex items-center gap-1 text-xs bg-amber-500 text-black font-semibold px-3 py-2 rounded-lg hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        Add
      </button>

      <button
        onClick={() => { setOpen(false); setSymbol(""); }}
        className="text-xs text-gray-500 hover:text-gray-300 px-2 py-2"
      >
        Cancel
      </button>
    </div>
  );
}
