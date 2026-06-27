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

  const valueColor  = isUp ? "var(--bull)" : isDown ? "var(--bear)" : "var(--text)";
  const iconColor   = isUp ? "var(--bull)" : isDown ? "var(--bear)" : "var(--muted-2)";

  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <div
      className="border px-4 py-3 bg-surface"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        <TrendIcon
          size={11}
          style={{ color: iconColor }}
          className={isNull ? "opacity-20" : ""}
        />
      </div>

      {isNull ? (
        <div className="h-8 w-24 animate-pulse" style={{ background: "var(--border)" }} />
      ) : (
        <div className="flex items-baseline gap-0.5">
          <span
            className={cn("font-bold text-2xl leading-none font-mono tracking-tight")}
            style={{ color: valueColor, fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </span>
          {unit && (
            <span className="font-mono text-xs font-semibold" style={{ color: "var(--muted-2)" }}>{unit}</span>
          )}
        </div>
      )}

      {description && (
        <p className="font-mono text-[9px] mt-1.5" style={{ color: "var(--muted-2)" }}>{description}</p>
      )}
    </div>
  );
}
