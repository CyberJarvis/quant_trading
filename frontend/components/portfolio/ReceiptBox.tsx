import type { PortfolioReceipt, PortfolioMetrics } from "@/lib/types";
import { formatInr, formatNumber, regimeBg } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface Props {
  receipt: PortfolioReceipt;
  metrics: PortfolioMetrics;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
      <span className="font-mono text-[10px] text-[color:var(--muted-2)] uppercase tracking-wider">{label}</span>
      <span className="font-mono text-xs font-bold text-text uppercase">{value}</span>
    </div>
  );
}

export default function ReceiptBox({ receipt, metrics }: Props) {
  return (
    <div className="bg-[var(--surface)] border p-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle size={14} className="text-emerald-400" />
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text">Receipt Details</h3>
      </div>

      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        <Row label="Budget" value={formatInr(receipt.budget_inr)} />
        <Row
          label="Horizon"
          value={`${receipt.horizon_months} months (${(receipt.horizon_months / 12).toFixed(1)} yrs)`}
        />
        <Row label="Risk Level" value={receipt.risk_level} />
        <Row label="Strategy" value={receipt.strategy_applied} />
      </div>

      <div className={`mt-4 px-3 py-2 border text-[10px] font-mono font-bold uppercase ${regimeBg(receipt.current_regime)}`} style={{ borderColor: "var(--border)" }}>
        Current regime: {receipt.current_regime} MARKET
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="bg-[var(--surface-hover)] border px-3 py-2 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="font-mono text-[9px] text-[color:var(--muted-2)] uppercase tracking-wider mb-0.5">Est. Annual Return</p>
          <p className="font-mono font-bold text-emerald-500 text-base" style={{ fontVariantNumeric: "tabular-nums" }}>
            {metrics.expected_return !== null ? `${formatNumber(metrics.expected_return)}%` : "—"}
          </p>
        </div>
        <div className="bg-[var(--surface-hover)] border px-3 py-2 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="font-mono text-[9px] text-[color:var(--muted-2)] uppercase tracking-wider mb-0.5">Sharpe Ratio</p>
          <p className="font-mono font-bold text-amber text-base" style={{ fontVariantNumeric: "tabular-nums" }}>
            {metrics.sharpe_estimate !== null ? formatNumber(metrics.sharpe_estimate) : "—"}
          </p>
        </div>
      </div>
      <p className="font-mono text-[9px] text-gray-600 mt-2 text-center uppercase">{metrics.metrics_note}</p>
    </div>
  );
}
