"use client";

import { useRouter } from "next/navigation";
import type { StockSignal } from "@/lib/types";
import { signalBg } from "@/lib/utils";

export default function SignalFeed({ signals }: { signals: StockSignal[] }) {
  const router = useRouter();

  if (!signals.length) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-[var(--surface)] border animate-pulse" style={{ borderColor: "var(--border)" }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {signals.map((sig) => (
        <div
          key={sig.symbol}
          onClick={() => router.push(`/research?symbol=${encodeURIComponent(sig.symbol)}`)}
          className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface)] border hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors cursor-pointer"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
              <span className="font-mono text-[9px] font-bold text-amber">
                {sig.symbol.replace(".NS", "").slice(0, 3)}
              </span>
            </div>
            <div>
              <p className="font-mono text-xs font-bold text-text">
                {sig.symbol.replace(".NS", "")}
              </p>
              <p className="font-mono text-[10px]" style={{ color: "var(--muted-2)", fontVariantNumeric: "tabular-nums" }}>
                ₹{sig.current_price?.toLocaleString("en-IN") ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="font-mono text-[9px]" style={{ color: "var(--muted-2)" }}>Score</p>
              <p className="font-mono text-xs font-bold text-[color:var(--text-2)]" style={{ fontVariantNumeric: "tabular-nums" }}>{sig.composite_score.toFixed(1)}/10</p>
            </div>
            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 border ${signalBg(sig.verdict)}`}>
              {sig.verdict}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
