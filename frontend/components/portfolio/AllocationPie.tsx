"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PortfolioAllocation } from "@/lib/types";
import { formatInr, signalColor } from "@/lib/utils";

const COLORS = [
  "#F59E0B","#10B981","#3B82F6","#8B5CF6","#EF4444",
  "#06B6D4","#F97316","#84CC16","#EC4899","#6366F1",
  "#14B8A6","#FB923C","#A855F7","#22D3EE","#4ADE80",
];

const SECTOR_COLORS: Record<string, string> = {
  IT:       "#3B82F6",
  Banking:  "#8B5CF6",
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
    <div className="bg-[#1a2235] border border-[#2a3347] rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-200 mb-1">{d.symbol.replace(".NS", "")}</p>
      <p className="text-gray-400">{d.sector}</p>
      <p className="text-amber-400 font-mono">{d.weight.toFixed(1)}%</p>
      <p className="text-gray-300 font-mono">{formatInr(d.amount_inr)}</p>
      <p className={`mt-1 ${signalColor(d.signal)}`}>{d.signal}</p>
    </div>
  );
};

export default function AllocationPie({ allocations }: { allocations: PortfolioAllocation[] }) {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
      <p className="text-sm font-medium text-gray-300 mb-4">Portfolio Allocation</p>
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
            formatter={(v) => v.replace(".NS", "")}
            wrapperStyle={{ fontSize: 10, color: "#9CA3AF" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
