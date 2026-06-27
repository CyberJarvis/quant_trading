import type { PortfolioReceipt, PortfolioMetrics } from "@/lib/types";
import { formatInr, formatNumber, regimeBg } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface Props {
  receipt: PortfolioReceipt;
  metrics: PortfolioMetrics;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#1F2937] last:border-0">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-mono font-medium text-gray-200">{value}</span>
    </div>
  );
}

export default function ReceiptBox({ receipt, metrics }: Props) {
  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle size={16} className="text-emerald-400" />
        <h3 className="text-sm font-semibold text-gray-200">We Understood</h3>
      </div>

      <div className="divide-y divide-[#1F2937]">
        <Row label="Budget" value={formatInr(receipt.budget_inr)} />
        <Row
          label="Horizon"
          value={`${receipt.horizon_months} months (${(receipt.horizon_months / 12).toFixed(1)} yrs)`}
        />
        <Row label="Risk Level" value={receipt.risk_level} />
        <Row label="Strategy" value={receipt.strategy_applied} />
      </div>

      <div className={`mt-4 px-3 py-2 rounded-lg border text-xs font-medium ${regimeBg(receipt.current_regime)}`}>
        Current regime: {receipt.current_regime} MARKET
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="bg-[#0D1220] rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Est. Annual Return</p>
          <p className="font-mono font-bold text-emerald-400 text-lg">
            {metrics.expected_return !== null ? `${formatNumber(metrics.expected_return)}%` : "—"}
          </p>
        </div>
        <div className="bg-[#0D1220] rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Sharpe Ratio</p>
          <p className="font-mono font-bold text-amber-400 text-lg">
            {metrics.sharpe_estimate !== null ? formatNumber(metrics.sharpe_estimate) : "—"}
          </p>
        </div>
      </div>
      <p className="text-[10px] text-gray-600 mt-2 text-center">{metrics.metrics_note}</p>
    </div>
  );
}
