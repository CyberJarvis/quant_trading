"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PortfolioAllocation } from "@/lib/types";
import { formatInr, signalColor } from "@/lib/utils";

const COLORS = [
  "#F59E0B","#10B981","#3B82F6","#2563EB","#EF4444",
  "#06B6D4","#F97316","#84CC16","#EC4899","#0D9488",
  "#14B8A6","#FB923C","#0284C7","#22D3EE","#4ADE80",
];

const SECTOR_COLORS: Record<string, string> = {
  IT:       "#2563EB",
  Banking:  "#3B82F6",
  Energy:   "#F59E0B",
  FMCG:     "#10B981",
  Telecom:  "#06B6D4",
  Auto:     "#F97316",
  Finance:  "#EC4899",
  Infra:    "#84CC16",
  Cement:   "#A8A29E",
  Consumer: "#6366F1",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d: PortfolioAllocation = payload[0].payload;
  return (
    <div className="bg-surface border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
      <p className="font-mono font-bold text-text mb-1">{d.symbol.replace(".NS", "")}</p>
      <p className="font-mono text-gray-500 uppercase text-[9px] mb-0.5">{d.sector}</p>
      <p className="text-amber font-mono font-bold">{d.weight.toFixed(1)}%</p>
      <p className="text-text-2 font-mono">{formatInr(d.amount_inr)}</p>
      <p className={`font-mono text-[9px] uppercase font-bold mt-1 ${signalColor(d.signal)}`}>{d.signal}</p>
    </div>
  );
};

export default function AllocationPie({ allocations }: { allocations: PortfolioAllocation[] }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="bg-surface border p-5" style={{ borderColor: "var(--border)" }}>
      <p className="font-mono text-[10px] font-bold text-gray-400 mb-4 uppercase tracking-wider">Portfolio Allocation</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={allocations}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="weight"
            nameKey="symbol"
            paddingAngle={2}
            onMouseEnter={(d: any) => setActive(d.symbol)}
            onMouseLeave={() => setActive(null)}
          >
            {allocations.map((entry, i) => (
              <Cell
                key={entry.symbol}
                fill={SECTOR_COLORS[entry.sector] ?? COLORS[i % COLORS.length]}
                opacity={active && active !== entry.symbol ? 0.4 : 1}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(v) => <span className="font-mono text-[10px] font-bold uppercase" style={{ color: "var(--muted)" }}>{v.replace(".NS", "")}</span>}
            wrapperStyle={{ fontSize: 10, color: "var(--muted)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
