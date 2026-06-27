"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { MarketIndices } from "@/lib/types";
import { cn } from "@/lib/utils";

function Ticker({
  label,
  value,
  change,
  changePct,
  valueColor,
}: {
  label: string;
  value: string | null;
  change?: number | null;
  changePct?: number | null;
  valueColor?: string;
}) {
  const pos = (changePct ?? change ?? 0) >= 0;
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium tracking-wider" style={{ color: "#475569" }}>
        {label}
      </span>
      <span className="font-mono font-bold text-sm" style={{ color: valueColor ?? "#E2E8F0" }}>
        {value ?? "—"}
      </span>
      {changePct !== null && changePct !== undefined && (
        <span className={cn(
          "font-mono text-[11px] font-semibold",
          pos ? "text-emerald-400" : "text-rose-400"
        )}>
          {pos ? "+" : ""}{changePct.toFixed(2)}%
        </span>
      )}
    </span>
  );
}

const Divider = () => (
  <span className="w-px h-4 mx-1" style={{ background: "#1A2B40" }} />
);

export default function TopBar() {
  const [data, setData]       = useState<MarketIndices | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const h = ist.getHours(), m = ist.getMinutes(), day = ist.getDay();
      setMarketOpen(day >= 1 && day <= 5 && h * 60 + m >= 555 && h * 60 + m < 930);
    };
    check();

    const load = async () => { try { setData(await api.getIndices()); } catch {} };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="h-12 flex items-center justify-between px-5 border-b shrink-0"
      style={{ background: "#060B14", borderColor: "#1A2B40" }}
    >
      {/* Market status */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            marketOpen ? "bg-emerald-400 animate-pulse-dot" : "bg-slate-600"
          )}
          style={marketOpen ? { boxShadow: "0 0 6px #22C55E" } : {}}
        />
        <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: "#475569" }}>
          {marketOpen ? "Market Open" : "Market Closed"}
        </span>
      </div>

      {/* Tickers */}
      <div className="flex items-center gap-0.5">
        <Ticker
          label="NIFTY 50"
          value={data?.nifty50.value?.toLocaleString("en-IN") ?? null}
          changePct={data?.nifty50.change_pct ?? null}
        />
        <Divider />
        <Ticker
          label="SENSEX"
          value={data?.sensex.value?.toLocaleString("en-IN") ?? null}
          changePct={data?.sensex.change_pct ?? null}
        />
        <Divider />
        <Ticker
          label="BANK NIFTY"
          value={data?.banknifty.value?.toLocaleString("en-IN") ?? null}
          changePct={data?.banknifty.change_pct ?? null}
        />
        <Divider />
        <Ticker
          label="VIX"
          value={data?.vix.value?.toFixed(1) ?? null}
          valueColor="#F59E0B"
        />
        {data?.vix.sentiment && (
          <span className="text-[10px] font-medium ml-1" style={{ color: "#64748B" }}>
            {data.vix.sentiment}
          </span>
        )}
        {data?.fii_net_available && data.fii_net !== null && (
          <>
            <Divider />
            <span className="flex items-center gap-1">
              <span className="text-[11px] tracking-wider font-medium" style={{ color: "#475569" }}>FII</span>
              <span className={cn(
                "font-mono text-[11px] font-semibold",
                (data.fii_net ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {(data.fii_net ?? 0) >= 0 ? "▲" : "▼"}
                ₹{Math.abs(data.fii_net ?? 0).toFixed(0)} Cr
              </span>
            </span>
          </>
        )}
      </div>
    </header>
  );
}
