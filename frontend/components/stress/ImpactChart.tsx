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
        <div className="bg-surface border p-4 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1">Before Shock</p>
          <p className="font-mono font-bold text-lg text-text">
            ₹{result.portfolio_before.toFixed(0)}
          </p>
          <p className="font-mono text-[9px] text-gray-400 uppercase">(normalised to 100)</p>
        </div>
        <div className="bg-red-500/5 border p-4 text-center" style={{ borderColor: "var(--bear-border)" }}>
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1">After Shock</p>
          <p className="font-mono font-bold text-lg text-red-600">
            ₹{result.portfolio_after.toFixed(1)}
          </p>
          <p className="font-mono text-[9px] text-red-600 uppercase font-bold">
            {result.portfolio_loss_pct.toFixed(2)}% loss
          </p>
        </div>
        <div className="bg-surface border p-4 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nifty Drop</p>
          <p className="font-mono font-bold text-lg text-red-600">
            {result.nifty_drop.toFixed(1)}%
          </p>
          <p className="font-mono text-[9px] text-gray-400 uppercase">Market benchmark</p>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-surface border px-4 py-3 flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div className="font-mono text-[10px] text-gray-500 uppercase">
          <span className="font-bold text-text">Scenario:</span> {result.scenario}
        </div>
        <div className="flex gap-4 font-mono text-[10px] uppercase text-gray-500">
          <span>
            Worst: <span className="text-red-600 font-bold">
              {result.worst_stock?.replace(".NS", "")}
            </span>
          </span>
          <span>
            Best: <span className="text-emerald-500 font-bold">
              {result.best_stock?.replace(".NS", "")}
            </span>
          </span>
        </div>
      </div>

      {/* Per-stock bar chart */}
      <div className="bg-surface border p-4" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-wider">Per-Stock Impact Breakdown</p>
        <ResponsiveContainer width="100%" height={Math.max(sorted.length * 30 + 40, 200)}>
          <BarChart data={sorted} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
              tickFormatter={(v) => v.replace(".NS", "")}
              width={70}
            />
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(2)}%`, "Impact"]}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11, fontFamily: "monospace" }}
            />
            <ReferenceLine x={0} stroke="var(--muted-2)" />
            <Bar dataKey="impact" radius={[0, 0, 0, 0]}>
              {sorted.map((entry) => (
                <Cell
                  key={entry.symbol}
                  fill={entry.impact >= 0 ? "var(--bull)" : entry.impact < -20 ? "var(--bear)" : "#F97316"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
