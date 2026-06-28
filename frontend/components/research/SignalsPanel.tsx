import type { StockSignal, PredictionInterval } from "@/lib/types";
import { signalBg } from "@/lib/utils";

function label(v: string | undefined): string {
  if (!v) return "text-[color:var(--muted)]";
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
  if (v === "NEUTRAL") return "text-[color:var(--muted)]";
  return "text-yellow-400";
}

function Row({ k, v, sub, color }: { k: string; v: string; sub?: string; color?: string }) {
  return (
    <div className="py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between font-mono text-[10px]">
        <span style={{ color: "var(--muted)" }}>{k}</span>
        <span className={`font-bold ${color ?? "text-[color:var(--muted)]"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>
      </div>
      {sub && <p className="font-mono text-[8px] mt-0.5 text-right uppercase" style={{ color: "var(--muted-2)" }}>{sub}</p>}
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="font-mono text-[9px] font-bold uppercase tracking-widest pt-2 pb-1" style={{ color: "var(--muted)" }}>{title}</p>
  );
}

interface Props {
  signal: StockSignal | null;
  error?: string | null;
}

export default function SignalsPanel({ signal, error }: Props) {
  if (error) {
    return (
      <div className="bg-[var(--surface)] border p-5 h-full flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-red-400 text-xs text-center">{error}</p>
      </div>
    );
  }
  if (!signal || signal.composite_score === undefined) {
    return (
      <div className="bg-[var(--surface)] border p-5 h-full flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-[color:var(--muted-2)] text-xs text-center uppercase">Select stock to view signal</p>
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
    <div className="bg-[var(--surface)] border overflow-y-auto h-full" style={{ borderColor: "var(--border)" }}>
      {/* Verdict header */}
      <div className="px-4 pt-4 pb-3 border-b text-center" style={{ borderColor: "var(--border)" }}>
        <p className="font-mono text-[9px] text-[color:var(--muted-2)] uppercase tracking-widest mb-2">Composite Signal</p>
        <span className={`font-mono text-[10px] font-bold px-2.5 py-1 border ${signalBg(signal.verdict)}`}>
          {signal.verdict}
        </span>
        <p className="font-mono font-bold text-2xl mt-3 text-[color:var(--text)]">
          {score.toFixed(1)}<span className="text-xs text-[color:var(--muted-2)] font-normal">/10</span>
        </p>
        {/* Score bar */}
        <div className="mt-2.5 h-1.5 bg-border overflow-hidden">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${Math.min(Math.max(((score + 10) / 20) * 100, 0), 100)}%`,
              backgroundColor: score > 2 ? "var(--bull)" : score < -2 ? "var(--bear)" : "var(--amber)",
            }}
          />
        </div>
        <div className="flex justify-between font-mono text-[8px] text-gray-600 mt-1 uppercase">
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
          color={signal.rsi > 70 ? "text-red-400" : signal.rsi < 30 ? "text-emerald-400" : "text-[color:var(--text)]"}
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
        <Row k="Middle (SMA20)" v={signal.bb_middle != null ? `₹${signal.bb_middle.toLocaleString("en-IN")}` : "—"} color="text-[color:var(--muted)]" />
        <Row k="Lower Band" v={signal.bb_lower != null ? `₹${signal.bb_lower.toLocaleString("en-IN")}` : "—"} color="text-emerald-300" />
        {bbWidth != null && (
          <Row k="Band Width" v={`${bbWidth.toFixed(1)}%`} color="text-[color:var(--muted)]"
            sub={bbPos != null ? `Price at ${bbPos.toFixed(0)}% of band` : undefined}
          />
        )}
        <Row k="Signal" v={signal.bb_signal ?? "—"} color={label(signal.bb_signal)} />

        {/* ── CQR Prediction Interval ───────────────────────────── */}
        {signal.prediction_interval !== undefined && (
          <>
            <Section title="CQR Prediction · 5D Return" />
            <CQRBlock pi={signal.prediction_interval} />
          </>
        )}
      </div>
    </div>
  );
}

function CQRBlock({ pi }: { pi: PredictionInterval | null | undefined }) {
  if (!pi) {
    return (
      <div className="py-2 font-mono text-[9px] text-[color:var(--muted-2)] uppercase text-center">
        Insufficient data for CQR
      </div>
    );
  }

  if (pi.abstain) {
    return (
      <div className="py-2 px-3 border border-red-500/40 bg-red-500/5 mt-1">
        <p className="font-mono text-[9px] font-bold text-red-400 uppercase tracking-wider">
          ⚠ Abstain — Interval Too Wide
        </p>
        <p className="font-mono text-[8px] text-red-400/70 mt-0.5">
          Width {pi.width.toFixed(1)}% · Model recommends no trade
        </p>
      </div>
    );
  }

  // Normalise range to [0, 100] for the position bar
  const range = pi.upper_pct - pi.lower_pct;
  const medPos = range > 0 ? ((pi.pred_realist - pi.lower_pct) / range) * 100 : 50;
  const medColor = pi.pred_realist >= 0 ? "var(--bull)" : "var(--bear)";

  return (
    <div className="pt-1 pb-2 space-y-2">
      {/* Three-value row */}
      <div className="grid grid-cols-3 text-center">
        <div>
          <p className="font-mono text-[8px] text-[color:var(--muted-2)] uppercase">Lower</p>
          <p className={`font-mono text-[11px] font-bold ${pi.lower_pct < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {pi.lower_pct >= 0 ? "+" : ""}{pi.lower_pct.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="font-mono text-[8px] text-[color:var(--muted-2)] uppercase">Realist</p>
          <p className={`font-mono text-[11px] font-bold ${pi.pred_realist >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {pi.pred_realist >= 0 ? "+" : ""}{pi.pred_realist.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="font-mono text-[8px] text-[color:var(--muted-2)] uppercase">Upper</p>
          <p className={`font-mono text-[11px] font-bold ${pi.upper_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {pi.upper_pct >= 0 ? "+" : ""}{pi.upper_pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Range bar */}
      <div className="relative h-1.5 bg-border overflow-visible mx-1">
        <div className="absolute inset-0 bg-blue-500/20" />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3"
          style={{ left: `${Math.max(0, Math.min(100, medPos))}%`, backgroundColor: medColor }}
        />
      </div>

      {/* Meta */}
      <div className="flex justify-between font-mono text-[8px] text-gray-600 uppercase px-1">
        <span>Width {pi.width.toFixed(1)}%</span>
        <span>{(pi.confidence * 100).toFixed(0)}% Conf</span>
      </div>
    </div>
  );
}
