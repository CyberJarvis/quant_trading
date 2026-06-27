"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PieChart, LineChart, FlaskConical, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/portfolio",   label: "Portfolio",   icon: PieChart },
  { href: "/research",    label: "Research",    icon: LineChart },
  { href: "/backtest",    label: "Backtest",    icon: FlaskConical },
  { href: "/stress-test", label: "Stress Test", icon: Zap },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside
      className="w-56 min-h-screen flex flex-col border-r"
      style={{
        background:   "linear-gradient(180deg, #0A1525 0%, #060B14 100%)",
        borderColor:  "#1A2B40",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "#1A2B40" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}
          >
            <span className="text-black font-black text-sm">P</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-widest">PRAVAH</p>
            <p className="text-[10px] tracking-widest uppercase" style={{ color: "#475569" }}>
              QuantEdge AI
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                active
                  ? "text-amber-300"
                  : "hover:bg-white/[0.03]"
              )}
              style={active ? { background: "rgba(245,158,11,0.08)" } : {}}
            >
              {/* Active left indicator */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: "#F59E0B" }}
                />
              )}
              <Icon
                size={16}
                style={{ color: active ? "#F59E0B" : "#475569" }}
              />
              <span style={{ color: active ? "#FCD34D" : "#64748B" }}
                className={cn("transition-colors", !active && "hover:text-slate-300")}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "#1A2B40" }}>
        <p className="text-[10px] tracking-wider uppercase" style={{ color: "#334155" }}>
          v1.0 · PS-3 · Ignite Room
        </p>
      </div>
    </aside>
  );
}
