"use client";

import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import type { DrawdownPoint } from "@/lib/types";

export default function DrawdownChart({ data }: { data: DrawdownPoint[] }) {
  const sampled = data.length > 120 ? data.filter((_, i) => i % Math.ceil(data.length / 120) === 0) : data;
  const minDd = Math.min(...data.map((d) => d.drawdown));

  return (
    <div className="bg-surface border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider">Drawdown Analysis</p>
        <span className="font-mono text-xs text-red-600 font-bold">
          Max: {minDd.toFixed(2)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={sampled}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--bear)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--bear)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(d) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(2)}%`, "Drawdown"]}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11, fontFamily: "monospace" }}
            labelStyle={{ color: "var(--text)" }}
          />
          <ReferenceLine y={0} stroke="var(--muted-2)" />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="var(--bear)"
            strokeWidth={1.5}
            fill="url(#ddGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
