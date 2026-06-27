import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  label: string;
  value: string | number | null;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  description?: string;
  mono?: boolean;
}

export default function MetricCard({ label, value, unit, trend, description, mono = true }: Props) {
  const isUp      = trend === "up";
  const isDown    = trend === "down";
  const isNull    = value === null || value === undefined;

  const accentColor = isUp ? "#22C55E" : isDown ? "#F43F5E" : "#334155";
  const valueColor  = isUp ? "#22C55E" : isDown ? "#F43F5E" : "#E2E8F0";
  const glowClass   = isUp ? "glow-bull" : isDown ? "glow-bear" : "";

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div
      className={cn("gradient-card rounded-xl border overflow-hidden relative", glowClass)}
      style={{ borderColor: "#1A2B40" }}
    >
      {/* Left accent strip */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ background: accentColor }}
      />

      <div className="pl-5 pr-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#475569" }}>
            {label}
          </span>
          <TrendIcon
            size={13}
            style={{ color: accentColor }}
            className={isNull ? "opacity-20" : ""}
          />
        </div>

        {isNull ? (
          <div className="h-9 w-28 rounded-md animate-pulse" style={{ background: "#1A2B40" }} />
        ) : (
          <div className="flex items-baseline gap-1">
            <span
              className={cn("font-black text-3xl leading-none", mono && "font-mono")}
              style={{ color: valueColor }}
            >
              {value}
            </span>
            {unit && (
              <span className="text-base font-semibold" style={{ color: "#475569" }}>{unit}</span>
            )}
          </div>
        )}

        {description && (
          <p className="text-[10px] mt-2" style={{ color: "#334155" }}>{description}</p>
        )}
      </div>
    </div>
  );
}
