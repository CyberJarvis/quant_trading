import type { StockSignal } from "@/lib/types";
import { signalBg } from "@/lib/utils";

function label(v: string | undefined): string {
  if (!v) return "text-gray-400";
  if (v.includes("BUY") || v.includes("GOLDEN") || v === "OVERSOLD")
    return "text-emerald-400";
  if (v === "BULLISH" || v === "BULLISH CROSSOVER")
    return "text-emerald-400";
  if (v === "RECOVERING")
    return "text-yellow-400";   // momentum turning up but not confirmed bull
  if (v === "WEAKENING")
    return "text-orange-400";   // still positive territory but losing momentum
  if (v.includes("SELL") || v.includes("DEATH") || v.includes("BEARISH") || v === "OVERBOUGHT")
    return "text-red-400";
  if (v === "NEUTRAL") return "text-gray-400";
  return "text-yellow-400";
}

function Row({ k, v, sub, color }: { k: string; v: string; sub?: string; color?: string }) {
  return (
    <div className="py-2 border-b border-[#1F2937] last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{k}</span>
        <span className={`text-[11px] font-semibold ${color ?? "text-gray-300"}`}>{v}</span>
      </div>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5 text-right">{sub}</p>}
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="text-[9px] text-gray-600 uppercase tracking-widest pt-2 pb-1">{title}</p>
  );
}

interface Props {
  signal: StockSignal | null;
  error?: string | null;
}

export default function SignalsPanel({ signal, error }: Props) {
  if (error) {
    return (
      <div className="bg-[#0B1320] border border-[#1A2B40] rounded-xl p-5 h-full flex items-center justify-center">
        <p className="text-red-400 text-sm text-center">{error}</p>
      </div>
    );
  }
  if (!signal || signal.composite_score === undefined) {
    return (
      <div className="bg-[#0B1320] border border-[#1A2B40] rounded-xl p-5 h-full flex items-center justify-center">
        <p className="text-gray-600 text-sm text-center">Select a stock to view signals</p>
      </div>
    );
  }

  const score = signal.composite_score ?? 0;
  const priceDiffSma50  = signal.current_price && signal.sma50  ? ((signal.current_price - signal.sma50)  / signal.sma50  * 100) : null;
  const priceDiffSma200 = signal.current_price && signal.sma200 ? ((signal.current_price - signal.sma200) / signal.sma200 * 100) : null;
  const bbWidth = signal.bb_upper && signal.bb_lower ? ((signal.bb_upper - signal.bb_lower) / signal.bb_middle * 100) : null;
  const bbPos   = signal.current_price && signal.bb_upper && signal.bb_lower
    ? ((signal.current_price - signal.bb_lower) / (signal.bb_upper - signal.bb_lower) * 100)
    : null;

  return (
    <div className="bg-[#0B1320] border border-[#1A2B40] rounded-xl overflow-y-auto h-full">
      {/* Verdict header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1A2B40] text-center">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Composite Signal</p>
        <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${signalBg(signal.verdict)}`}>
          {signal.verdict}
        </span>
        <p className="font-mono font-black text-3xl mt-2 text-gray-100">
          {score.toFixed(1)}<span className="text-xs text-gray-500 font-normal">/10</span>
        </p>
        {/* Score bar */}
        <div className="mt-2 h-1.5 bg-[#1A2B40] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(Math.max(((score + 10) / 20) * 100, 0), 100)}%`,
              backgroundColor: score > 2 ? "#22C55E" : score < -2 ? "#F43F5E" : "#F59E0B",
            }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-gray-700 mt-0.5">
          <span>Bearish −10</span><span>Bullish +10</span>
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* ── Price ─────────────────────────────────────────────────── */}
        <Section title="Price" />
        <Row
          k="LTP"
          v={signal.current_price != null ? `₹${signal.current_price.toLocaleString("en-IN")}` : "—"}
          color="text-amber-400"
        />

        {/* ── RSI ───────────────────────────────────────────────────── */}
        <Section title="RSI (14)" />
        <Row
          k="RSI Value"
          v={signal.rsi != null ? signal.rsi.toFixed(1) : "—"}
          color={signal.rsi > 70 ? "text-red-400" : signal.rsi < 30 ? "text-emerald-400" : "text-gray-200"}
        />
        <Row k="Signal" v={signal.rsi_signal ?? "—"} color={label(signal.rsi_signal)} />

        {/* ── MACD ──────────────────────────────────────────────────── */}
        <Section title="MACD (12, 26, 9)" />
        <Row
          k="MACD Line"
          v={signal.macd_line != null ? signal.macd_line.toFixed(3) : "—"}
          color={signal.macd_line > 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row
          k="Signal Line"
          v={signal.macd_signal_line != null ? signal.macd_signal_line.toFixed(3) : "—"}
          color="text-orange-400"
        />
        <Row
          k="Histogram"
          v={signal.macd_histogram != null ? signal.macd_histogram.toFixed(3) : "—"}
          color={signal.macd_histogram > 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row k="Signal" v={signal.macd_signal ?? "—"} color={label(signal.macd_signal)} />

        {/* ── Moving Averages ───────────────────────────────────────── */}
        <Section title="Moving Averages" />
        <Row
          k="SMA 50"
          v={signal.sma50 != null ? `₹${signal.sma50.toLocaleString("en-IN")}` : "—"}
          sub={priceDiffSma50 != null ? `Price ${priceDiffSma50 >= 0 ? "+" : ""}${priceDiffSma50.toFixed(1)}% vs SMA50` : undefined}
          color={priceDiffSma50 != null && priceDiffSma50 >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row
          k="SMA 200"
          v={signal.sma200 != null ? `₹${signal.sma200.toLocaleString("en-IN")}` : "—"}
          sub={priceDiffSma200 != null ? `Price ${priceDiffSma200 >= 0 ? "+" : ""}${priceDiffSma200.toFixed(1)}% vs SMA200` : undefined}
          color={priceDiffSma200 != null && priceDiffSma200 >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <Row k="Trend" v={signal.trend_signal ?? "—"} color={label(signal.trend_signal)} />

        {/* ── Bollinger Bands ───────────────────────────────────────── */}
        <Section title="Bollinger Bands (20, 2)" />
        <Row k="Upper Band" v={signal.bb_upper != null ? `₹${signal.bb_upper.toLocaleString("en-IN")}` : "—"} color="text-red-300" />
        <Row k="Middle (SMA20)" v={signal.bb_middle != null ? `₹${signal.bb_middle.toLocaleString("en-IN")}` : "—"} color="text-gray-300" />
        <Row k="Lower Band" v={signal.bb_lower != null ? `₹${signal.bb_lower.toLocaleString("en-IN")}` : "—"} color="text-emerald-300" />
        {bbWidth != null && (
          <Row k="Band Width" v={`${bbWidth.toFixed(1)}%`} color="text-gray-400"
            sub={bbPos != null ? `Price at ${bbPos.toFixed(0)}% of band` : undefined}
          />
        )}
        <Row k="Signal" v={signal.bb_signal ?? "—"} color={label(signal.bb_signal)} />
      </div>
    </div>
  );
}
