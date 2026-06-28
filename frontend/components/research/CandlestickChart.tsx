"use client";

import { useEffect, useRef } from "react";
import type { Candle } from "@/lib/types";

interface Props {
  candles: Candle[];
  symbol: string;
  livePrice?: number | null;
  liveChange?: number | null;
  liveChangePct?: number | null;
  onChartInit?: (chart: any) => (() => void) | void;
}

export default function CandlestickChart({ candles, symbol, livePrice, liveChangePct, onChartInit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<any>(null);

  useEffect(() => {
    if (!candles.length) return;

    let destroyed = false;
    let ro: ResizeObserver | null = null;
    let cleanupSync: (() => void) | void;

    const init = async () => {
      const {
        createChart,
        CandlestickSeries,
        HistogramSeries,
        ColorType,
        CrosshairMode,
      } = await import("lightweight-charts");

      // Guard: component may have unmounted or effect re-ran during the await
      if (destroyed) return;
      const el = containerRef.current;
      if (!el || !el.isConnected) return;

      // Destroy any previous chart instance
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const chart = createChart(el, {
        width:  el.clientWidth  || el.offsetWidth  || 600,
        height: 380,
        layout: {
          background: { type: ColorType.Solid, color: "#FFFFFF" },
          textColor:  "#475569",
          fontSize:   11,
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
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: "#E2E8F0",
          scaleMargins: { top: 0.08, bottom: 0.28 },
        },
        timeScale: {
          borderColor:    "#E2E8F0",
          timeVisible:    true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      if (onChartInit && !destroyed) {
        cleanupSync = onChartInit(chart);
      }

      // Candlestick series
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor:       "#10B981",
        downColor:     "#EF4444",
        borderVisible: false,
        wickUpColor:   "#10B981",
        wickDownColor: "#EF4444",
      });
      candleSeries.setData(
        candles.map((c) => ({ time: (c.timestamp ?? c.date) as any, open: c.open, high: c.high, low: c.low, close: c.close }))
      );

      // Volume histogram
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat:  { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      volumeSeries.setData(
        candles.map((c) => ({
          time:  (c.timestamp ?? c.date) as any,
          value: c.volume,
          color: c.close >= c.open ? "#10B98133" : "#EF444433",
        }))
      );

      chart.timeScale().fitContent();

      // Responsive resize — safe manual approach instead of autoSize
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
  }, [candles, symbol, onChartInit]);

  if (!candles.length) {
    return (
      <div className="h-[380px] bg-[var(--surface)] border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-xs text-[color:var(--muted-2)] uppercase">Select a stock to view chart</p>
      </div>
    );
  }

  const last      = candles[candles.length - 1];
  const prevClose = candles.length >= 2 ? candles[candles.length - 1].close : null;

  const displayPrice = livePrice ?? last.close;
  const displayChg   = livePrice && prevClose
    ? livePrice - prevClose
    : candles.length >= 2 ? last.close - candles[candles.length - 2].close : 0;
  const displayPct   = prevClose ? (displayChg / prevClose) * 100 : (liveChangePct ?? 0);
  const up           = displayChg >= 0;

  return (
    <div className="bg-[var(--surface)] border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[color:var(--text)]">{symbol.replace(".NS", "")}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--muted-2)]">Candlestick · Volume</span>
          {livePrice && (
            <span className="font-mono text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5">LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-[color:var(--text)] font-semibold text-sm">
            ₹{displayPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </span>
          <span className={up ? "text-emerald-400" : "text-red-400"}>
            {up ? "▲" : "▼"}{Math.abs(displayChg).toFixed(2)} ({displayPct.toFixed(2)}%)
          </span>
          <span className="text-gray-600 hidden md:block text-[10px]">
            H {last.high.toFixed(0)} · L {last.low.toFixed(0)}
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ height: 380 }} />
    </div>
  );
}
