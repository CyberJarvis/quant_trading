"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { MarketIndices } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

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
      <span className="font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-2)" }}>
        {label}
      </span>
      <span className="font-mono font-bold text-xs" style={{ color: valueColor ?? "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {value ?? "—"}
      </span>
      {changePct !== null && changePct !== undefined && (
        <span className={cn(
          "font-mono text-[10px] font-bold",
          pos ? "text-emerald-600" : "text-red-600"
        )}>
          {pos ? "▲" : "▼"}{Math.abs(changePct).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

const Divider = () => (
  <span className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />
);

export default function TopBar() {
  const router = useRouter();
  const [data, setData] = useState<MarketIndices | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('pravah_user');
    localStorage.removeItem('pravah_onboarding_completed');
    router.push('/login');
  };

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const h = ist.getHours(), m = ist.getMinutes(), day = ist.getDay();
      setMarketOpen(day >= 1 && day <= 5 && h * 60 + m >= 555 && h * 60 + m < 930);
    };
    check();

    const load = async () => { try { setData(await api.getIndices()); } catch { } };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="h-12 flex items-center justify-between px-5 border-b shrink-0"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {/* Market status */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-1.5 h-1.5",
            marketOpen ? "bg-emerald-400 animate-pulse-dot" : "bg-slate-600"
          )}
          style={marketOpen ? { boxShadow: "0 0 6px #10B981" } : {}}
        />
        <span className="font-mono text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--muted-2)" }}>
          {marketOpen ? "MARKET LIVE" : "MARKET CLOSED"}
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
          valueColor="var(--amber)"
        />
        {data?.vix.sentiment && (
          <span className="text-[10px] font-medium ml-1" style={{ color: "#64748B" }}>
            {data.vix.sentiment}
          </span>
        )}
        {data?.fii_net_available && data.fii_net !== null && (
          <>
            <Divider />
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted-2)" }}>FII</span>
              <span className={cn(
                "font-mono text-[10px] font-bold",
                (data.fii_net ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {(data.fii_net ?? 0) >= 0 ? "▲" : "▼"}
                ₹{Math.abs(data.fii_net ?? 0).toFixed(0)} Cr
              </span>
            </span>
          </>
        )}
      </div>
      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Sign out"
        className="flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-bold font-mono uppercase transition-colors"
        style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--muted)'; }}
      >
        [ESC] SIGNOUT
      </button>
    </header>
  );
}
