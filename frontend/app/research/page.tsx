"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { StockData, StockSignal, Candle, ForecastData } from "@/lib/types";
import CandlestickChart from "@/components/research/CandlestickChart";
import RsiChart from "@/components/research/RsiChart";
import MacdChart, { type MacdPoint } from "@/components/research/MacdChart";
import SignalsPanel from "@/components/research/SignalsPanel";
import ForecastChart from "@/components/research/ForecastChart";
import { ChevronDown } from "lucide-react";

const STOCK_CATEGORIES: { label: string; tickers: string[] }[] = [
  {
    label: "Banking - Large Cap",
    tickers: [
      "HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","KOTAKBANK.NS","INDUSINDBK.NS",
      "BANKBARODA.NS","CANBK.NS","PNB.NS","UNIONBANK.NS","INDIANB.NS","UCOBANK.NS",
      "MAHABANK.NS","BANKINDIA.NS","IOB.NS","CENTRALBK.NS",
    ],
  },
  {
    label: "Banking - Private",
    tickers: [
      "FEDERALBNK.NS","IDFCFIRSTB.NS","BANDHANBNK.NS","YESBANK.NS","RBLBANK.NS",
      "CUB.NS","DCBBANK.NS","KARURVYSYA.NS","SOUTHBANK.NS","UJJIVANSFB.NS",
      "EQUITASBNK.NS","ESAFSFB.NS","SURYODAY.NS","JKBANK.NS","LAKSHVIL.NS",
    ],
  },
  {
    label: "NBFC & Lending",
    tickers: [
      "BAJFINANCE.NS","BAJAJFINSV.NS","LICHSGFIN.NS","CHOLAFIN.NS","MUTHOOTFIN.NS",
      "MANAPPURAM.NS","POONAWALLA.NS","ABCAPITAL.NS","LTFH.NS","SBICARD.NS",
      "SHRIRAMFIN.NS","M&MFIN.NS","SUNDARMFIN.NS","PNBHOUSING.NS","CANFINHOME.NS",
      "AAVAS.NS","HOMEFIRST.NS","APTUS.NS","REPCO.NS","CREDITACC.NS",
    ],
  },
  {
    label: "Insurance & AMC",
    tickers: [
      "SBILIFE.NS","HDFCLIFE.NS","ICICIPRULI.NS","ICICIGI.NS","MFSL.NS",
      "LICI.NS","NIACL.NS","GICRE.NS","STARHEALTH.NS","HDFCAMC.NS",
      "NIPPONLIFE.NS","ABSLAMC.NS","UTI.NS","360ONE.NS","ANGELONE.NS",
    ],
  },
  {
    label: "IT - Large Cap",
    tickers: ["TCS.NS","INFY.NS","HCLTECH.NS","WIPRO.NS","TECHM.NS","LTIM.NS"],
  },
  {
    label: "IT - Mid & Small Cap",
    tickers: [
      "MPHASIS.NS","OFSS.NS","PERSISTENT.NS","KPITTECH.NS","TATAELXSI.NS",
      "TATACOMM.NS","COFORGE.NS","CYIENT.NS","MASTEK.NS","BIRLASOFT.NS",
      "SONATSOFTW.NS","RATEGAIN.NS","INTELLECT.NS","NIITLTD.NS","ZENSAR.NS",
      "HEXAWARE.NS","NEWGEN.NS","TANLA.NS","KRSNAA.NS","ROUTE.NS",
      "INDIAMART.NS","NAUKRI.NS","POLICYBZR.NS","CARTRADE.NS","ZOMATO.NS",
    ],
  },
  {
    label: "Auto - OEM",
    tickers: [
      "MARUTI.NS","TATAMOTORS.NS","M&M.NS","BAJAJ-AUTO.NS","HEROMOTOCO.NS",
      "EICHERMOT.NS","TVSMOTOR.NS","ASHOKLEY.NS","FORCEMOT.NS","MAHINDCIE.NS",
    ],
  },
  {
    label: "Auto - Ancillaries",
    tickers: [
      "MOTHERSON.NS","BALKRISIND.NS","APOLLOTYRE.NS","CEATLTD.NS","MRF.NS",
      "BOSCHLTD.NS","EXIDEIND.NS","SUNDRMFAST.NS","TIINDIA.NS","BHARATFORG.NS",
      "SCHAEFFLER.NS","TIMKEN.NS","MINDAIND.NS","SUPRAJIT.NS","LUMAXTECH.NS",
      "CRAFTSMAN.NS","ENDURANCE.NS","GABRIEL.NS","HAPPYFORGE.NS","SANSERA.NS",
    ],
  },
  {
    label: "Pharma - Large Cap",
    tickers: [
      "SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS","DIVISLAB.NS","LUPIN.NS",
      "AUROPHARMA.NS","TORNTPHARM.NS","ZYDUSLIFE.NS","ABBOTINDIA.NS","PFIZER.NS",
    ],
  },
  {
    label: "Pharma - Mid & Small Cap",
    tickers: [
      "ALKEM.NS","GLENMARK.NS","BIOCON.NS","LALPATHLAB.NS","METROPOLIS.NS",
      "SYNGENE.NS","GRANULES.NS","IPCALAB.NS","AJANTPHARM.NS","NATCOPHARM.NS",
      "LAURUSLABS.NS","ERISLIFE.NS","JBCHEPHARM.NS","SOLARA.NS","STRIDES.NS",
      "APOLLOHOSP.NS","NARAYANAHEALTH.NS","FORTIS.NS","MAXHEALTH.NS","KIMS.NS",
    ],
  },
  {
    label: "Consumer Staples",
    tickers: [
      "HINDUNILVR.NS","ITC.NS","NESTLEIND.NS","BRITANNIA.NS","TATACONSUM.NS",
      "DABUR.NS","MARICO.NS","GODREJCP.NS","COLPAL.NS","EMAMILTD.NS",
      "RADICO.NS","UNITDSPR.NS","VBL.NS","VARUN.NS","BIKAJI.NS",
      "PATANJALI.NS","HATSUN.NS","HERITAGE.NS","KRBL.NS","LTFOODS.NS",
    ],
  },
  {
    label: "Consumer Discretionary",
    tickers: [
      "ASIANPAINT.NS","TITAN.NS","TRENT.NS","BATAINDIA.NS","PAGEIND.NS",
      "RELAXO.NS","HAVELLS.NS","VOLTAS.NS","VGUARD.NS","BLUESTARCO.NS",
      "CROMPTON.NS","POLYCAB.NS","WHIRLPOOL.NS","RAJESHEXPO.NS","KALYAN.NS",
      "JUBLFOOD.NS","WESTLIFE.NS","DEVYANI.NS","SAPPHIRE.NS","PVRINOX.NS",
      "INOXGREEN.NS","DMART.NS","VMART.NS","SHOPERSTOP.NS","CANTABIL.NS",
    ],
  },
  {
    label: "Energy - Oil & Gas",
    tickers: [
      "RELIANCE.NS","ONGC.NS","BPCL.NS","IOC.NS","HINDPETRO.NS",
      "PETRONET.NS","GAIL.NS","MGL.NS","IGL.NS","GSPL.NS",
      "GUJGASLTD.NS","AEGASIND.NS","GASCO.NS","MRPL.NS","CPCL.NS",
    ],
  },
  {
    label: "Energy - Power",
    tickers: [
      "NTPC.NS","POWERGRID.NS","ADANIGREEN.NS","TATAPOWER.NS","TORNTPOWER.NS",
      "SJVN.NS","NLCINDIA.NS","NHPC.NS","RECLTD.NS","PFC.NS",
      "IRFC.NS","CESC.NS","JSWENERGY.NS","ADANITRANS.NS","ADANIPOWER.NS",
      "COALINDIA.NS","RKFORGE.NS","INOXWIND.NS","SUZLON.NS","WINDWORLD.NS",
    ],
  },
  {
    label: "Metals & Mining",
    tickers: [
      "HINDALCO.NS","JSWSTEEL.NS","TATASTEEL.NS","GRASIM.NS","VEDL.NS",
      "SAIL.NS","NMDC.NS","NATIONALUM.NS","JINDALSTEL.NS","MOIL.NS",
      "APLAPOLLO.NS","RATNAMANI.NS","WELCORP.NS","JSPL.NS","TINPLATE.NS",
      "KALYANKJIL.NS","GRAVITA.NS","HINDCOPPER.NS","NALCO.NS","MIDHANI.NS",
    ],
  },
  {
    label: "Cement & Building Materials",
    tickers: [
      "ULTRACEMCO.NS","SHREECEM.NS","AMBUJACEM.NS","ACC.NS","DALMIACENTB.NS",
      "RAMCOCEM.NS","JKCEMENT.NS","HEIDELBERG.NS","INDIACEM.NS","PRISM.NS",
      "BIRLACORPN.NS","NUVOCO.NS","ORIENTCEM.NS","KESORAMIND.NS","SANGHI.NS",
    ],
  },
  {
    label: "Real Estate",
    tickers: [
      "DLF.NS","GODREJPROP.NS","OBEROIRLTY.NS","PHOENIXLTD.NS","PRESTIGE.NS",
      "SOBHA.NS","BRIGADE.NS","MAHLIFE.NS","KOLTEPATIL.NS","SUNTECK.NS",
      "LODHA.NS","ARVINDFASN.NS","ASHIANA.NS","PODDARMENT.NS","IBREALEST.NS",
    ],
  },
  {
    label: "Capital Goods & Engineering",
    tickers: [
      "LT.NS","SIEMENS.NS","ABB.NS","HONAUT.NS","THERMAX.NS",
      "BHEL.NS","HAL.NS","BEL.NS","BEML.NS","CGPOWER.NS",
      "CUMMINSIND.NS","KALPATPOWR.NS","AIAENG.NS","ELGIEQUIP.NS","GRINDWELL.NS",
      "SKFINDIA.NS","GMRINFRA.NS","KEC.NS","POWERMECH.NS","PRAJIND.NS",
      "TEXMACO.NS","TITAGARH.NS","RVNL.NS","IRCON.NS","NBCC.NS",
    ],
  },
  {
    label: "Chemicals & Agrochemicals",
    tickers: [
      "PIDILITE.NS","SRF.NS","DEEPAKNTR.NS","UPL.NS","COROMANDEL.NS",
      "ATUL.NS","NAVINFLUOR.NS","VINATIORGA.NS","FINEORG.NS","GALAXYSURF.NS",
      "GNFC.NS","CLEAN.NS","NOCIL.NS","ALKYLAMINE.NS","BALAMINES.NS",
      "AAVAS.NS","SUDARSCHEM.NS","ROSSARI.NS","NEOGEN.NS","TATACHEM.NS",
      "CHAMBAL.NS","GSFC.NS","FACT.NS","RALLIS.NS","DHANUKA.NS",
    ],
  },
  {
    label: "Telecom & Media",
    tickers: [
      "BHARTIARTL.NS","INDUSTOWER.NS","IDEA.NS","TATACOMM.NS",
      "SUNTV.NS","ZEEL.NS","PVRINOX.NS","SAREGAMA.NS","NETWORK18.NS",
      "TV18BRDCST.NS","HATHWAY.NS","DISHTV.NS","NAZARA.NS","PLAYSTUDIOS.NS",
    ],
  },
  {
    label: "Logistics & Transport",
    tickers: [
      "INDIGO.NS","DELHIVERY.NS","BLUEDART.NS","CONCOR.NS","IRCTC.NS",
      "MAHINDRALOG.NS","VRL.NS","GATI.NS","AEGISLOG.NS","TVSSCS.NS",
      "TCI.NS","CONTAINERCO.NS","ALLCARGO.NS","SPICEJET.NS","GOAIR.NS",
    ],
  },
  {
    label: "Infra & Conglomerates",
    tickers: [
      "ADANIENT.NS","ADANIPORTS.NS","ADANIGREEN.NS","ADANIPOWER.NS","ADANITRANS.NS",
      "TATAPOWER.NS","TATAMETALI.NS","JSWINFRA.NS","L&TFH.NS","WELSPUNIND.NS",
      "NIACL.NS","NHAI.NS","ENGINERSIN.NS","RITES.NS","WABCOINDIA.NS",
    ],
  },
  {
    label: "New Age & Fintech",
    tickers: [
      "NYKAA.NS","PAYTM.NS","POLICYBZR.NS","CARTRADE.NS","DELHIVERY.NS",
      "NAZARA.NS","EASEMYTRIP.NS","IXIGO.NS","MAPMYINDIA.NS","AWFIS.NS",
      "SIGNATURE.NS","SYRMA.NS","VEDANT.NS","RATEGAIN.NS","FRESHWORKS.NS",
    ],
  },
];

const PERIODS = [
  { value: "5d",   label: "1W" },
  { value: "1mo",  label: "1M" },
  { value: "3mo",  label: "3M" },
  { value: "6mo",  label: "6M" },
  { value: "1y",   label: "1Y" },
  { value: "2y",   label: "2Y" },
  { value: "5y",   label: "5Y" },
];

// max days each intraday interval supports in yfinance
const INTERVAL_MAX_DAYS: Record<string, number> = { "5m": 59, "15m": 59, "1h": 729, "1d": 99999 };

const INTERVALS = [
  { value: "5m",  label: "5M"  },
  { value: "15m", label: "15M" },
  { value: "1h",  label: "1H"  },
  { value: "1d",  label: "1D"  },
];

const PERIOD_DAYS: Record<string, number> = {
  "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
};

// ── Client-side indicator computation ─────────────────────────────────────────

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let val = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(val);
  for (let i = period; i < values.length; i++) {
    val = values[i] * k + val * (1 - k);
    result.push(val);
  }
  return result;
}

function computeRsi(candles: Candle[] | undefined | null): { date: string; rsi: number; timestamp?: number }[] {
  if (!candles) return [];
  const result: { date: string; rsi: any; timestamp?: number }[] = [];
  if (candles.length < 15) {
    return candles.map((c) => ({ date: c.date, rsi: null as any, timestamp: c.timestamp }));
  }
  const period = 14;

  for (let i = 0; i < period; i++) {
    result.push({ date: candles[i].date, rsi: null as any, timestamp: candles[i].timestamp });
  }

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ date: candles[period].date, rsi: parseFloat((100 - 100 / (1 + rs0)).toFixed(2)), timestamp: candles[period].timestamp });

  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ date: candles[i].date, rsi: parseFloat((100 - 100 / (1 + rs)).toFixed(2)), timestamp: candles[i].timestamp });
  }
  return result;
}

function computeMacd(candles: Candle[] | undefined | null): MacdPoint[] {
  if (!candles) return [];
  const result: any[] = [];
  if (candles.length < 35) {
    return candles.map((c) => ({
      date: c.date,
      macd: null as any,
      signal: null as any,
      histogram: null as any,
      timestamp: c.timestamp,
    }));
  }

  const closes = candles.map((c) => c.close);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);

  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((v26, i) => ema12[i + offset] - v26);

  const signalLine = ema(macdLine, 9);
  const sigOffset  = macdLine.length - signalLine.length;

  for (let i = 0; i < 33; i++) {
    result.push({
      date:      candles[i].date,
      macd:      null,
      signal:    null,
      histogram: null,
      timestamp: candles[i].timestamp,
    });
  }

  signalLine.forEach((sig, i) => {
    const macd = macdLine[i + sigOffset];
    const candleIdx = 33 + i;
    result.push({
      date:      candles[candleIdx]?.date ?? "",
      macd:      parseFloat(macd.toFixed(4)),
      signal:    parseFloat(sig.toFixed(4)),
      histogram: parseFloat((macd - sig).toFixed(4)),
      timestamp: candles[candleIdx]?.timestamp,
    });
  });

  return result.filter((p) => p.date);
}

function isValidSignal(s: unknown): s is StockSignal {
  return (
    typeof s === "object" && s !== null &&
    "composite_score" in s &&
    typeof (s as any).composite_score === "number"
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function findCategoryForSymbol(sym: string): string {
  for (const cat of STOCK_CATEGORIES) {
    if (cat.tickers.includes(sym)) return cat.label;
  }
  return STOCK_CATEGORIES[4].label; // fallback: IT - Large Cap
}

function ResearchDeskInner() {
  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get("symbol");

  const initSymbol   = urlSymbol ?? "TCS.NS";
  const initCategory = findCategoryForSymbol(initSymbol);

  const [category, setCategory]       = useState(initCategory);
  const [symbol, setSymbol]           = useState(initSymbol);
  const [period, setPeriod]           = useState("1y");
  const [stockData, setStockData]     = useState<StockData | null>(null);
  const [signal, setSignal]           = useState<StockSignal | null>(null);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [interval, setInterval]       = useState("1d");
  const [cqrEnabled, setCqrEnabled]   = useState(false);
  const [forecastEnabled, setForecastEnabled] = useState(false);
  const [forecastData, setForecastData]       = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  // Sync ref for multi-chart scrolling and panning
  const syncRef = useRef<{
    charts: Map<string, any>;
    isSyncing: boolean;
  }>({ charts: new Map(), isSyncing: false });

  const handleChartInit = useCallback((id: string, chart: any) => {
    const sync = syncRef.current;
    sync.charts.set(id, chart);

    const timeScale = chart.timeScale();
    
    // Sync visible date ranges
    const handler = (newRange: any) => {
      if (sync.isSyncing) return;
      if (!newRange) return;
      sync.isSyncing = true;
      sync.charts.forEach((c, key) => {
        if (key !== id) {
          try {
            c.timeScale().setVisibleRange(newRange);
          } catch (e) {}
        }
      });
      sync.isSyncing = false;
    };

    // Sync logical ranges (indices) to align charts with slight length disparities
    const logicalHandler = (newLogicalRange: any) => {
      if (sync.isSyncing) return;
      if (!newLogicalRange) return;
      sync.isSyncing = true;
      sync.charts.forEach((c, key) => {
        if (key !== id) {
          try {
            c.timeScale().setVisibleLogicalRange(newLogicalRange);
          } catch (e) {}
        }
      });
      sync.isSyncing = false;
    };

    timeScale.subscribeVisibleTimeRangeChange(handler);
    try {
      timeScale.subscribeVisibleLogicalRangeChange(logicalHandler);
    } catch (e) {}

    return () => {
      try {
        timeScale.unsubscribeVisibleTimeRangeChange(handler);
        timeScale.unsubscribeVisibleLogicalRangeChange(logicalHandler);
      } catch (e) {}
      sync.charts.delete(id);
    };
  }, []);

  const load = useCallback(async (sym: string, per: string, ivl: string, withCqr: boolean) => {
    setLoading(true);
    setSignalError(null);
    setStockData(null);
    setSignal(null);
    try {
      const sigFetch = withCqr ? api.getSignalsCQR(sym) : api.getSignals(sym);
      const [d, s] = await Promise.all([api.getStockData(sym, per, ivl), sigFetch]);
      if (d && Array.isArray((d as any).candles) && (d as any).candles.length > 0) {
        setStockData(d);
      }
      if (isValidSignal(s)) {
        setSignal(s);
      } else {
        setSignalError((s as any)?.error ?? "Could not compute signals");
      }
    } catch (e: any) {
      console.error(e);
      setSignalError(e.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadForecast = useCallback(async (sym: string) => {
    setForecastLoading(true);
    setForecastData(null);
    try {
      const f = await api.getForecast(sym, 30, 500);
      if (f && f.bands) setForecastData(f);
    } catch (e) {
      console.error(e);
    } finally {
      setForecastLoading(false);
    }
  }, []);

  useEffect(() => { load(symbol, period, interval, cqrEnabled); }, [symbol, period, interval, cqrEnabled, load]);
  useEffect(() => { if (forecastEnabled) loadForecast(symbol); else setForecastData(null); }, [symbol, forecastEnabled, loadForecast]);

  const candles  = stockData?.candles ?? [];
  const rsiData  = computeRsi(candles);
  const macdData = computeMacd(candles);

  const selectClass =
    "bg-surface border border-border px-3 py-1.5 text-xs font-mono font-bold uppercase text-gray-200 " +
    "focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer";

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header + controls */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-mono text-lg font-bold uppercase tracking-wider text-gray-100">Research Desk</h1>
          <p className="font-mono text-[10px] text-gray-500 mt-0.5 uppercase">
            Candlestick · RSI · MACD · Composite Signals · CQR · GBM
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Category dropdown */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => {
                const cat = e.target.value;
                setCategory(cat);
                const first = STOCK_CATEGORIES.find(c => c.label === cat)?.tickers[0];
                if (first) setSymbol(first);
              }}
              className={selectClass}
            >
              {STOCK_CATEGORIES.map((cat) => (
                <option key={cat.label} value={cat.label} className="bg-surface">
                  {cat.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          {/* Fund dropdown — filtered by category */}
          <div className="relative">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className={selectClass}
            >
              {(STOCK_CATEGORIES.find(c => c.label === category)?.tickers ?? []).map((s) => (
                <option key={s} value={s} className="bg-surface">
                  {s.replace(".NS", "")}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={period}
              onChange={(e) => {
                const p = e.target.value;
                setPeriod(p);
                const days = PERIOD_DAYS[p] ?? 365;
                if (INTERVAL_MAX_DAYS[interval] < days) setInterval("1d");
              }}
              className={selectClass}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value} className="bg-surface">
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          {/* Interval toggle */}
          <div className="flex border border-border overflow-hidden">
            {INTERVALS.map((ivl) => {
              const disabled = INTERVAL_MAX_DAYS[ivl.value] < (PERIOD_DAYS[period] ?? 365);
              const active   = interval === ivl.value;
              return (
                <button
                  key={ivl.value}
                  disabled={disabled}
                  onClick={() => setInterval(ivl.value)}
                  className={`px-2 py-1.5 font-mono text-[10px] font-bold uppercase transition-colors border-r last:border-r-0 border-border
                    ${disabled ? "text-gray-700 cursor-not-allowed" : active ? "bg-amber/20 text-amber" : "text-gray-500 hover:text-gray-300"}`}
                >
                  {ivl.label}
                </button>
              );
            })}
          </div>

          {/* CQR toggle */}
          <button
            onClick={() => setCqrEnabled((v) => !v)}
            className={`px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase border transition-colors ${
              cqrEnabled
                ? "bg-blue-500/20 border-blue-500/60 text-blue-400"
                : "border-border text-gray-500 hover:text-gray-300"
            }`}
            title="Conformalized Quantile Regression — 90% prediction interval"
          >
            CQR
          </button>

          {/* GBM Forecast toggle */}
          <button
            onClick={() => setForecastEnabled((v) => !v)}
            className={`px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase border transition-colors ${
              forecastEnabled
                ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                : "border-border text-gray-500 hover:text-gray-300"
            }`}
            title="GBM Monte Carlo fan chart — scenario visualization"
          >
            GBM
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-[380px] bg-surface border animate-pulse" style={{ borderColor: "var(--border)" }} />
          <div className="h-28 bg-surface border animate-pulse" style={{ borderColor: "var(--border)" }} />
          <div className="h-36 bg-surface border animate-pulse" style={{ borderColor: "var(--border)" }} />
        </div>
      )}

      {/* Main layout */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Charts column — min-w-0 prevents grid blowout from lightweight-charts canvas */}
          <div className="lg:col-span-3 space-y-3 min-w-0 overflow-hidden">
            <CandlestickChart
              candles={candles}
              symbol={symbol}
              livePrice={stockData?.live_price}
              liveChange={stockData?.live_change}
              liveChangePct={stockData?.live_change_pct}
              onChartInit={(chart) => handleChartInit("candlestick", chart)}
            />
            <RsiChart data={rsiData} onChartInit={(chart) => handleChartInit("rsi", chart)} />
            <MacdChart data={macdData} onChartInit={(chart) => handleChartInit("macd", chart)} />
            {forecastEnabled && (
              forecastLoading
                ? <div className="h-[270px] bg-surface border animate-pulse" style={{ borderColor: "var(--border)" }} />
                : forecastData
                  ? <ForecastChart data={forecastData} />
                  : <div className="h-[270px] bg-surface border flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
                      <p className="font-mono text-xs text-gray-500 uppercase">Failed to load GBM forecast</p>
                    </div>
            )}
          </div>

          {/* Signals column */}
          <div>
            <SignalsPanel signal={signal} error={signalError} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<div className="font-mono text-xs uppercase p-6 text-gray-500">Loading Research Core…</div>}>
      <ResearchDeskInner />
    </Suspense>
  );
}
