"use client";

import { useEffect, useRef } from "react";

interface RsiPoint { date: string; rsi: number; timestamp?: number }

export default function RsiChart({ data, onChartInit }: { data: RsiPoint[]; onChartInit?: (chart: any) => (() => void) | void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<any>(null);

  useEffect(() => {
    if (!data.length) return;

    let destroyed = false;
    let ro: ResizeObserver | null = null;
    let cleanupSync: (() => void) | void;

    const init = async () => {
      const { createChart, LineSeries, ColorType, LineStyle } = await import("lightweight-charts");

      if (destroyed) return;
      const el = containerRef.current;
      if (!el || !el.isConnected) return;

      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const chart = createChart(el, {
        width:  el.clientWidth || el.offsetWidth || 600,
        height: 220,
        layout: {
          background: { type: ColorType.Solid, color: "#FFFFFF" },
          textColor:  "#475569",
          fontSize:   10,
        },
        localization: {
          timeFormatter: (t: any) => {
            if (typeof t === "number") {
              const d = new Date(t * 1000);
              const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
              const hh = String(d.getHours()).padStart(2,"0");
              const mm = String(d.getMinutes()).padStart(2,"0");
              return `${d.getDate()} ${mo} ${d.getFullYear()} ${hh}:${mm}`;
            }
            const bd = t as { year: number; month: number; day: number };
            const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][bd.month - 1];
            return `${bd.day} ${mo} ${bd.year}`;
          },
        },
        grid: {
          vertLines: { color: "#F1F5F9" },
          horzLines: { color: "#F1F5F9" },
        },
        rightPriceScale: {
          borderColor: "#E2E8F0",
          scaleMargins: { top: 0.05, bottom: 0.05 },
        },
        timeScale: {
          borderColor:    "#E2E8F0",
          timeVisible:    true,
          secondsVisible: false,
        },
        crosshair: { horzLine: { visible: true }, vertLine: { visible: true } },
      });

      chartRef.current = chart;

      if (onChartInit && !destroyed) {
        cleanupSync = onChartInit(chart);
      }

      const times = data.map((d) => (d.timestamp ?? d.date) as any);

      // ── overbought fill zone (70–100) via area trick: top reference line ──
      const zone70 = chart.addSeries(LineSeries, {
        color:     "#EF444430",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      zone70.setData(times.map((t) => ({ time: t, value: 70 })));

      // ── oversold fill zone (0–30) ──────────────────────────────────────
      const zone30 = chart.addSeries(LineSeries, {
        color:     "#10B98130",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      zone30.setData(times.map((t) => ({ time: t, value: 30 })));

      // ── midline ────────────────────────────────────────────────────────
      const zone50 = chart.addSeries(LineSeries, {
        color:     "#374151",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      zone50.setData(times.map((t) => ({ time: t, value: 50 })));

      // ── RSI line ───────────────────────────────────────────────────────
      const rsiSeries = chart.addSeries(LineSeries, {
        color:     "#3B82F6",
        lineWidth: 2,
        crosshairMarkerRadius:  4,
        crosshairMarkerBorderWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      rsiSeries.setData(data.filter((d) => d.rsi != null).map((d) => ({ time: (d.timestamp ?? d.date) as any, value: d.rsi })));

      chart.priceScale("right").applyOptions({ autoScale: false, minimum: 0, maximum: 100 } as any);
      chart.timeScale().fitContent();

      ro = new ResizeObserver((entries) => {
        if (!chartRef.current || destroyed) return;
        const w = entries[0]?.contentRect?.width;
        if (w) chartRef.current.applyOptions({ width: w });
      });
      ro.observe(el);
    };

    init().catch(console.error);

    return () => {
      destroyed = true;
      ro?.disconnect();
      if (cleanupSync) {
        try {
          cleanupSync();
        } catch (e) {}
      }
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [data, onChartInit]);

  if (!data.length) return null;

  const latest = data[data.length - 1];
  const rsiVal = latest?.rsi ?? null;
  const rsiColor = rsiVal != null ? (rsiVal > 70 ? "var(--bear)" : rsiVal < 30 ? "var(--bull)" : "var(--sideways)") : "var(--muted)";
  const rsiLabel = rsiVal != null ? (rsiVal > 70 ? "Overbought" : rsiVal < 30 ? "Oversold" : "Neutral") : "N/A";

  return (
    <div className="bg-surface border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="font-mono text-[9px] font-bold text-gray-400 uppercase tracking-widest">RSI (14)</span>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span style={{ color: rsiColor }} className="font-bold">{rsiVal != null ? rsiVal.toFixed(1) : "—"}</span>
          <span className="text-[9px] uppercase font-bold" style={{ color: rsiColor }}>{rsiLabel}</span>
          <span className="text-gray-600 text-[10px]">
            · 30 <span style={{ color: "var(--bull)" }}>OS</span> · 70 <span style={{ color: "var(--bear)" }}>OB</span>
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ height: 220 }} />
    </div>
  );
}
