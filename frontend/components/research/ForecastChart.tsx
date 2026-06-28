"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import type { ForecastData } from "@/lib/types";

interface Props {
  data: ForecastData;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border px-3 py-2 text-xs space-y-0.5" style={{ borderColor: "var(--border)" }}>
      <p className="font-mono text-[color:var(--muted-2)] mb-1">Day {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-mono" style={{ color: p.color }}>
          {p.name}: <span className="font-bold">₹{Number(p.value).toLocaleString("en-IN")}</span>
        </p>
      ))}
    </div>
  );
};

export default function ForecastChart({ data }: Props) {
  const { bands, symbol, current_price, horizon_days } = data;

  const chartData = bands.p50.map((_, i) => ({
    day: i + 1,
    "P10": bands.p10[i],
    "P25": bands.p25[i],
    "Median": bands.p50[i],
    "P75": bands.p75[i],
    "P90": bands.p90[i],
  }));

  const allVals = [...bands.p10, ...bands.p90, current_price];
  const minVal = Math.min(...allVals) * 0.985;
  const maxVal = Math.max(...allVals) * 1.015;

  return (
    <div className="bg-[var(--surface)] border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="font-mono text-[10px] font-bold text-[color:var(--muted)] uppercase tracking-wider">
            {symbol.replace(".NS", "")} · GBM Scenarios · {horizon_days}D
          </p>
          <p className="font-mono text-[9px] text-gray-600 mt-0.5 uppercase">
            {data.simulations.toLocaleString()} Monte Carlo paths
          </p>
        </div>
        <span className="font-mono text-[9px] border px-2 py-0.5 uppercase"
          style={{ borderColor: "var(--amber)", color: "var(--amber)", opacity: 0.8 }}>
          Visualization · Not A Prediction
        </span>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="day"
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(d) => `D${d}`}
            interval={Math.max(1, Math.floor(horizon_days / 6) - 1)}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={current_price}
            stroke="var(--muted)"
            strokeDasharray="4 4"
            label={{ value: "Now", position: "insideTopLeft", fill: "var(--muted)", fontSize: 9, fontFamily: "monospace" }}
          />
          {/* Outer band */}
          <Line type="monotone" dataKey="P90" stroke="#4b5563" strokeWidth={1} strokeDasharray="2 4" dot={false} />
          <Line type="monotone" dataKey="P10" stroke="#4b5563" strokeWidth={1} strokeDasharray="2 4" dot={false} />
          {/* Inner band */}
          <Line type="monotone" dataKey="P75" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          <Line type="monotone" dataKey="P25" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          {/* Median */}
          <Line type="monotone" dataKey="Median" stroke="var(--amber)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex gap-5 mt-2 justify-center flex-wrap">
        {[
          { color: "var(--amber)", label: "── Median (P50)", dash: false },
          { color: "#3b82f6",     label: "- - P25 / P75",   dash: true },
          { color: "#4b5563",     label: "·· P10 / P90",    dash: true },
        ].map(({ color, label }) => (
          <span key={label} className="font-mono text-[9px]" style={{ color }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
