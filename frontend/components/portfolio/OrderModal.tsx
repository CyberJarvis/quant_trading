"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { api, type OrderResult } from "@/lib/api";

interface Props {
  symbol: string;
  displaySymbol: string;
  currentPrice: number;
  suggestedQty?: number;
  defaultSide?: "BUY" | "SELL";
  onClose: () => void;
}

function formatINR(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000)   return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000)     return `₹${(val / 1000).toFixed(2)}K`;
  return `₹${val.toFixed(2)}`;
}

export default function OrderModal({ symbol, displaySymbol, currentPrice, suggestedQty = 1, defaultSide = "BUY", onClose }: Props) {
  const [side,    setSide]    = useState<"BUY" | "SELL">(defaultSide);
  const [qty,     setQty]     = useState(suggestedQty);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<OrderResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const totalValue = qty * currentPrice;
  const isBuy = side === "BUY";

  const handleSubmit = async () => {
    if (qty <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.placeOrder({
        symbol, display_symbol: displaySymbol,
        qty, price: currentPrice, transaction_type: side,
      });
      setResult(res);
    } catch {
      setError("Order failed. Backend may be unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm bg-[var(--surface)] border shadow-2xl" style={{ borderColor: "var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <p className="font-mono text-xs font-bold text-text uppercase">{displaySymbol}</p>
            <p className="font-mono text-[9px] text-[color:var(--muted-2)] mt-0.5 uppercase">NSE · DELIVERY</p>
          </div>
          <button onClick={onClose} className="text-[color:var(--muted-2)] hover:text-text transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {result ? (
          /* ── Success state ── */
          <div className="p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 border flex items-center justify-center" style={{ borderColor: "var(--bull-border)", backgroundColor: "var(--bull-dim)" }}>
              <CheckCircle size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase text-text">Order Executed</p>
              <p className="font-mono text-[9px] text-[color:var(--muted-2)] uppercase mt-1">Mock · simulated execution</p>
            </div>

            <div className="w-full bg-[var(--surface-hover)] border p-4 space-y-2.5 text-left" style={{ borderColor: "var(--border)" }}>
              {[
                ["Order ID",    result.order_id],
                ["Symbol",      result.display_symbol],
                ["Side",        result.transaction_type],
                ["Qty",         result.qty.toString()],
                ["Exec Price",  `₹${result.executed_price.toLocaleString("en-IN")}`],
                ["Total",       formatINR(result.total_value)],
                ["Status",      result.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between font-mono text-[10px] uppercase">
                  <span className="text-[color:var(--muted-2)]">{label}</span>
                  <span className={`font-bold ${label === "Side" ? (value === "BUY" ? "text-emerald-500" : "text-red-500") : label === "Status" ? "text-emerald-500" : "text-text"}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 border font-mono text-xs uppercase font-bold bg-[var(--surface)] hover:bg-[var(--surface)]-hover text-text transition-colors cursor-pointer"
              style={{ borderColor: "var(--border)" }}
            >
              Close Dialog
            </button>
          </div>
        ) : (
          /* ── Order form ── */
          <div className="p-5 space-y-4">
            {/* Buy / Sell toggle */}
            <div className="flex border" style={{ borderColor: "var(--border)" }}>
              {(["BUY", "SELL"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className="flex-1 py-2 text-xs font-mono uppercase font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    backgroundColor: side === s ? (s === "BUY" ? "var(--bull-dim)" : "var(--bear-dim)") : "transparent",
                    color: side === s ? (s === "BUY" ? "var(--bull)" : "var(--bear)") : "var(--muted)",
                    borderBottom: side === s ? `2px solid ${s === "BUY" ? "var(--bull)" : "var(--bear)"}` : "2px solid transparent",
                  }}
                >
                  {s === "BUY" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {s}
                </button>
              ))}
            </div>

            {/* Price (read-only) */}
            <div className="bg-[var(--surface-hover)] border px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <p className="font-mono text-[9px] text-[color:var(--muted-2)] uppercase tracking-wider mb-1">Market Price</p>
              <p className="font-mono text-base font-bold text-text">
                ₹{currentPrice.toLocaleString("en-IN")}
              </p>
            </div>

            {/* Qty */}
            <div className="bg-[var(--surface-hover)] border px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <p className="font-mono text-[9px] text-[color:var(--muted-2)] uppercase tracking-wider mb-2">Quantity</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-8 h-8 border bg-[var(--surface)] text-text hover:bg-[var(--surface)]-hover transition-colors font-mono font-bold cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >−</button>
                <input aria-label="Input field"
                  type="number" min={1} value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 bg-transparent text-center text-lg font-mono font-bold text-text outline-none"
                />
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-8 h-8 border bg-[var(--surface)] text-text hover:bg-[var(--surface)]-hover transition-colors font-mono font-bold cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >+</button>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between px-1 font-mono text-[10px] uppercase">
              <span className="text-[color:var(--muted-2)]">Estimated Total</span>
              <span className="font-bold text-text">{formatINR(totalValue)}</span>
            </div>

            {/* Mock disclaimer */}
            <div className="flex items-center gap-2 bg-amber-glow border px-3 py-2" style={{ borderColor: "var(--amber-border)" }}>
              <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
              <p className="font-mono text-[9px] text-amber uppercase">Demo mode — mock order simulation</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/5 border px-3 py-2" style={{ borderColor: "var(--bear-border)" }}>
                <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                <p className="font-mono text-[9px] text-red-600 uppercase">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || qty <= 0}
              className="w-full py-2.5 border font-mono text-xs uppercase font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              style={{
                backgroundColor: isBuy ? "var(--bull)" : "var(--bear)",
                borderColor: isBuy ? "var(--bull)" : "var(--bear)",
                color: "#fff",
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : (isBuy ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
              {loading ? "Placing…" : `${side} ${qty} × ${displaySymbol.replace(".NS", "")}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
