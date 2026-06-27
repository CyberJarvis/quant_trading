import type { BacktestResult } from "@/lib/types";
import { formatInr } from "@/lib/utils";

interface Props { result: BacktestResult }

interface MetricRowProps { label: string; value: string; color?: string }

function MetricRow({ label, value, color = "text-gray-200" }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#1F2937] last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}

export default function MetricsPanel({ result }: Props) {
  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Performance</h3>
      <MetricRow
        label="Total Return"
        value={`${result.total_return >= 0 ? "+" : ""}${result.total_return.toFixed(2)}%`}
        color={result.total_return >= 0 ? "text-emerald-400" : "text-red-400"}
      />
      <MetricRow
        label="Annual Return"
        value={`${result.annual_return >= 0 ? "+" : ""}${result.annual_return.toFixed(2)}%`}
        color={result.annual_return >= 0 ? "text-emerald-400" : "text-red-400"}
      />
      <MetricRow
        label="Market Return"
        value={`${result.market_return.toFixed(2)}%`}
      />
      <MetricRow
        label="Alpha"
        value={`${result.alpha >= 0 ? "+" : ""}${result.alpha.toFixed(2)}%`}
        color={result.alpha >= 0 ? "text-emerald-400" : "text-red-400"}
      />
      <MetricRow label="Sharpe Ratio"  value={result.sharpe.toFixed(2)}  color="text-amber-400" />
      <MetricRow label="Sortino Ratio" value={result.sortino.toFixed(2)} color="text-amber-400" />
      <MetricRow
        label="Max Drawdown"
        value={`${result.max_drawdown.toFixed(2)}%`}
        color="text-red-400"
      />
      <MetricRow label="VaR (95%)"    value={`${result.var_95.toFixed(2)}%`}  color="text-red-300" />
      <MetricRow label="Win Rate"     value={`${result.win_rate.toFixed(1)}%`} color="text-gray-200" />
      <MetricRow label="Total Trades" value={String(result.total_trades)}      />
      <MetricRow label="Final Value"  value={formatInr(result.final_value)}    color="text-amber-400" />
    </div>
  );
}
