'use client'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, ResponsiveContainer
} from 'recharts'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const strat = payload.find((p: any) => p.dataKey === 'strategy')
  const mkt   = payload.find((p: any) => p.dataKey === 'market')
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      {strat && <div style={{ color: 'var(--amber)', fontWeight: 600 }}>Strategy: ₹{strat.value.toLocaleString('en-IN')}</div>}
      {mkt   && <div style={{ color: 'var(--muted)' }}>Buy & Hold: ₹{mkt.value.toLocaleString('en-IN')}</div>}
    </div>
  )
}

export default function EquityCurveChart({ data }: { data: { date: string; strategy: number; market: number }[] }) {
  const sampled = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 150)) === 0)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={sampled} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(2, 7)} interval="preserveStartEnd" />
        <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={52} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} formatter={v => v === 'strategy' ? 'PRAVAH Strategy' : 'Buy & Hold'} />
        <Line type="monotone" dataKey="strategy" stroke="var(--amber)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="market" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
