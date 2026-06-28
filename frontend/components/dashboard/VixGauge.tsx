"use client";

interface Props {
  vix: number | null;
  sentiment: string | null;
}

export default function VixGauge({ vix, sentiment }: Props) {
  const pct = vix !== null ? Math.min(Math.max((vix / 40) * 100, 0), 100) : 0;
  const color = vix === null ? "var(--muted)"
    : vix < 15 ? "var(--bull)"
    : vix > 22 ? "var(--bear)"
    : "var(--sideways)";

  return (
    <div className="bg-[var(--surface)] border" style={{ borderColor: "var(--border)" }}>
      <div className="px-4 py-3">
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>India VIX</p>

        {/* Gauge bar */}
        <div className="relative h-2.5 bg-border overflow-hidden mb-2">
          <div
            className="absolute left-0 top-0 h-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
          {/* Zone markers */}
          <div className="absolute top-0 h-full w-px" style={{ left: "37.5%", background: "var(--bg)" }} />
          <div className="absolute top-0 h-full w-px" style={{ left: "55%", background: "var(--bg)" }} />
        </div>

        <div className="flex justify-between font-mono text-[9px] mb-3" style={{ color: "var(--muted-2)" }}>
          <span>0</span>
          <span>15</span>
          <span>22</span>
          <span>40+</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono font-bold text-2xl leading-none" style={{ color }}>
              {vix?.toFixed(1) ?? "—"}
            </p>
            <p className="font-mono text-[10px] mt-1 uppercase font-bold" style={{ color }}>
              {sentiment ?? "Loading…"}
            </p>
          </div>
          <div className="text-right font-mono text-[9px] space-y-0.5" style={{ color: "var(--muted-2)" }}>
            <p style={{ color: "var(--bull)" }}>{"<15 Low Fear"}</p>
            <p style={{ color: "var(--sideways)" }}>15-22 Moderate</p>
            <p style={{ color: "var(--bear)" }}>{">22 High Fear"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
