"use client";

import type { RegimeData } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const REGIME_STYLES = {
  BULL: {
    bg:      "linear-gradient(135deg, #0D2818 0%, #0A1E12 100%)",
    border:  "#22C55E",
    accent:  "#22C55E",
    text:    "#4ADE80",
    label:   "#86EFAC",
    icon:    TrendingUp,
    glow:    "0 0 40px rgba(34,197,94,0.10)",
  },
  BEAR: {
    bg:      "linear-gradient(135deg, #1F0A0E 0%, #180608 100%)",
    border:  "#F43F5E",
    accent:  "#F43F5E",
    text:    "#FB7185",
    label:   "#FDA4AF",
    icon:    TrendingDown,
    glow:    "0 0 40px rgba(244,63,94,0.10)",
  },
  SIDEWAYS: {
    bg:      "linear-gradient(135deg, #09132C 0%, #060B1A 100%)",
    border:  "#3B82F6",
    accent:  "#3B82F6",
    text:    "#60A5FA",
    label:   "#93C5FD",
    icon:    Minus,
    glow:    "0 0 40px rgba(59,130,246,0.10)",
  },
};

export default function RegimeBadge({ data }: { data: RegimeData | null }) {
  if (!data) {
    return (
      <div
        className="rounded-xl border overflow-hidden animate-pulse"
        style={{ height: 120, background: "#0B1320", borderColor: "#1A2B40" }}
      />
    );
  }

  const s   = REGIME_STYLES[data.regime];
  const Icon = s.icon;

  return (
    <div
      className="rounded-xl border overflow-hidden relative"
      style={{
        background:  s.bg,
        borderColor: s.border,
        boxShadow:   s.glow,
      }}
    >
      {/* Left accent bar with animated pulse */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ background: s.accent }}
      >
        <div
          className="absolute inset-0 rounded-l-xl animate-pulse-dot"
          style={{ background: s.accent, opacity: 0.6 }}
        />
      </div>

      <div className="pl-7 pr-5 py-5 flex items-start justify-between">
        {/* Left: regime */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <Icon size={20} style={{ color: s.accent }} />
            <span
              className="font-black tracking-wide"
              style={{ fontSize: 26, color: s.text, lineHeight: 1 }}
            >
              {data.regime} MARKET
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: s.label, opacity: 0.9 }}>
            {data.description}
          </p>
          <p className="text-xs mt-1" style={{ color: s.label, opacity: 0.6 }}>
            {data.strategy_hint}
          </p>
        </div>

        {/* Right: stats grid */}
        <div className="shrink-0 ml-6 grid grid-cols-2 gap-x-6 gap-y-2 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>Score</p>
            <p className="font-black font-mono text-3xl leading-none" style={{ color: s.text }}>
              {data.score}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>VIX</p>
            <p className="font-black font-mono text-3xl leading-none" style={{ color: s.text }}>
              {data.vix?.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>SMA 50</p>
            <p className="font-mono text-sm font-bold" style={{ color: s.label }}>
              {data.sma50?.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>SMA 200</p>
            <p className="font-mono text-sm font-bold" style={{ color: s.label }}>
              {data.sma200?.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
