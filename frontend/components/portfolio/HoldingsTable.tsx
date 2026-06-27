"use client";

import { X, TrendingUp, TrendingDown, Upload } from "lucide-react";
import type { PortfolioAllocation } from "@/lib/types";
import { formatInr, signalBg } from "@/lib/utils";
import StockAdder from "./StockAdder";

export interface EnrichedAllocation extends PortfolioAllocation {
  current_price?: number | null;
  rsi?: number | null;
  return_1y?: number | null;
  macd_signal?: string | null;
}

interface Props {
  allocations: EnrichedAllocation[];
  onRemove: (symbol: string) => void;
  onAdd: (symbol: string, weight: number) => Promise<void>;
  onImport: () => void;
  budget: number;
}

function ReturnBadge({ v }: { v: number | null | undefined }) {
  if (v == null) return <span className="text-gray-600">—</span>;
  const up = v >= 0;
  return (
    <span className={`flex items-center gap-0.5 font-mono ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? "+" : ""}{v.toFixed(1)}%
    </span>
  );
}

function RsiBadge({ v }: { v: number | null | undefined }) {
  if (v == null) return <span className="text-gray-600">—</span>;
  const color = v > 70 ? "text-red-400" : v < 30 ? "text-emerald-400" : "text-gray-300";
  const label = v > 70 ? "OB" : v < 30 ? "OS" : "";
  return (
    <span className={`font-mono text-xs ${color}`}>
      {v.toFixed(0)}{label && <span className="ml-0.5 text-[9px]">{label}</span>}
    </span>
  );
}

export default function HoldingsTable({ allocations, onRemove, onAdd, onImport, budget }: Props) {
  const totalWeight = allocations.reduce((s, a) => s + a.weight, 0);

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">Holdings</p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {allocations.length} stocks · {totalWeight.toFixed(1)}% allocated · {formatInr(budget)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-400 border border-[#1F2937] hover:border-amber-500/40 hover:text-amber-400 transition-all"
          >
            <Upload size={11} /> Import
          </button>
          <StockAdder existing={allocations.map((a) => a.symbol)} onAdd={onAdd} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1F2937]">
              {["Symbol", "Sector", "Price", "Weight", "Amount", "1Y Return", "RSI", "Signal", "Score", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2937]">
            {allocations.map((a) => (
              <tr key={a.symbol} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 font-mono font-semibold text-amber-400 text-sm whitespace-nowrap">
                  {a.symbol.replace(".NS", "")}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{a.sector || "—"}</td>
                <td className="px-4 py-3 font-mono text-gray-200 text-xs whitespace-nowrap">
                  {a.current_price != null ? `₹${a.current_price.toLocaleString("en-IN")}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1 bg-[#1F2937] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(a.weight, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-gray-200 text-xs">{a.weight.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-300 text-xs whitespace-nowrap">
                  {formatInr(a.amount_inr)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ReturnBadge v={a.return_1y} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RsiBadge v={a.rsi} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${signalBg(a.signal)}`}>
                    {a.signal}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-400 text-xs whitespace-nowrap">
                  {a.score.toFixed(1)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onRemove(a.symbol)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Weight bar summary */}
      <div className="px-4 py-3 border-t border-[#1F2937]">
        <div className="flex h-2 rounded-full overflow-hidden gap-px">
          {allocations.map((a, i) => {
            const COLORS = [
              "#F59E0B","#10B981","#3B82F6","#8B5CF6","#EF4444",
              "#06B6D4","#F97316","#84CC16","#EC4899","#6366F1",
            ];
            return (
              <div
                key={a.symbol}
                title={`${a.symbol.replace(".NS", "")} ${a.weight.toFixed(1)}%`}
                style={{
                  width: `${(a.weight / Math.max(totalWeight, 100)) * 100}%`,
                  backgroundColor: COLORS[i % COLORS.length],
                  minWidth: 2,
                }}
              />
            );
          })}
          {totalWeight < 100 && (
            <div className="flex-1 bg-[#1F2937]" title="Unallocated" />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>Allocated: {totalWeight.toFixed(1)}%</span>
          {totalWeight < 100 && <span className="text-yellow-500">Unallocated: {(100 - totalWeight).toFixed(1)}%</span>}
          {totalWeight > 100 && <span className="text-red-400">Overallocated by {(totalWeight - 100).toFixed(1)}%</span>}
        </div>
      </div>
    </div>
  );
}
