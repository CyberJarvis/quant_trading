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
    <div className="bg-surface border px-3 py-2 text-xs space-y-0.5" style={{ borderColor: "var(--border)" }}>
      <p className="font-mono text-gray-500 mb-1">{label}</p>
      <p className="font-mono text-text-2">O <span className="font-bold text-text">{d.open.toFixed(2)}</span></p>
      <p className="font-mono text-text-2">H <span className="font-bold text-emerald-500">{d.high.toFixed(2)}</span></p>
      <p className="font-mono text-text-2">L <span className="font-bold text-red-500">{d.low.toFixed(2)}</span></p>
      <p className="font-mono text-text-2">C <span className="font-bold text-amber">{d.close.toFixed(2)}</span></p>
      <p className={`font-mono mt-1 font-bold ${changePct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
        {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
      </p>
    </div>
  );
};

export default function PriceChart({ candles, symbol }: Props) {
  if (!candles.length) {
    return (
      <div className="h-72 bg-surface border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-xs text-gray-500 uppercase">Select a stock to view chart</p>
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
    <div className="bg-surface border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {symbol.replace(".NS", "")} Price History
        </p>
        <p className="font-mono text-lg font-bold text-emerald-500" style={{ fontVariantNumeric: "tabular-nums" }}>
          ₹{candles[candles.length - 1]?.close.toFixed(2)}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={sampled}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--bull)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--bull)" stopOpacity={0} />
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
            domain={domain}
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="close"
            stroke="var(--bull)"
            strokeWidth={2}
            fill="url(#priceGrad)"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
