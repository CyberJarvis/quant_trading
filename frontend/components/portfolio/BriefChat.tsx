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
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Describe Your Goal</h3>
        <p className="text-xs text-gray-500">
          Tell us your investment amount, horizon, and risk appetite in plain English.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. I want to invest 5 lakhs for 5 years with moderate risk…"
        rows={4}
        className="w-full bg-[#0D1220] border border-[#1F2937] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none focus:border-amber-500/50 transition-colors"
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) handleSubmit(text);
        }}
      />

      <button
        onClick={() => handleSubmit(text)}
        disabled={loading || !text.trim()}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Optimizing…</>
        ) : (
          <><Send size={15} /> Optimize Portfolio</>
        )}
      </button>

      <div className="space-y-1.5">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Quick Examples</p>
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => { setText(ex); }}
            className="block w-full text-left text-xs text-gray-500 hover:text-amber-400 py-1 px-2 rounded hover:bg-amber-500/5 transition-colors"
          >
            → {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
