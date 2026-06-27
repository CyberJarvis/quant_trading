import type { BacktestResult } from "@/lib/types";
import { formatInr } from "@/lib/utils";

interface Props { result: BacktestResult }

interface MetricRowProps { label: string; value: string; color?: string }

function MetricRow({ label, value, color = "text-text" }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
      <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-xs font-bold ${color}`} style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

export default function MetricsPanel({ result }: Props) {
  return (
    <div className="bg-surface border p-5" style={{ borderColor: "var(--border)" }}>
      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-text mb-4">Simulation Metrics</h3>
      <MetricRow
        label="Total Return"
        value={`${result.total_return >= 0 ? "+" : ""}${result.total_return.toFixed(2)}%`}
        color={result.total_return >= 0 ? "var(--bull)" : "var(--bear)"}
      />
      <MetricRow
        label="Annual Return"
        value={`${result.annual_return >= 0 ? "+" : ""}${result.annual_return.toFixed(2)}%`}
        color={result.annual_return >= 0 ? "var(--bull)" : "var(--bear)"}
      />
      <MetricRow
        label="Market Return"
        value={`${result.market_return.toFixed(2)}%`}
      />
      <MetricRow
        label="Alpha (vs Nifty)"
        value={`${result.alpha >= 0 ? "+" : ""}${result.alpha.toFixed(2)}%`}
        color={result.alpha >= 0 ? "var(--bull)" : "var(--bear)"}
      />
      <MetricRow label="Sharpe Ratio"  value={result.sharpe.toFixed(2)}  color="var(--amber)" />
      <MetricRow label="Sortino Ratio" value={result.sortino.toFixed(2)} color="var(--amber)" />
      <MetricRow
        label="Max Drawdown"
        value={`${result.max_drawdown.toFixed(2)}%`}
        color="var(--bear)"
      />
      <MetricRow label="VaR (95%)"    value={`${result.var_95.toFixed(2)}%`}  color="var(--bear)" />
      <MetricRow label="Win Rate"     value={`${result.win_rate.toFixed(1)}%`} color="var(--text-2)" />
      <MetricRow label="Total Trades" value={String(result.total_trades)}      />
      <MetricRow label="Final Capital"  value={formatInr(result.final_value)}    color="var(--amber)" />
    </div>
  );
}
