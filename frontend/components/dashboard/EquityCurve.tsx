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
    <div className="bg-[#1a2235] border border-[#2a3347] rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {strategy && (
        <p className="text-amber-400 font-mono">Strategy ₹{strategy.value.toLocaleString("en-IN")}</p>
      )}
      {market && (
        <p className="text-blue-400 font-mono">Nifty 50  ₹{market.value.toLocaleString("en-IN")}</p>
      )}
      <p className={`font-mono mt-1 ${alpha >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        Alpha {alpha >= 0 ? "+" : ""}₹{Math.abs(alpha).toLocaleString("en-IN")}
      </p>
    </div>
  );
};

export default function EquityCurve({ data, capital = 100000 }: Props) {
  if (!data?.length) {
    return (
      <div className="h-64 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center">
        <p className="text-gray-600 text-sm">No backtest data</p>
      </div>
    );
  }

  const sampled = data.length > 120 ? data.filter((_, i) => i % Math.ceil(data.length / 120) === 0) : data;

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
      <p className="text-sm font-medium text-gray-300 mb-3">Strategy vs Nifty 50</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={sampled}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickFormatter={(d) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }}
            formatter={(v) => v === "strategy" ? "Strategy" : "Nifty 50"}
          />
          <Line
            type="monotone"
            dataKey="strategy"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="market"
            stroke="#3B82F6"
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
