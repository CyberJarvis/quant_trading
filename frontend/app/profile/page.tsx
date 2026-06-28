'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Shield, Key, CheckCircle, AlertCircle, Eye, EyeOff,
  RefreshCw, Database, AlertTriangle, Upload, FileText
} from 'lucide-react'
import BehavioralProfiling from '@/components/profile/BehavioralProfiling'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'

const PIE_COLORS = ['#F59E0B', '#22C55E', '#3B82F6', '#EF4444', '#0D9488', '#EC4899', '#06B6D4']

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  // Tab State
  const [activeTab, setActiveTab] = useState<'quant' | 'risk' | 'import'>('quant')

  // Secrets Masking
  const [showGroqKey, setShowGroqKey] = useState(false)
  const [showMongoUri, setShowMongoUri] = useState(false)

  // Quant Parameters Form State
  const [capital, setCapital] = useState('500000')
  const [goal, setGoal] = useState('growth')
  const [risk, setRisk] = useState('MODERATE')
  const [horizon, setHorizon] = useState('36')
  const [sectors, setSectors] = useState('Technology, Finance')
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Behavioral Profiling State
  const [profilingData, setProfilingData] = useState<any>(null)

  // CSV Holdings State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [holdingsData, setHoldingsData] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const refreshProfile = useCallback(async (userEmail: string) => {
    try {
      const profile = await api.getUserProfile(userEmail)
      if (profile) {
        setCapital(String(profile.capital ?? '500000'))
        setGoal(profile.goal ?? 'growth')
        setRisk(profile.risk ?? 'MODERATE')
        setHorizon(profile.horizon ?? '36')
        setSectors(profile.sectors ?? 'Technology, Finance')
        setProfilingData({
          past_experience: profile.past_experience,
          investment_style: profile.investment_style,
          loss_behavior: profile.loss_behavior,
          financial_knowledge: profile.financial_knowledge,
          tax_slab: profile.tax_slab,
        })
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
    }
  }, [])

  useEffect(() => {
    const session = localStorage.getItem('pravah_user')
    if (!session) {
      router.push('/login')
      return
    }
    const parsed = JSON.parse(session)
    setName(parsed.name || 'Quant Investor')
    setEmail(parsed.email || '')

    console.log('Fetching profile for:', parsed.email);
    Promise.all([
      api.getUserProfile(parsed.email),
      api.getHoldingsAnalysis(parsed.holdings || [])
    ])
      .then(([profile, holdings]) => {
        console.log('Profile fetched:', profile);
        if (profile) {
          setCapital(String(profile.capital ?? '500000'))
          setGoal(profile.goal ?? 'growth')
          setRisk(profile.risk ?? 'MODERATE')
          setHorizon(profile.horizon ?? '36')
          setSectors(profile.sectors ?? 'Technology, Finance')
          setProfilingData({
            past_experience: profile.past_experience,
            investment_style: profile.investment_style,
            loss_behavior: profile.loss_behavior,
            financial_knowledge: profile.financial_knowledge,
            tax_slab: profile.tax_slab,
          })
        }
        if (holdings?.imported || holdings?.holdings?.length > 0) {
          setHoldingsData(holdings)
        }
      })
      .catch((err) => {
        console.error('Graceful profile fallback:', err)
      })
      .finally(() => {
        console.log('Setting loading to false');
        setLoading(false);
      })
  }, [router])

  const handleSaveQuantParams = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveSuccess(null)
    setSaveError(null)
    try {
      const res = await api.saveOnboarding(
        email,
        parseFloat(capital) || 500000,
        goal,
        risk,
        horizon,
        sectors
      )
      if (res?.detail) {
        setSaveError(res.detail)
      } else {
        setSaveSuccess('Quant parameters updated successfully!')
        // Update user session storage
        const session = localStorage.getItem('pravah_user')
        if (session) {
          const parsed = JSON.parse(session)
          parsed.onboarding_completed = true
          localStorage.setItem('pravah_user', JSON.stringify(parsed))
        }
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update parameters.')
    }
  }

  const handleImportCSV = async () => {
    if (!importFile) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await api.importCSV(importFile)
      if (res?.detail) {
        setImportError(res.detail)
      } else {
        setHoldingsData(res)
      }
    } catch (err: any) {
      setImportError(err.message || 'Holdings import failed. Please ensure the CSV is properly formatted.')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="spinner text-amber-500 animate-spin" />
        <p className="text-xs text-[color:var(--muted-2)] font-mono">Fetching quant profile from database...</p>
      </div>
    )
  }

  const riskOptions = ['LOW', 'MODERATE', 'HIGH']

  // Pre-formatted sector data for PieChart
  const rawSectors = holdingsData?.sector_splits || []
  const pieData = rawSectors.map((s: any) => ({
    name: s.name || s.sector || 'Other',
    value: s.value || s.weight || s.amount_inr || 0,
  })).filter((d: any) => d.value > 0)

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-fade-up">
      {/* Page Header */}
      <div>
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Configure your execution credentials, quant risk boundaries, and portfolio holdings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Card A: Identity Card */}
          <div className="card flex flex-col items-center text-center p-6 space-y-4">
            <div
              style={{ background: 'linear-gradient(135deg, var(--amber), var(--bull-2))' }}
              className="w-16 h-16 rounded-full flex items-center justify-center text-black text-2xl font-black"
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-[17px] font-bold leading-tight" style={{ color: "var(--text)" }}>{name}</h2>
              <p className="text-[12px] font-mono mt-1" style={{ color: "var(--muted)" }}>{email}</p>
            </div>
            <div className="w-full border-t pt-4 flex flex-col gap-2.5 text-left text-xs" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between items-center">
                <span className="text-[color:var(--muted-2)]">Account Tier</span>
                <span className="font-bold text-amber-500 tracking-wider text-[10px]">QUANT EDGE MEMBER</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[color:var(--muted-2)]">Status</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400 text-[10px]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  ACTIVE INVESTOR
                </span>
              </div>
            </div>
          </div>

          {/* Card B: Credential Secrets */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--text)" }}>
              <Key size={14} className="text-amber-500" />
              <span>Credential Secrets</span>
            </div>

            {/* GROQ Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--muted)" }}>Groq API Key</label>
              <div className="relative">
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value="gsk_demo_zK98xWqM21P0yLaB76c5"
                  readOnly
                  style={{ fontSize: '11.5px', fontFamily: 'JetBrains Mono', background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
                  className="input w-full pr-8 cursor-not-allowed select-none"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--muted)" }}
                >
                  {showGroqKey ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* MongoDB Connection URI */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-[color:var(--muted-2)] uppercase tracking-wider font-mono">MongoDB Connection URI</label>
              <div className="relative">
                <input
                  type={showMongoUri ? 'text' : 'password'}
                  value="mongodb+srv://pravah_user:secure_password@cluster0.mongodb.net/pravah"
                  readOnly
                  style={{ fontSize: '11.5px', fontFamily: 'JetBrains Mono' }}
                  className="input w-full pr-8 cursor-not-allowed select-none bg-[var(--surface-hover)]"
                />
                <button
                  type="button"
                  onClick={() => setShowMongoUri(!showMongoUri)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[color:var(--muted-2)] hover:text-text transition-colors"
                >
                  {showMongoUri ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Tabbed Interface */}
        <div className="card p-6 flex flex-col">
          {/* Tab Selection */}
          <div className="tab-bar mb-6">
            <button
              onClick={() => setActiveTab('quant')}
              className={`tab ${activeTab === 'quant' ? 'active' : ''}`}
            >
              Quant Parameters
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`tab ${activeTab === 'risk' ? 'active' : ''}`}
            >
              Behavioral Risk Profiling
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`tab ${activeTab === 'import' ? 'active' : ''}`}
            >
              Import Portfolio
            </button>
          </div>

          {/* Tab contents */}
          <div className="flex-1">
            {/* Tab 1: Quant Parameters */}
            {activeTab === 'quant' && (
              <form onSubmit={handleSaveQuantParams} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="label">Investment Capital (₹)</label>
                  <input
                    type="number"
                    step="10000"
                    min="10000"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    className="input w-full text-base font-bold font-mono text-[color:var(--text)]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label">Financial Goal</label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="select w-full"
                    >
                      <option value="growth">Growth Mode</option>
                      <option value="hedging">Capital Hedging</option>
                      <option value="dividend">Dividend Income</option>
                      <option value="momentum">Active Momentum Trading</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="label">Horizon Period</label>
                    <select
                      value={horizon}
                      onChange={(e) => setHorizon(e.target.value)}
                      className="select w-full font-mono"
                    >
                      <option value="12">12 Months (1 Year)</option>
                      <option value="24">24 Months (2 Years)</option>
                      <option value="36">36 Months (3 Years)</option>
                      <option value="60">60 Months (5 Years)</option>
                    </select>
                  </div>
                </div>

                {/* Risk Tolerance Toggle */}
                <div className="space-y-2">
                  <label className="label">Risk Tolerance Boundary</label>
                  <div className="grid grid-cols-3 gap-2">
                    {riskOptions.map((opt) => {
                      const isActive = risk === opt
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRisk(opt)}
                          className="px-4 py-2.5 border text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                          style={{
                            borderColor: isActive ? 'var(--amber)' : 'var(--border)',
                            color: isActive ? 'var(--amber)' : 'var(--muted)',
                            background: isActive ? 'rgba(245,158,11,0.04)' : 'transparent',
                          }}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="label">Preferred Industry Sectors</label>
                  <input
                    type="text"
                    value={sectors}
                    placeholder="Technology, Finance, Energy..."
                    onChange={(e) => setSectors(e.target.value)}
                    className="input w-full text-xs"
                  />
                  <p className="text-[10px] text-[color:var(--muted-2)] font-mono mt-0.5">Separate multiple industries using commas.</p>
                </div>

                {/* Save Feedback Alerts */}
                {saveSuccess && (
                  <div className="flex items-start gap-2 bg-[var(--surface-hover)] border p-3 font-mono text-xs text-emerald-800" style={{ borderColor: "var(--bull-border)" }}>
                    <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="uppercase font-bold">{saveSuccess}</span>
                  </div>
                )}

                {saveError && (
                  <div className="flex items-start gap-2 bg-[var(--surface-hover)] border p-3 font-mono text-xs text-red-800" style={{ borderColor: "var(--bear-border)" }}>
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <span className="uppercase font-bold">{saveError}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button type="submit" className="btn btn-primary min-w-[120px]">
                    Update Parameters
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Risk Profiling */}
            {activeTab === 'risk' && (
              <BehavioralProfiling
                email={email}
                initialData={profilingData}
                onSaveSuccess={() => refreshProfile(email)}
              />
            )}

            {/* Tab 3: Import Portfolio */}
            {activeTab === 'import' && (
              <div className="space-y-6">
                {/* Dashed Import Box */}
                <div className="border-2 border-dashed p-6 flex flex-col items-center gap-4 text-center" style={{ borderColor: "var(--border)" }}>
                  <div className="w-10 h-10 bg-amber-glow border flex items-center justify-center text-amber" style={{ borderColor: "var(--amber-border)" }}>
                    <Upload size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text">Upload Broker Statement (.csv)</p>
                    <p className="text-[10px] text-[color:var(--muted-2)] mt-1 font-mono">Supports Zerodha, Groww, Upstox holdings CSV files.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="text-xs text-[color:var(--muted)] file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[var(--surface-hover)] file:text-text hover:file:bg-[var(--surface)]-hover file:text-xs file:font-semibold cursor-pointer"
                    />
                    <button
                      onClick={handleImportCSV}
                      disabled={!importFile || importing}
                      className="btn btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                      {importing && <RefreshCw size={12} className="animate-spin" />}
                      <span>Import & Analyze</span>
                    </button>
                  </div>
                </div>

                {importError && (
                  <div className="flex items-start gap-2 bg-red-500/5 border p-3 text-xs" style={{ borderColor: "var(--bear-border)" }}>
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <p className="text-red-600 font-mono font-bold uppercase">{importError}</p>
                  </div>
                )}

                {/* Dashboard Metrics / Data View */}
                {holdingsData ? (
                  <div className="space-y-6">
                    {/* 4-Metric Card Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {
                          label: 'Imported Value',
                          value: `₹${(holdingsData.metrics?.total_value || 0).toLocaleString('en-IN')}`,
                          accent: 'text-[color:var(--text)]'
                        },
                        {
                          label: 'Total Invested',
                          value: `₹${(holdingsData.metrics?.total_invested || 0).toLocaleString('en-IN')}`,
                          accent: 'text-[color:var(--muted)]'
                        },
                        {
                          label: 'Unrealized P&L',
                          value: `${(holdingsData.metrics?.unrealized_pnl >= 0 ? '+' : '')}₹${(holdingsData.metrics?.unrealized_pnl || 0).toLocaleString('en-IN')}`,
                          accent: (holdingsData.metrics?.unrealized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                        },
                        {
                          label: 'Portfolio Beta',
                          value: (holdingsData.metrics?.beta || 0).toFixed(2),
                          accent: 'text-amber-500'
                        }
                      ].map((card, i) => (
                        <div key={i} className="bg-[var(--surface)] border px-3 py-2 text-center" style={{ borderColor: "var(--border)" }}>
                          <p className="font-mono text-[9px] text-[color:var(--muted-2)] uppercase tracking-widest">{card.label}</p>
                          <p className={`text-sm font-bold font-mono mt-1 ${card.accent}`} style={{ fontVariantNumeric: "tabular-nums" }}>{card.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Sector Splits (PieChart) + Rebalancing Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: PieChart */}
                      <div className="bg-[var(--surface)] border p-4 flex flex-col justify-between" style={{ borderColor: "var(--border)" }}>
                        <p className="font-mono text-xs font-bold uppercase tracking-wider text-text mb-4">Sector Allocation Split</p>
                        {pieData.length > 0 ? (
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-28 h-28 flex-shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={36}
                                    outerRadius={50}
                                    paddingAngle={2}
                                    dataKey="value"
                                  >
                                    {pieData.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-2 text-[10px] font-medium font-mono text-[color:var(--muted)]">
                              {pieData.map((d: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                  <span className="truncate max-w-[80px]" title={d.name}>{d.name}</span>
                                  <span className="text-[color:var(--muted-2)]">({typeof d.value === 'number' && holdingsData.metrics?.total_value ? `${((d.value / holdingsData.metrics.total_value) * 100).toFixed(0)}%` : d.value})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-[color:var(--muted-2)] italic py-6 text-center">No sector data to display.</p>
                        )}
                      </div>

                      {/* Right: AI Rebalancing Insights */}
                      <div className="bg-[var(--surface)] border p-4 flex flex-col justify-between" style={{ borderColor: "var(--border)" }}>
                        <p className="font-mono text-xs font-bold uppercase tracking-wider text-text mb-3">AI Rebalancing Insights</p>
                        <div className="space-y-2 max-h-[110px] overflow-auto">
                          {holdingsData.rebalancing && holdingsData.rebalancing.length > 0 ? (
                            holdingsData.rebalancing.map((item: any, i: number) => {
                              const isInc = item.action === 'INCREASE'
                              return (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-[10px] p-2 rounded border"
                                  style={{
                                    background: isInc ? 'rgba(34,197,94,0.02)' : 'rgba(239,68,68,0.02)',
                                    borderColor: isInc ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
                                  }}
                                >
                                  <span className={`font-bold font-mono px-1 py-0.5 rounded text-[8px] tracking-wider ${isInc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {item.action}
                                  </span>
                                  <div className="pt-0.5">
                                    <span className="font-semibold text-[color:var(--text)] font-mono mr-1.5">{item.symbol}</span>
                                    <span className="text-[color:var(--muted-2)] leading-normal">{item.reason}</span>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="flex items-center gap-1.5 bg-[var(--surface)] border p-2.5" style={{ borderColor: "var(--border)" }}>
                              <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                              <p className="font-mono text-[9px] text-emerald-600 uppercase font-bold leading-normal">Your portfolio is perfectly balanced. No adjustments required.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Holdings Table */}
                    <div className="space-y-2">
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-text">Detailed Allocation List</p>
                      <div className="overflow-auto max-h-80 border" style={{ borderColor: "var(--border)" }}>
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-[var(--surface-hover)] z-10">
                            <tr className="border-b text-left font-mono text-[9px] font-bold text-[color:var(--muted-2)] uppercase tracking-widest" style={{ borderColor: "var(--border)" }}>
                              <th className="px-4 py-2.5">Symbol</th>
                              <th className="px-4 py-2.5">Sector</th>
                              <th className="px-4 py-2.5">Qty</th>
                              <th className="px-4 py-2.5">Avg Buy Price</th>
                              <th className="px-4 py-2.5">LTP</th>
                              <th className="px-4 py-2.5">Valuation</th>
                              <th className="px-4 py-2.5">P&L%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-mono" style={{ borderColor: "var(--border)" }}>
                            {holdingsData.holdings?.map((h: any, i: number) => {
                              const valuation = h.totalValue || (h.qty * (h.ltp || h.current_price || h.buyPrice))
                              const pnlPct = h.pnl_pct ?? (h.ltp && h.buyPrice ? ((h.ltp - h.buyPrice) / h.buyPrice) * 100 : 0)
                              return (
                                <tr key={i} className="hover:bg-[var(--surface)]-hover text-[color:var(--text-2)]">
                                  <td className="px-4 py-2.5 font-bold text-amber">{h.symbol.replace('.NS', '')}</td>
                                  <td className="px-4 py-2.5 text-[color:var(--muted-2)] font-sans">{h.sector}</td>
                                  <td className="px-4 py-2.5">{h.qty}</td>
                                  <td className="px-4 py-2.5">₹{(h.buyPrice ?? h.avgPrice ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-2.5 text-amber">₹{(h.ltp ?? h.current_price ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                  <td className="px-4 py-2.5 text-text">₹{valuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                  <td className={`px-4 py-2.5 font-bold ${pnlPct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {pnlPct >= 0 ? '▲' : '▼'} {Math.abs(pnlPct).toFixed(2)}%
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty state when no holdings */
                  <div className="flex flex-col items-center justify-center py-16 gap-3 border bg-[var(--surface)]" style={{ borderColor: "var(--border)" }}>
                    <Database size={24} className="text-gray-600" />
                    <div>
                      <p className="font-mono text-xs font-bold uppercase text-[color:var(--muted)]">No Holdings Imported Yet</p>
                      <p className="font-mono text-[9px] text-[color:var(--muted-2)] mt-1 uppercase">Upload a standard CSV portfolio file above to compute sector splits and rebalancing suggestions.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
