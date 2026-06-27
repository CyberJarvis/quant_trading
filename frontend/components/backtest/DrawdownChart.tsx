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
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-300">Drawdown</p>
        <span className="font-mono text-xs text-red-400">
          Max: {minDd.toFixed(2)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={sampled}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickFormatter={(d) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            formatter={(v) => [`${Number(v).toFixed(2)}%`, "Drawdown"]}
            contentStyle={{ background: "#1a2235", border: "1px solid #2a3347", fontSize: 11 }}
            labelStyle={{ color: "#9CA3AF" }}
          />
          <ReferenceLine y={0} stroke="#374151" />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#EF4444"
            strokeWidth={1.5}
            fill="url(#ddGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
