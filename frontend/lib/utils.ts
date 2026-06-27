import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Signal, Regime } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInr(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000)    return `₹${(value / 100_000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

export function signalColor(signal: Signal): string {
  switch (signal) {
    case "STRONG BUY": return "text-emerald-400";
    case "BUY":        return "text-emerald-300";
    case "HOLD":       return "text-yellow-400";
    case "SELL":       return "text-red-300";
    case "STRONG SELL":return "text-red-400";
    default:           return "text-gray-400";
  }
}

export function signalBg(signal: Signal): string {
  switch (signal) {
    case "STRONG BUY": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "BUY":        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "HOLD":       return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "SELL":       return "bg-red-500/10 text-red-300 border-red-500/20";
    case "STRONG SELL":return "bg-red-500/20 text-red-400 border-red-500/30";
    default:           return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

export function regimeBg(regime: Regime): string {
  switch (regime) {
    case "BULL":     return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "BEAR":     return "bg-red-500/20 text-red-400 border-red-500/30";
    case "SIDEWAYS": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  }
}

export function regimeColor(regime: Regime): string {
  switch (regime) {
    case "BULL":     return "#10B981";
    case "BEAR":     return "#EF4444";
    case "SIDEWAYS": return "#F59E0B";
  }
}
