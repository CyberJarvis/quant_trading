"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { NewsItem, ImpactDirection, NewsCategory } from "@/lib/types";
import { RefreshCw, ExternalLink, TrendingUp, TrendingDown, Minus, Radio } from "lucide-react";

// ─── Category display metadata ────────────────────────────────────────────────

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  RBI_POLICY:      "RBI",
  GEOPOLITICAL:    "GEO",
  BUDGET_FISCAL:   "BUDGET",
  FII_DII:         "FII/DII",
  EARNINGS:        "EARNINGS",
  SECTOR_SPECIFIC: "SECTOR",
  GLOBAL_MACRO:    "MACRO",
  CURRENCY:        "FX",
  GENERAL:         "MARKET",
};

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  RBI_POLICY:      "bg-blue-50 text-blue-700 border-blue-200",
  GEOPOLITICAL:    "bg-red-50 text-red-700 border-red-200",
  BUDGET_FISCAL:   "bg-amber-50 text-amber-700 border-amber-200",
  FII_DII:         "bg-teal-50 text-teal-700 border-teal-200",
  EARNINGS:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  SECTOR_SPECIFIC: "bg-cyan-50 text-cyan-700 border-cyan-200",
  GLOBAL_MACRO:    "bg-orange-50 text-orange-700 border-orange-200",
  CURRENCY:        "bg-indigo-50 text-indigo-700 border-indigo-200",
  GENERAL:         "bg-gray-50 text-gray-600 border-gray-200",
};

// ─── Impact indicator ─────────────────────────────────────────────────────────

function ImpactIcon({ direction, score }: { direction: ImpactDirection; score: number }) {
  const abs = Math.abs(score);
  const strong = abs >= 0.5;

  if (direction === "BULLISH") {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 border ${
          strong ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-emerald-50/50 text-emerald-600 border-emerald-200"
        }`}
      >
        <TrendingUp size={10} /> {strong ? "STRONG BUY" : "BULLISH"}
      </span>
    );
  }
  if (direction === "BEARISH") {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 border ${
          strong ? "bg-red-50 text-red-700 border-red-300" : "bg-red-50/50 text-red-600 border-red-200"
        }`}
      >
        <TrendingDown size={10} /> {strong ? "STRONG BEAR" : "BEARISH"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 border bg-gray-50 text-[color:var(--muted-2)] border-gray-200">
      <Minus size={10} /> NEUTRAL
    </span>
  );
}

// ─── Single news card ─────────────────────────────────────────────────────────

function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);

  const borderAccent =
    item.impact_direction === "BULLISH"
      ? "border-l-emerald-400"
      : item.impact_direction === "BEARISH"
      ? "border-l-red-400"
      : "border-l-gray-300";

  return (
    <div
      className={`border border-l-2 ${borderAccent} cursor-pointer transition-colors hover:bg-[var(--surface)]-hover`}
      style={{ borderColor: "var(--border)", borderLeftColor: undefined }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            {/* Category badge */}
            <span
              className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 border ${CATEGORY_COLORS[item.category]}`}
            >
              {CATEGORY_LABELS[item.category]}
            </span>
            {/* Impact */}
            <ImpactIcon direction={item.impact_direction} score={item.impact_score} />
            {/* Source + time */}
            <span className="font-mono text-[9px] text-[color:var(--muted)] ml-auto">
              {item.source}
            </span>
          </div>

          {/* Headline */}
          <p className="font-mono text-[11.5px] font-semibold leading-snug" style={{ color: "var(--text)" }}>
            {item.title}
          </p>

          {/* AI summary (always visible) */}
          {item.summary && item.summary !== item.title && (
            <p className="font-mono text-[10px] mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
              → {item.summary}
            </p>
          )}
        </div>

        {/* Score bar */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-1">
          <div className="w-1 h-12 bg-gray-100 border border-gray-200 relative overflow-hidden">
            {item.impact_score !== 0 && (
              <div
                className={`absolute w-full transition-all ${
                  item.impact_score > 0 ? "bg-emerald-400 bottom-1/2" : "bg-red-400 top-1/2"
                }`}
                style={{ height: `${Math.abs(item.impact_score) * 50}%` }}
              />
            )}
          </div>
          <span className="font-mono text-[9px] font-bold" style={{
            color: item.impact_score > 0.1 ? "var(--bull)" : item.impact_score < -0.1 ? "var(--bear)" : "var(--muted)"
          }}>
            {item.impact_score > 0 ? "+" : ""}{item.impact_score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Expanded: affected sectors + link */}
      {expanded && (
        <div
          className="px-3 pb-2.5 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          {item.affected_sectors.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
                Affected:
              </span>
              {item.affected_sectors.map((s) => (
                <span
                  key={s}
                  className="font-mono text-[9px] uppercase px-1.5 py-0.5 border"
                  style={{ borderColor: "var(--border-2)", color: "var(--muted)", background: "var(--bg-2)" }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 font-mono text-[9px] uppercase tracking-wider hover:underline"
              style={{ color: "var(--amber)" }}
              onClick={(e) => e.stopPropagation()}
            >
              Read Full Article <ExternalLink size={9} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type DirectionFilter = "ALL" | ImpactDirection;
const DIRECTION_FILTERS: DirectionFilter[] = ["ALL", "BULLISH", "BEARISH", "NEUTRAL"];

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewsIntelligence({ compact = false }: { compact?: boolean }) {
  const [items, setItems]       = useState<NewsItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filter, setFilter]     = useState<DirectionFilter>("ALL");
  const [groqOn, setGroqOn]     = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNews(compact ? 10 : 20);
      setItems(data.items);
      setGroqOn(data.groq_enabled);
      setFetchedAt(data.fetched_at);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  }, [compact]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "ALL" ? items : items.filter((n) => n.impact_direction === filter);
  const bullCount = items.filter((n) => n.impact_direction === "BULLISH").length;
  const bearCount = items.filter((n) => n.impact_direction === "BEARISH").length;

  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Radio size={12} style={{ color: "var(--bear)" }} className="animate-pulse" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text)" }}>
            Market Intelligence
          </span>
          {groqOn && (
            <span className="font-mono text-[8px] uppercase px-1 py-0.5 border"
              style={{ borderColor: "var(--amber-border)", color: "var(--amber)", background: "var(--amber-glow)" }}>
              GROQ AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Sentiment summary */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 font-mono text-[9px]">
              <span style={{ color: "var(--bull)" }}>▲ {bullCount}</span>
              <span style={{ color: "var(--bear)" }}>▼ {bearCount}</span>
            </div>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-1 hover:bg-[var(--surface)]-hover transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} style={{ color: "var(--muted)" }} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {DIRECTION_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 font-mono text-[9px] uppercase tracking-wider py-1.5 transition-colors border-r last:border-r-0 ${
              filter === f
                ? "bg-[var(--surface)] font-bold"
                : "hover:bg-[var(--surface)]-hover"
            }`}
            style={{
              borderColor: "var(--border)",
              color: f === "BULLISH" && filter === f
                ? "var(--bull)"
                : f === "BEARISH" && filter === f
                ? "var(--bear)"
                : filter === f
                ? "var(--text)"
                : "var(--muted)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className={`overflow-y-auto divide-y`} style={{ borderColor: "var(--border)", maxHeight: compact ? "320px" : "520px" }}>
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="spinner" />
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              Fetching live headlines…
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="p-4 font-mono text-[11px] text-red-700 bg-red-50/50 border border-red-200 m-3">
            ⚠ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
              No {filter !== "ALL" ? filter.toLowerCase() + " " : ""}headlines available
            </p>
          </div>
        )}

        {!loading && !error && filtered.map((item, i) => (
          <NewsCard key={`${item.title}-${i}`} item={item} />
        ))}
      </div>

      {/* Footer */}
      {fetchedAt && !loading && (
        <div
          className="flex items-center justify-between px-4 py-1.5 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>
            ET · Moneycontrol · NDTV Profit · Business Standard
          </span>
          <span className="font-mono text-[8px]" style={{ color: "var(--muted-2)" }}>
            {new Date(fetchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}
    </div>
  );
}
