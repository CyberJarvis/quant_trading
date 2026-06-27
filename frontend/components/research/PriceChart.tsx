"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { Candle } from "@/lib/types";

interface Props {
  candles: Candle[];
  symbol: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as Candle;
  const change = d.close - d.open;
  const changePct = (change / d.open) * 100;
  return (
    <div className="bg-[#1a2235] border border-[#2a3347] rounded-lg px-3 py-2 text-xs space-y-0.5">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-gray-300">O <span className="font-mono text-gray-200">{d.open.toFixed(2)}</span></p>
      <p className="text-gray-300">H <span className="font-mono text-emerald-400">{d.high.toFixed(2)}</span></p>
      <p className="text-gray-300">L <span className="font-mono text-red-400">{d.low.toFixed(2)}</span></p>
      <p className="text-gray-300">C <span className="font-mono text-amber-400">{d.close.toFixed(2)}</span></p>
      <p className={`font-mono mt-1 ${changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
      </p>
    </div>
  );
};

export default function PriceChart({ candles, symbol }: Props) {
  if (!candles.length) {
    return (
      <div className="h-72 bg-[#111827] border border-[#1F2937] rounded-xl flex items-center justify-center">
        <p className="text-gray-600 text-sm">Select a stock to view chart</p>
      </div>
    );
  }

  const sampled = candles.length > 150
    ? candles.filter((_, i) => i % Math.ceil(candles.length / 150) === 0)
    : candles;

  const minClose = Math.min(...sampled.map((c) => c.low));
  const maxClose = Math.max(...sampled.map((c) => c.high));
  const domain = [minClose * 0.99, maxClose * 1.01];

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-300">
          {symbol.replace(".NS", "")} Price History
        </p>
        <p className="font-mono text-lg font-bold text-amber-400">
          ₹{candles[candles.length - 1]?.close.toFixed(2)}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={sampled}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
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
            domain={domain}
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke="#F59E0B"
            strokeWidth={2}
            fill="url(#priceGrad)"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
