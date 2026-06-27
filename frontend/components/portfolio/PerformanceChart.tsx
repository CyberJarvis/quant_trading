"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from "recharts";

export interface StockSeries {
  symbol: string;
  candles: { date: string; close: number }[];
}

const PALETTE = [
  "#F59E0B","#10B981","#3B82F6","#2563EB","#EF4444",
  "#06B6D4","#F97316","#84CC16","#EC4899","#6366F1",
  "#14B8A6","#FB923C","#0D9488","#22D3EE","#4ADE80",
];

function normalize(candles: { date: string; close: number }[]) {
  if (!candles.length) return [] as { date: string; val: number }[];
  const base = candles[0].close;
  return candles.map((c) => ({ date: c.date, val: parseFloat(((c.close / base) * 100).toFixed(2)) }));
}

function buildChartData(series: StockSeries[]) {
  if (!series.length) return [];

  // Merge all dates from all series
  const dateMap: Record<string, Record<string, number>> = {};
  for (const s of series) {
    const norm = normalize(s.candles);
    for (const p of norm) {
      if (!dateMap[p.date]) dateMap[p.date] = {};
      dateMap[p.date][s.symbol] = p.val;
    }
  }

  const rows = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  // Sample to max 120 points for performance
  if (rows.length > 120) {
    const step = Math.ceil(rows.length / 120);
    return rows.filter((_, i) => i % step === 0 || i === rows.length - 1);
  }
  return rows;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border px-3 py-2 text-xs space-y-1 min-w-[140px]" style={{ borderColor: "var(--border)" }}>
      <p className="font-mono text-gray-500 mb-1.5">{label}</p>
      {payload.map((p: any) => {
        const chg = p.value - 100;
        return (
          <div key={p.dataKey} className="flex justify-between gap-4 font-mono">
            <span style={{ color: p.color }}>{p.dataKey.replace(".NS", "")}</span>
            <span className={`font-bold ${chg >= 0 ? "text-emerald-600" : "text-red-650"}`}>
              {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
};

interface Props {
  series: StockSeries[];
  benchmarkSeries?: StockSeries | null;
  loading?: boolean;
}

export default function PerformanceChart({ series, benchmarkSeries, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-surface border p-5" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wider">Performance Comparison</p>
        <div className="h-64 animate-pulse bg-surface-2 flex items-center justify-center">
          <p className="font-mono text-gray-500 text-[10px] uppercase">Loading chart data…</p>
        </div>
      </div>
    );
  }

  const allSeries = [
    ...series,
    ...(benchmarkSeries ? [{ ...benchmarkSeries, symbol: "NIFTY50" }] : []),
  ];

  const data = buildChartData(allSeries);
  if (!data.length) return null;

  return (
    <div className="bg-surface border p-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] font-bold text-gray-400 uppercase tracking-wider">Performance Comparison</p>
          <p className="font-mono text-[9px] text-gray-500 mt-0.5 uppercase">Normalized to 100 · 1-year trailing returns</p>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-gray-500 font-mono bg-surface-2 px-2 py-1 uppercase">
          Base 100
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(d) => d.slice(5)}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "monospace" }}
            width={42}
            tickFormatter={(v) => `${(v - 100).toFixed(0)}%`}
          />
          <ReferenceLine y={100} stroke="var(--muted-2)" strokeDasharray="4 4" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(v) => <span className="font-mono text-[10px] font-bold uppercase" style={{ color: "var(--muted)" }}>{v === "NIFTY50" ? "NIFTY 50" : v.replace(".NS", "")}</span>}
            wrapperStyle={{ fontSize: 10, color: "var(--muted)" }}
          />
          {series.map((s, i) => (
            <Line
              key={s.symbol}
              type="monotone"
              dataKey={s.symbol}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}
          {benchmarkSeries && (
            <Line
              type="monotone"
              dataKey="NIFTY50"
              stroke="#6B7280"
              strokeWidth={1}
              strokeDasharray="5 3"
              dot={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
