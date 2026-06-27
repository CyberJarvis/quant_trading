"use client";

import { useEffect, useRef } from "react";

export interface MacdPoint {
  date: string;
  macd: number;
  signal: number;
  histogram: number;
}

export default function MacdChart({ data, onChartInit }: { data: MacdPoint[]; onChartInit?: (chart: any) => (() => void) | void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<any>(null);

  useEffect(() => {
    if (!data.length) return;

    let destroyed = false;
    let ro: ResizeObserver | null = null;
    let cleanupSync: (() => void) | void;

    const init = async () => {
      const {
        createChart,
        LineSeries,
        HistogramSeries,
        ColorType,
        LineStyle,
      } = await import("lightweight-charts");

      if (destroyed) return;
      const el = containerRef.current;
      if (!el || !el.isConnected) return;

      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

      const chart = createChart(el, {
        width:  el.clientWidth || el.offsetWidth || 600,
        height: 220,
        layout: {
          background: { type: ColorType.Solid, color: "#111827" },
          textColor:  "#6B7280",
          fontSize:   10,
        },
        grid: {
          vertLines: { color: "#1F2937" },
          horzLines: { color: "#1F2937" },
        },
        rightPriceScale: {
          borderColor:  "#1F2937",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor:    "#1F2937",
          timeVisible:    true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      if (onChartInit && !destroyed) {
        cleanupSync = onChartInit(chart);
      }

      // ── Zero baseline ──────────────────────────────────────────────────
      const zeroLine = chart.addSeries(LineSeries, {
        color:     "#374151",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const validData = data.filter((d) => d.macd != null && d.signal != null && d.histogram != null);

      zeroLine.setData(validData.map((d) => ({ time: d.date as any, value: 0 })));

      // ── Histogram bars — green above zero, red below ───────────────────
      const histSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: "right",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      histSeries.setData(
        validData.map((d, i) => ({
          time:  d.date as any,
          value: d.histogram,
          color: d.histogram >= 0
            ? (d.histogram > (validData[i - 1]?.histogram ?? 0) ? "#10B981" : "#26a069")
            : (d.histogram < (validData[i - 1]?.histogram ?? 0) ? "#EF4444" : "#e05252"),
        }))
      );

      // ── MACD line (blue) ───────────────────────────────────────────────
      const macdLine = chart.addSeries(LineSeries, {
        color:     "#3B82F6",
        lineWidth: 2,
        crosshairMarkerRadius:     4,
        crosshairMarkerBorderWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      macdLine.setData(validData.map((d) => ({ time: d.date as any, value: d.macd })));

      // ── Signal line (orange) ───────────────────────────────────────────
      const signalLine = chart.addSeries(LineSeries, {
        color:     "#F97316",
        lineWidth: 2,
        crosshairMarkerRadius:     4,
        crosshairMarkerBorderWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      signalLine.setData(validData.map((d) => ({ time: d.date as any, value: d.signal })));

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

  const last = data[data.length - 1];
  const bullish = last.macd > last.signal;

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1F2937]">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">MACD (12, 26, 9)</span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-blue-400 inline-block rounded" />
            <span className="text-gray-500">MACD</span>
            <span className="text-blue-400 font-bold">{last.macd.toFixed(3)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-orange-400 inline-block rounded" />
            <span className="text-gray-500">Sig</span>
            <span className="text-orange-400 font-bold">{last.signal.toFixed(3)}</span>
          </span>
          <span className={`font-semibold text-[10px] ${bullish ? "text-emerald-400" : "text-red-400"}`}>
            {bullish ? "▲ BULLISH" : "▼ BEARISH"}
          </span>
        </div>
      </div>
      <div ref={containerRef} style={{ height: 220 }} />
    </div>
  );
}
