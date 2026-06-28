"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { EquityPoint } from "@/lib/types";

interface Props {
  data: EquityPoint[];
  capital?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const strategy = payload.find((p: any) => p.dataKey === "strategy");
  const market   = payload.find((p: any) => p.dataKey === "market");
  const alpha = strategy && market ? strategy.value - market.value : 0;

  return (
    <div className="bg-[var(--surface)] border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
      <p className="font-mono text-[color:var(--muted-2)] mb-1">{label}</p>
      {strategy && (
        <p className="text-emerald-600 font-mono font-bold">Strategy ₹{strategy.value.toLocaleString("en-IN")}</p>
      )}
      {market && (
        <p className="text-blue-600 font-mono font-bold">Nifty 50  ₹{market.value.toLocaleString("en-IN")}</p>
      )}
      <p className={`font-mono mt-1 font-bold ${alpha >= 0 ? "text-emerald-600" : "text-red-650"}`}>
        Alpha {alpha >= 0 ? "+" : ""}₹{Math.abs(alpha).toLocaleString("en-IN")}
      </p>
    </div>
  );
};

export default function EquityCurve({ data, capital = 100000 }: Props) {
  if (!data?.length) {
    return (
      <div className="h-64 bg-[var(--surface)] border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-xs text-[color:var(--muted-2)] uppercase">No backtest data</p>
      </div>
    );
  }

  const sampled = data.length > 120 ? data.filter((_, i) => i % Math.ceil(data.length / 120) === 0) : data;

  return (
    <div className="bg-[var(--surface)] border p-4" style={{ borderColor: "var(--border)" }}>
      <p className="font-mono text-[10px] font-bold text-[color:var(--muted)] mb-3 uppercase tracking-wider">Strategy vs Nifty 50</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={sampled}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(d) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, color: "var(--muted)" }}
            formatter={(v) => <span className="font-mono text-[10px] font-bold uppercase" style={{ color: "var(--muted)" }}>{v === "strategy" ? "Strategy" : "Nifty 50"}</span>}
          />
          <Line
            type="monotone"
            dataKey="strategy"
            stroke="var(--bull)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="market"
            stroke="var(--sideways)"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            activeDot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
