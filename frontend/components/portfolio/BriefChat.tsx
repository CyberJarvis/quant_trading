"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface Props {
  onSubmit: (brief: string) => Promise<void>;
  loading: boolean;
}

const examples = [
  "I want to invest 5 lakhs for 5 years, moderate risk",
  "2 crore corpus, 3 years, aggressive growth",
  "Invest 50,000 safely for 1 year, conservative",
];

export default function BriefChat({ onSubmit, loading }: Props) {
  const [text, setText] = useState("");

  const handleSubmit = async (val: string) => {
    if (!val.trim() || loading) return;
    await onSubmit(val.trim());
  };

  return (
    <div className="bg-surface border p-5 flex flex-col gap-4" style={{ borderColor: "var(--border)" }}>
      <div>
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text mb-1">Describe Investment Goal</h3>
        <p className="font-mono text-[9px] text-gray-500 uppercase">
          Define investment amount, horizon, and risk profile in English.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. I want to invest 5 lakhs for 5 years with moderate risk…"
        rows={4}
        className="w-full bg-surface border px-3 py-2.5 font-mono text-xs text-text placeholder:text-gray-400 resize-none focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 transition-colors"
        style={{ borderColor: "var(--border)" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) handleSubmit(text);
        }}
      />

      <button
        onClick={() => handleSubmit(text)}
        disabled={loading || !text.trim()}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 border font-mono text-xs uppercase font-bold bg-amber text-black hover:bg-transparent hover:text-amber transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        style={{ borderColor: "var(--amber)" }}
      >
        {loading ? (
          <>Running Optimization Core…</>
        ) : (
          <>[RUN] Optimize Portfolio</>
        )}
      </button>

      <div className="space-y-1">
        <p className="font-mono text-[9px] text-gray-600 uppercase tracking-widest">Quick Templates</p>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => { setText(ex); }}
            className="block w-full text-left font-mono text-[10px] text-gray-500 hover:text-amber py-1 px-1.5 hover:bg-surface-hover transition-colors cursor-pointer"
          >
            → {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
