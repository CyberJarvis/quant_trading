"use client";

import type { RegimeData } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const REGIME_STYLES = {
  BULL: {
    bg:      "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
    border:  "#10B981",
    accent:  "#059669",
    text:    "#065F46",
    label:   "#047857",
    icon:    TrendingUp,
    glow:    "none",
  },
  BEAR: {
    bg:      "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
    border:  "#EF4444",
    accent:  "#DC2626",
    text:    "#991B1B",
    label:   "#B91C1C",
    icon:    TrendingDown,
    glow:    "none",
  },
  SIDEWAYS: {
    bg:      "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
    border:  "#3B82F6",
    accent:  "#2563EB",
    text:    "#1E40AF",
    label:   "#1D4ED8",
    icon:    Minus,
    glow:    "none",
  },
};

export default function RegimeBadge({ data }: { data: RegimeData | null }) {
  if (!data) {
    return (
      <div
        className="border overflow-hidden animate-pulse"
        style={{ height: 120, background: "var(--surface)", borderColor: "var(--border)" }}
      />
    );
  }

  const s   = REGIME_STYLES[data.regime as keyof typeof REGIME_STYLES] ?? REGIME_STYLES.SIDEWAYS;
  const Icon = s.icon;

  return (
    <div
      className="border relative"
      style={{
        background:  s.bg,
        borderColor: s.border,
      }}
    >
      {/* Left accent bar with animated pulse */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: s.accent }}
      >
        <div
          className="absolute inset-0 animate-pulse-dot"
          style={{ background: s.accent, opacity: 0.6 }}
        />
      </div>

      <div className="pl-6 pr-5 py-4 flex items-start justify-between">
        {/* Left: regime */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <Icon size={18} style={{ color: s.accent }} />
            <span
              className="font-bold tracking-wide font-mono uppercase"
              style={{ fontSize: 20, color: s.text, lineHeight: 1 }}
            >
              {data.regime} MARKET
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: s.label, opacity: 0.9 }}>
            {data.description}
          </p>
          <p className="text-[10px] font-mono mt-1" style={{ color: s.label, opacity: 0.6 }}>
            {data.strategy_hint}
          </p>
        </div>

        {/* Right: stats grid */}
        <div className="shrink-0 ml-6 grid grid-cols-2 gap-x-6 gap-y-2 text-right">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>Score</p>
            <p className="font-bold font-mono text-2xl leading-none" style={{ color: s.text, fontVariantNumeric: "tabular-nums" }}>
              {data.score}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>VIX</p>
            <p className="font-bold font-mono text-2xl leading-none" style={{ color: s.text, fontVariantNumeric: "tabular-nums" }}>
              {data.vix?.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>SMA 50</p>
            <p className="font-mono text-xs font-bold" style={{ color: s.label, fontVariantNumeric: "tabular-nums" }}>
              {data.sma50?.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: s.label, opacity: 0.5 }}>SMA 200</p>
            <p className="font-mono text-xs font-bold" style={{ color: s.label, fontVariantNumeric: "tabular-nums" }}>
              {data.sma200?.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
