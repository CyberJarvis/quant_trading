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
  pred_realist?: number | null;
  cqr_abstain?: boolean | null;
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
    <div className="bg-surface border" style={{ borderColor: "var(--border)" }}>
      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-text">Holdings</p>
          <p className="font-mono text-[10px] text-gray-500 mt-0.5 uppercase">
            {allocations.length} stocks · {totalWeight.toFixed(1)}% allocated · {formatInr(budget)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onImport}
            className="flex items-center gap-1.5 px-3 py-1.5 border font-mono text-[10px] uppercase font-bold text-gray-500 hover:text-text cursor-pointer transition-colors"
            style={{ borderColor: "var(--border)" }}
          >
            <Upload size={11} /> Import
          </button>
          <StockAdder existing={allocations.map((a) => a.symbol)} onAdd={onAdd} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              {["Symbol", "Sector", "Price", "Weight", "Amount", "1Y Return", "RSI", "Signal", "Score", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
            {allocations.map((a) => (
              <tr key={a.symbol} className="hover:bg-surface-hover transition-colors group">
                <td className="px-4 py-3 font-mono font-bold text-amber text-xs whitespace-nowrap">
                  {a.symbol.replace(".NS", "")}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-gray-500 uppercase whitespace-nowrap">{a.sector || "—"}</td>
                <td className="px-4 py-3 font-mono text-text text-xs whitespace-nowrap">
                  {a.current_price != null ? `₹${a.current_price.toLocaleString("en-IN")}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-border-2 overflow-hidden">
                      <div
                        className="h-full bg-amber"
                        style={{ width: `${Math.min(a.weight, 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-text-2 text-xs">{a.weight.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-text-2 text-xs whitespace-nowrap">
                  {formatInr(a.amount_inr)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <ReturnBadge v={a.return_1y} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <RsiBadge v={a.rsi} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`font-mono text-[9px] font-bold uppercase px-2 py-0.5 border ${signalBg(a.signal)}`}>
                    {a.signal}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-500 text-xs whitespace-nowrap">
                  {a.score.toFixed(1)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onRemove(a.symbol)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
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
      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex h-2 overflow-hidden gap-px">
          {allocations.map((a, i) => {
            const COLORS = [
              "#F59E0B","#10B981","#3B82F6","#2563EB","#EF4444",
              "#06B6D4","#F97316","#84CC16","#EC4899","#0D9488",
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
            <div className="flex-1 bg-border-2" title="Unallocated" />
          )}
        </div>
        <div className="flex justify-between font-mono text-[9px] text-gray-500 mt-1 uppercase">
          <span>Allocated: {totalWeight.toFixed(1)}%</span>
          {totalWeight < 100 && <span className="text-amber">Unallocated: {(100 - totalWeight).toFixed(1)}%</span>}
          {totalWeight > 100 && <span className="text-red-500 font-bold">Overallocated by {(totalWeight - 100).toFixed(1)}%</span>}
        </div>
      </div>
    </div>
  );
}
