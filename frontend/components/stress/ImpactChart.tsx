"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import type { StressTestResult } from "@/lib/types";
import { formatInr } from "@/lib/utils";

export default function ImpactChart({ result }: { result: StressTestResult }) {
  const sorted = [...result.stock_impacts].sort((a, b) => a.impact - b.impact);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Before Shock</p>
          <p className="font-mono font-bold text-lg text-gray-200">
            ₹{result.portfolio_before.toFixed(0)}
          </p>
          <p className="text-[10px] text-gray-600">(normalised to 100)</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">After Shock</p>
          <p className="font-mono font-bold text-lg text-red-400">
            ₹{result.portfolio_after.toFixed(1)}
          </p>
          <p className="text-[10px] text-red-600/60">
            {result.portfolio_loss_pct.toFixed(2)}% loss
          </p>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nifty Drop</p>
          <p className="font-mono font-bold text-lg text-red-400">
            {result.nifty_drop.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-600">Market benchmark</p>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          <span className="font-medium text-gray-200">Scenario:</span> {result.scenario}
        </div>
        <div className="flex gap-4 text-xs">
          <span>
            Worst: <span className="text-red-400 font-mono">
              {result.worst_stock?.replace(".NS", "")}
            </span>
          </span>
          <span>
            Best: <span className="text-emerald-400 font-mono">
              {result.best_stock?.replace(".NS", "")}
            </span>
          </span>
        </div>
      </div>

      {/* Per-stock bar chart */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
        <p className="text-sm font-medium text-gray-300 mb-4">Per-Stock Impact</p>
        <ResponsiveContainer width="100%" height={Math.max(sorted.length * 30 + 40, 200)}>
          <BarChart data={sorted} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#6B7280", fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
              tickFormatter={(v) => v.replace(".NS", "")}
              width={70}
            />
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(2)}%`, "Impact"]}
              contentStyle={{ background: "#1a2235", border: "1px solid #2a3347", fontSize: 11 }}
            />
            <ReferenceLine x={0} stroke="#374151" />
            <Bar dataKey="impact" radius={[0, 3, 3, 0]}>
              {sorted.map((entry) => (
                <Cell
                  key={entry.symbol}
                  fill={entry.impact >= 0 ? "#10B981" : entry.impact < -20 ? "#EF4444" : "#F97316"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
