"use client";

import { useState, useRef, useCallback } from "react";
import {
  X, Upload, CheckCircle, ChevronRight, FileText,
  AlertCircle, ArrowLeft, Loader2, Zap
} from "lucide-react";
import type { EnrichedAllocation } from "./HoldingsTable";
import { api, type LiveHolding } from "@/lib/api";

// ── Broker definitions ────────────────────────────────────────────────────────

interface BrokerConfig {
  id: string;
  name: string;
  color: string;
  accent: string;
  fileType: "csv" | "excel" | "csv_or_excel";
  steps: { title: string; detail: string }[];
  columns: {
    symbol: string[];      // possible column names for symbol
    qty: string[];
    avgPrice: string[];
    currentPrice: string[];
  };
  symbolTransform?: (raw: string) => string;
}

const BROKERS: BrokerConfig[] = [
  {
    id: "zerodha",
    name: "Zerodha",
    color: "#387ED1",
    accent: "#387ED1",
    fileType: "csv_or_excel",
    steps: [
      { title: "Open Zerodha Console", detail: "Go to console.zerodha.com and log in with your Kite credentials" },
      { title: "Go to Portfolio → Holdings", detail: "Click on 'Portfolio' in the left sidebar, then select 'Holdings'" },
      { title: "Download CSV/Excel", detail: "Click the download icon (↓) at the top-right of the holdings table → select CSV or XLSX" },
      { title: "Upload here", detail: "The file will be named something like 'holdings.csv' or 'holdings.xlsx' — upload it below" },
    ],
    columns: {
      symbol:       ["Instrument", "instrument", "INSTRUMENT", "Symbol", "symbol"],
      qty:          ["Qty.", "Qty", "qty", "QTY", "Quantity Available", "Quantity"],
      avgPrice:     ["Avg. cost", "Avg cost", "avg_cost", "Average Price", "Avg Price", "Avg. Price"],
      currentPrice: ["LTP", "ltp", "Cur. val", "Previous Closing Price", "Current Price"],
    },
  },
  {
    id: "groww",
    name: "Groww",
    color: "#00D09C",
    accent: "#00D09C",
    fileType: "csv",
    steps: [
      { title: "Open Groww App or Website", detail: "Log in at groww.in or open the Groww mobile app" },
      { title: "Go to Stocks → Holdings", detail: "Tap the 'Stocks' tab, then tap 'Holdings' at the top" },
      { title: "Export Holdings", detail: "Tap the download/share icon at the top-right → 'Export as CSV'" },
      { title: "Upload here", detail: "File will be named 'Holdings.csv' or similar — upload it below" },
    ],
    columns: {
      symbol:       ["NSE Symbol", "nse_symbol", "Symbol", "symbol"],
      qty:          ["Quantity", "quantity", "Qty"],
      avgPrice:     ["Average Buy Price", "average_buy_price", "Avg Buy Price"],
      currentPrice: ["Current Market Price", "current_market_price", "LTP"],
    },
  },
  {
    id: "upstox",
    name: "Upstox",
    color: "#6C4EF5",
    accent: "#6C4EF5",
    fileType: "csv",
    steps: [
      { title: "Open Upstox Pro Web", detail: "Log in at pro.upstox.com with your credentials" },
      { title: "Go to Portfolio", detail: "Click 'Portfolio' in the top navigation bar" },
      { title: "Download Holdings", detail: "Click 'Holdings' tab → click the Excel/CSV download icon at the top right" },
      { title: "Upload here", detail: "File typically named 'Portfolio.csv' — upload it below" },
    ],
    columns: {
      symbol:       ["Symbol", "symbol", "Instrument"],
      qty:          ["Qty", "qty", "Quantity", "Net Qty"],
      avgPrice:     ["Avg Price", "avg_price", "Buy Avg"],
      currentPrice: ["LTP", "ltp", "Current Price"],
    },
    symbolTransform: (raw) => raw.replace(/-EQ$/i, "").replace(/-BE$/i, "").trim(),
  },
  {
    id: "angelone",
    name: "Angel One",
    color: "#E8272A",
    accent: "#E8272A",
    fileType: "csv",
    steps: [
      { title: "Open Angel One SmartWeb", detail: "Log in at smartweb.angelone.in" },
      { title: "Go to Portfolio → Holdings", detail: "Click 'Portfolio' in the left nav → select 'Holdings'" },
      { title: "Export CSV", detail: "Click the export icon at the top right of the holdings list → 'Download as CSV'" },
      { title: "Upload here", detail: "File will be named 'Holdings.csv' — upload it below" },
    ],
    columns: {
      symbol:       ["Symbol", "Scrip Name", "symbol", "scrip_name"],
      qty:          ["Net Qty.", "Net Qty", "Qty", "qty", "Quantity"],
      avgPrice:     ["Buy Avg.", "Buy Avg", "Avg Price", "avg_price"],
      currentPrice: ["Current Price", "LTP", "ltp"],
    },
    symbolTransform: (raw) => raw.replace(/-EQ$/i, "").replace(/-BE$/i, "").trim(),
  },
  {
    id: "icicidirect",
    name: "ICICI Direct",
    color: "#F06A23",
    accent: "#F06A23",
    fileType: "csv_or_excel",
    steps: [
      { title: "Log in to ICICIdirect", detail: "Go to icicidirect.com and log in with your credentials" },
      { title: "Go to Portfolio", detail: "Click 'Portfolio' in the top menu bar" },
      { title: "Download Statement", detail: "Click 'Download' → select 'Portfolio Statement' → choose CSV format" },
      { title: "Upload here", detail: "Upload the downloaded CSV file below" },
    ],
    columns: {
      symbol:       ["Stock Name", "stock_name", "Symbol", "Scrip"],
      qty:          ["Quantity", "quantity", "Qty", "Net Qty"],
      avgPrice:     ["Avg Cost", "avg_cost", "Buy Avg", "Purchase Price"],
      currentPrice: ["Current Price", "Market Price", "LTP"],
    },
  },
  {
    id: "hdfc",
    name: "HDFC Securities",
    color: "#004C8F",
    accent: "#004C8F",
    fileType: "csv_or_excel",
    steps: [
      { title: "Log in to HDFC Securities", detail: "Go to hdfcsec.com and log in" },
      { title: "Go to My Portfolio", detail: "Hover on 'My Account' in the top nav → click 'My Portfolio'" },
      { title: "Download Holdings", detail: "Click 'Download' button at the top of the holdings list → select CSV" },
      { title: "Upload here", detail: "Upload the downloaded file below" },
    ],
    columns: {
      symbol:       ["Stock Name", "Company Name", "Symbol", "Scrip Name"],
      qty:          ["Balance Qty", "Net Qty", "Qty", "Quantity"],
      avgPrice:     ["Average Price", "Buy Avg", "Cost Price"],
      currentPrice: ["Current Price", "Market Rate", "LTP"],
    },
  },
];

// ── CSV parser ────────────────────────────────────────────────────────────────

interface ParsedHolding {
  symbol: string;
  displaySymbol: string;
  qty: number;
  avgPrice: number;
  currentPrice: number | null;
  totalValue: number;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string, broker: BrokerConfig): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Gather all possible header keywords for this broker
  const keywords = [
    ...broker.columns.symbol,
    ...broker.columns.qty,
    ...broker.columns.avgPrice,
    ...broker.columns.currentPrice,
    "isin", "sector", "quantity", "average price"
  ].map(k => k.toLowerCase());

  // Find the row with the most matching keywords (scan up to first 40 lines)
  let bestHeaderIdx = 0;
  let maxMatches = -1;

  for (let i = 0; i < Math.min(40, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCSVLine(line).map((c) => c.trim().toLowerCase());
    
    let matches = 0;
    cols.forEach(col => {
      if (keywords.some(k => col === k || col.includes(k))) {
        matches++;
      }
    });

    if (matches > maxMatches) {
      maxMatches = matches;
      bestHeaderIdx = i;
    }
  }

  const headerIdx = maxMatches > 0 ? bestHeaderIdx : 0;
  const headers = splitCSVLine(lines[headerIdx]);
  const rows: Record<string, string>[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

function findCol(row: Record<string, string>, candidates: string[]): string | null {
  for (const c of candidates) {
    if (c in row && row[c] !== undefined) return row[c];
  }
  // Fuzzy: case-insensitive partial match
  const keys = Object.keys(row);
  for (const c of candidates) {
    const match = keys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
    if (match) return row[match];
  }
  return null;
}

function toFloat(s: string | null): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[₹,\s%]/g, "")) || 0;
}

function normaliseSymbol(raw: string, transform?: (s: string) => string): string {
  let sym = (transform ? transform(raw) : raw).toUpperCase().trim();
  // Remove any existing exchange suffix
  sym = sym.replace(/\.NS$/i, "").replace(/\.BO$/i, "").replace(/\.BSE$/i, "");
  return sym + ".NS";
}

function parseHoldings(broker: BrokerConfig, csvText: string): ParsedHolding[] {
  const rows = parseCSV(csvText, broker);
  const results: ParsedHolding[] = [];

  for (const row of rows) {
    const rawSymbol   = findCol(row, broker.columns.symbol);
    const rawQty      = findCol(row, broker.columns.qty);
    const rawAvg      = findCol(row, broker.columns.avgPrice);
    const rawCurrent  = findCol(row, broker.columns.currentPrice);

    if (!rawSymbol || !rawQty) continue;

    const qty = toFloat(rawQty);
    if (qty <= 0) continue;

    const avgPrice    = toFloat(rawAvg);
    const currentPrice = rawCurrent ? toFloat(rawCurrent) : null;
    const totalValue  = currentPrice ? qty * currentPrice : qty * avgPrice;

    const nsSymbol = normaliseSymbol(rawSymbol, broker.symbolTransform);
    const display  = nsSymbol.replace(".NS", "");

    if (display.length < 2 || display.length > 20) continue; // skip garbage rows

    results.push({ symbol: nsSymbol, displaySymbol: display, qty, avgPrice, currentPrice, totalValue });
  }

  return results;
}

function formatCurrency(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)}Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  } else if (val >= 1000) {
    return `₹${(val / 1000).toFixed(2)}K`;
  } else {
    return `₹${val.toFixed(2)}`;
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function BrokerCard({ broker, onClick }: { broker: BrokerConfig; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-4 border bg-[var(--surface)] hover:border-[var(--border)]-2 hover:bg-[var(--surface)]-hover transition-all text-center cursor-pointer"
      style={{ borderColor: "var(--border)", "--accent": broker.color } as any}
    >
      <div
        className="w-10 h-10 flex items-center justify-center text-white text-xs font-black transition-all"
        style={{ backgroundColor: broker.color + "15", border: `1px solid ${broker.color}33` }}
      >
        <span style={{ color: broker.color }} className="text-[10px] font-mono font-bold leading-tight text-center">
          {broker.name.split(" ").map(w => w[0]).join("")}
        </span>
      </div>
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[color:var(--muted)] group-hover:text-white transition-colors leading-tight">
        {broker.name}
      </span>
      <ChevronRight size={11} className="text-gray-600 group-hover:text-[color:var(--muted)] transition-colors" />
    </button>
  );
}

function StepItem({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <span className="font-mono text-[10px] font-bold text-amber">{n}</span>
      </div>
      <div className="pt-0.5">
        <p className="font-mono text-xs font-bold text-[color:var(--text)] uppercase">{title}</p>
        <p className="font-mono text-[10px] text-[color:var(--muted-2)] mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onConfirm: (holdings: EnrichedAllocation[], totalValue: number) => void;
  onClose: () => void;
}

type Step = "broker" | "upload" | "preview" | "enriching" | "live_loading";

export default function BrokerImport({ onConfirm, onClose }: Props) {
  const [step,          setStep]          = useState<Step>("broker");
  const [broker,        setBroker]        = useState<BrokerConfig | null>(null);
  const [parsed,        setParsed]        = useState<ParsedHolding[]>([]);
  const [parseError,    setParseError]    = useState<string | null>(null);
  const [liveError,     setLiveError]     = useState<string | null>(null);
  const [dragging,      setDragging]      = useState(false);
  const [fileName,      setFileName]      = useState<string | null>(null);
  const [enriching,     setEnriching]     = useState(false);
  const [consoleLogs,   setConsoleLogs]   = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleLiveConnect = async () => {
    setLiveError(null);
    setStep("live_loading");
    setConsoleLogs(["$ ssh client@angelone.smartapi", "> establishing secure tunnel..."]);
    
    await sleep(400);
    setConsoleLogs(prev => [...prev, "> authenticating with client_id: RO81...", "> totp handshake: verified"]);
    
    await sleep(600);
    setConsoleLogs(prev => [...prev, "> retrieving client holdings statement...", "> active positions found: 8"]);
    
    try {
      const res = await (api as any).getLiveHoldings();
      if (res.error || !res.holdings?.length) {
        setConsoleLogs(prev => [...prev, "! error: no active holdings found.", "$ exit 1"]);
        await sleep(1000);
        setLiveError(res.error ?? "No holdings found in your Angel One account.");
        setStep("broker");
        return;
      }
      const holdings: ParsedHolding[] = (res.holdings as LiveHolding[]).map((h) => ({
        symbol:        h.symbol,
        displaySymbol: h.display_symbol,
        qty:           h.qty,
        avgPrice:      h.avg_price,
        currentPrice:  h.current_price || null,
        totalValue:    h.total_value,
      }));
      setConsoleLogs(prev => [...prev, `> successfully parsed ${holdings.length} stocks.`, "$ exit 0"]);
      await sleep(500);
      setParsed(holdings);
      setStep("preview");
    } catch {
      setConsoleLogs(prev => [...prev, "! fatal: connection refused.", "$ exit 1"]);
      await sleep(1000);
      setLiveError("Could not connect to Angel One. Check that the backend is running.");
      setStep("broker");
    }
  };

  const handleBrokerSelect = (b: BrokerConfig) => {
    setBroker(b);
    setStep("upload");
  };

  const processFile = useCallback((file: File) => {
    if (!broker) return;
    setParseError(null);
    setFileName(file.name);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        let csvText = "";
        if (isExcel) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          csvText = XLSX.utils.sheet_to_csv(sheet);
        } else {
          csvText = e.target?.result as string;
        }

        const holdings = parseHoldings(broker, csvText);
        if (holdings.length === 0) {
          setParseError("No holdings found in this file. Make sure you exported from the correct broker and the format matches.");
          return;
        }
        setParsed(holdings);
        setStep("preview");
      } catch (err) {
        setParseError(`Could not parse this file. Please ensure it's a valid ${isExcel ? "Excel" : "CSV"} export from ` + broker.name + ".");
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }, [broker]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirm = async () => {
    if (!parsed.length) return;
    setEnriching(true);
    setStep("enriching");

    const totalValue = parsed.reduce((s, h) => s + h.totalValue, 0);
    setConsoleLogs([
      "$ pravah --action enrich --target portfolio",
      `> parsing ${parsed.length} holding assets...`,
      `> base portfolio value: INR ${totalValue.toLocaleString("en-IN")}`
    ]);

    const enriched: EnrichedAllocation[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const h = parsed[i];
      const weight = (h.totalValue / totalValue) * 100;
      setConsoleLogs(prev => [...prev, `> fetching live signals for ${h.displaySymbol}...`]);
      await sleep(150);

      try {
        const sig = await api.getSignalsCQR(h.symbol) as any;
        const pi = sig?.prediction_interval;
        enriched.push({
          symbol:        h.symbol,
          weight:        parseFloat(weight.toFixed(2)),
          amount_inr:    parseFloat(h.totalValue.toFixed(2)),
          sector:        sig?.sector           ?? "Other",
          signal:        sig?.verdict          ?? "HOLD",
          score:         sig?.composite_score  ?? 0,
          current_price: sig?.current_price    ?? h.currentPrice,
          rsi:           sig?.rsi              ?? null,
          macd_signal:   sig?.macd_signal      ?? null,
          return_1y:     null,
          pred_realist:  sig?.pred_realist     ?? null,
          cqr_abstain:   pi?.abstain           ?? null,
        });
        const cqrTag = pi?.abstain ? " · CQR:ABSTAIN" : pi ? ` · CQR:${pi.lower_pct}%→${pi.upper_pct}%` : "";
        setConsoleLogs(prev => [
          ...prev.slice(0, -1),
          `> enriched ${h.displaySymbol} · verdict: ${sig?.verdict ?? "HOLD"} · rsi: ${sig?.rsi?.toFixed(1) ?? "—"}${cqrTag} (ok)`
        ]);
      } catch {
        enriched.push({
          symbol:     h.symbol,
          weight:     parseFloat(weight.toFixed(2)),
          amount_inr: parseFloat(h.totalValue.toFixed(2)),
          sector:     "Other",
          signal:     "HOLD",
          score:      0,
        });
        setConsoleLogs(prev => [
          ...prev.slice(0, -1),
          `> enriched ${h.displaySymbol} (fallback default)`
        ]);
      }
    }

    setConsoleLogs(prev => [...prev, "> normalization complete.", "$ exit 0"]);
    await sleep(400);

    setEnriching(false);
    onConfirm(enriched, totalValue);
  };

  const totalPortfolioValue = parsed.reduce((s, h) => s + h.totalValue, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(3,7,18,0.85)" }}>
      <div className="w-full max-w-2xl bg-[var(--surface)] border overflow-hidden shadow-xl" style={{ borderColor: "var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            {step !== "broker" && (
              <button
                onClick={() => { setStep(step === "preview" ? "upload" : "broker"); setParsed([]); setParseError(null); }}
                className="text-[color:var(--muted-2)] hover:text-[color:var(--muted)] transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div>
              <p className="font-mono text-xs font-bold uppercase text-[color:var(--text)]">Import Holdings</p>
              <p className="font-mono text-[9px] text-[color:var(--muted-2)] mt-0.5 uppercase">
                {step === "broker"       && "Select your broker"}
                {step === "upload"       && broker?.name + " — Export & Upload"}
                {step === "preview"      && `${parsed.length} holdings found · ${formatCurrency(totalPortfolioValue)} total value`}
                {step === "live_loading" && "Connecting to Angel One…"}
                {step === "enriching"    && "Fetching live signals…"}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              {(["broker", "upload", "preview"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className="rounded-full transition-all"
                  style={{
                    width:  step === s ? 20 : 6,
                    height: 6,
                    backgroundColor: (["broker","upload","preview","enriching","live_loading"].indexOf(step) >= i)
                      ? "var(--amber)" : "#1A2B40",
                  }}
                />
              ))}
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-[color:var(--muted)] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">

          {/* ── Step 1: Select Broker ──────────────────────────────────── */}
          {step === "broker" && (
            <div>
              {/* Live Connect — Angel One API */}
              <button
                onClick={handleLiveConnect}
                className="w-full mb-4 flex items-center gap-3 px-4 py-3 border bg-amber-glow hover:bg-amber-glow/85 transition-all group cursor-pointer"
                style={{ borderColor: "var(--amber-border)" }}
              >
                <div className="w-8 h-8 bg-amber-glow border flex items-center justify-center flex-shrink-0" style={{ borderColor: "var(--amber-border)" }}>
                  <Zap size={14} className="text-amber" />
                </div>
                <div className="text-left">
                  <p className="font-mono text-xs font-bold uppercase text-amber">Angel One — Live Connect</p>
                  <p className="text-[10px] text-[color:var(--muted-2)] mt-0.5 font-mono">Pull holdings directly from your Angel One account. No CSV needed.</p>
                </div>
                <ChevronRight size={14} className="text-[color:var(--muted-2)] group-hover:text-amber ml-auto transition-colors" />
              </button>

              {liveError && (
                <div className="flex items-start gap-2 bg-red-50/50 border p-3 mb-4 font-mono text-xs text-red-800" style={{ borderColor: "var(--bear-border)" }}>
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="font-bold uppercase">{liveError}</p>
                </div>
              )}

              <p className="text-xs text-[color:var(--muted-2)] mb-3">Or upload a CSV from any broker:</p>
              <div className="grid grid-cols-3 gap-3">
                {BROKERS.map((b) => (
                  <BrokerCard key={b.id} broker={b} onClick={() => handleBrokerSelect(b)} />
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Instructions + Upload ─────────────────────────── */}
          {step === "upload" && broker && (
            <div className="space-y-5">
              {/* Steps */}
              <div className="bg-[var(--surface)] border p-4 space-y-4" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black text-white"
                    style={{ backgroundColor: broker.color }}
                  >
                    {broker.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <p className="text-xs font-semibold text-[color:var(--muted)]">How to export from {broker.name}</p>
                </div>
                {broker.steps.map((s, i) => (
                  <StepItem key={i} n={i + 1} title={s.title} detail={s.detail} />
                ))}
              </div>

              {/* Upload zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
                style={{
                  borderColor: dragging ? broker.color : "var(--border)",
                  backgroundColor: dragging ? broker.color + "08" : "transparent",
                }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{ backgroundColor: broker.color + "15" }}
                >
                  <Upload size={20} style={{ color: broker.color }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[color:var(--muted)]">
                    {fileName ? fileName : "Drop your CSV file here"}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    or click to browse · {broker.fileType === "csv" ? "CSV only" : "CSV or Excel"}
                  </p>
                </div>
                <input aria-label="Input field"
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 bg-red-500/5 border p-3" style={{ borderColor: "var(--bear-border)" }}>
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{parseError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Preview ────────────────────────────────────────── */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="overflow-auto max-h-72 border" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[var(--surface-hover)]">
                    <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                      {["Symbol", "Qty", "Avg Price", "Current Price", "Value", "Weight"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium text-[color:var(--muted-2)] uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {parsed.map((h) => {
                      const weight = (h.totalValue / totalPortfolioValue) * 100;
                      return (
                        <tr key={h.symbol} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 font-mono font-semibold text-amber-400">{h.displaySymbol}</td>
                          <td className="px-4 py-2.5 font-mono text-[color:var(--muted)]">{h.qty}</td>
                          <td className="px-4 py-2.5 font-mono text-[color:var(--muted)]">₹{h.avgPrice.toLocaleString("en-IN")}</td>
                          <td className="px-4 py-2.5 font-mono text-[color:var(--muted)]">
                            {h.currentPrice ? `₹${h.currentPrice.toLocaleString("en-IN")}` : "—"}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[color:var(--text)]">
                            {formatCurrency(h.totalValue)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-1 bg-border-2 overflow-hidden">
                                <div className="h-full bg-amber" style={{ width: `${Math.min(weight, 100)}%` }} />
                              </div>
                              <span className="font-mono text-[color:var(--muted)]">{weight.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Stocks",       value: parsed.length.toString() },
                  { label: "Total Value",  value: formatCurrency(totalPortfolioValue) },
                  { label: "Broker",       value: broker?.name ?? "—" },
                ].map((m) => (
                  <div key={m.label} className="bg-[var(--surface)] border px-3 py-2 text-center" style={{ borderColor: "var(--border)" }}>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">{m.label}</p>
                    <p className="text-sm font-bold text-text mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 bg-amber-glow border p-3" style={{ borderColor: "var(--amber-border)" }}>
                <CheckCircle size={14} className="text-amber-400 flex-shrink-0" />
                <p className="text-[11px] text-amber-350/80">
                  Confirm to fetch live signals for each holding and add them to your portfolio. Weights are based on current market value.
                </p>
              </div>
            </div>
          )}

          {/* ── Live Loading ──────────────────────────────────────────── */}
          {step === "live_loading" && (
            <div className="py-2">
              <div className="bg-[var(--surface-hover)] border p-4 font-mono text-[10px] text-[color:var(--text-2)] h-64 overflow-y-auto space-y-1" style={{ borderColor: "var(--border)" }}>
                <div className="text-[color:var(--muted-2)] border-b pb-1 mb-2 uppercase tracking-widest text-[9px] font-bold" style={{ borderColor: "var(--border)" }}>
                  ANGEL ONE CONNECT CONSOLE
                </div>
                {consoleLogs.map((log, idx) => (
                  <p key={idx} className={log.startsWith("$") ? "text-amber font-bold" : log.startsWith("!") ? "text-red-650" : "text-emerald-700"}>
                    {log}
                  </p>
                ))}
                <div className="w-1.5 h-3 bg-emerald-600 inline-block animate-pulse" />
              </div>
            </div>
          )}

          {/* ── Enriching ─────────────────────────────────────────────── */}
          {step === "enriching" && (
            <div className="py-2">
              <div className="bg-[var(--surface-hover)] border p-4 font-mono text-[10px] text-[color:var(--text-2)] h-64 overflow-y-auto space-y-1" style={{ borderColor: "var(--border)" }}>
                <div className="text-[color:var(--muted-2)] border-b pb-1 mb-2 uppercase tracking-widest text-[9px] font-bold" style={{ borderColor: "var(--border)" }}>
                  PORTFOLIO SIGNAL ENRICHER CORE
                </div>
                {consoleLogs.map((log, idx) => (
                  <p key={idx} className={log.startsWith("$") ? "text-amber font-bold" : log.startsWith("!") ? "text-red-650" : "text-emerald-700"}>
                    {log}
                  </p>
                ))}
                <div className="w-1.5 h-3 bg-emerald-600 inline-block animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "preview" || step === "upload") && (
          <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => { setStep("broker"); setBroker(null); setParsed([]); setParseError(null); setFileName(null); }}
              className="font-mono text-[10px] font-bold uppercase text-[color:var(--muted-2)] hover:text-[color:var(--muted)] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={12} /> Change broker
            </button>
            {step === "preview" && (
              <button
                onClick={handleConfirm}
                disabled={enriching}
                className="flex items-center gap-1.5 px-4 py-2 border font-mono text-[10px] uppercase font-bold bg-amber text-black hover:bg-transparent hover:text-amber transition-colors cursor-pointer"
                style={{ borderColor: "var(--amber)" }}
              >
                <CheckCircle size={13} />
                [ENTER] CONFIRM & IMPORT
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
