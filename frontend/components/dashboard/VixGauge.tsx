"use client";

interface Props {
  vix: number | null;
  sentiment: string | null;
}

export default function VixGauge({ vix, sentiment }: Props) {
  const pct = vix !== null ? Math.min(Math.max((vix / 40) * 100, 0), 100) : 0;
  const color = vix === null ? "#6B7280"
    : vix < 15 ? "#10B981"
    : vix > 22 ? "#EF4444"
    : "#F59E0B";

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">India VIX</p>

      {/* Gauge bar */}
      <div className="relative h-3 bg-[#1F2937] rounded-full overflow-hidden mb-3">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* Zone markers */}
        <div className="absolute top-0 h-full w-px bg-[#374151]" style={{ left: "37.5%" }} />
        <div className="absolute top-0 h-full w-px bg-[#374151]" style={{ left: "55%" }} />
      </div>

      <div className="flex justify-between text-[10px] text-gray-600 mb-3">
        <span>0</span>
        <span>15</span>
        <span>22</span>
        <span>40+</span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono font-black text-3xl" style={{ color }}>
            {vix?.toFixed(1) ?? "—"}
          </p>
          <p className="text-xs mt-0.5" style={{ color }}>
            {sentiment ?? "Loading…"}
          </p>
        </div>
        <div className="text-right text-[10px] text-gray-600 space-y-0.5">
          <p className="text-emerald-600">{"<15 Low Fear"}</p>
          <p className="text-yellow-600">15-22 Moderate</p>
          <p className="text-red-600">{">22 High Fear"}</p>
        </div>
      </div>
    </div>
  );
}
