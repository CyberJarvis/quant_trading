"use client";

import type { StockSignal } from "@/lib/types";
import { signalBg } from "@/lib/utils";

export default function SignalFeed({ signals }: { signals: StockSignal[] }) {
  if (!signals.length) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-[#111827] border border-[#1F2937] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signals.slice(0, 8).map((sig) => (
        <div
          key={sig.symbol}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-[#111827] border border-[#1F2937] hover:border-[#374151] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#1a2235] flex items-center justify-center">
              <span className="text-[10px] font-bold text-amber-400">
                {sig.symbol.replace(".NS", "").slice(0, 3)}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">
                {sig.symbol.replace(".NS", "")}
              </p>
              <p className="text-[10px] text-gray-500">
                ₹{sig.current_price?.toLocaleString("en-IN") ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-500">Score</p>
              <p className="text-xs font-mono text-gray-300">{sig.composite_score.toFixed(1)}/10</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${signalBg(sig.verdict)}`}>
              {sig.verdict}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
