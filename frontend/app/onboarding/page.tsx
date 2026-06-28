'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, TrendingUp, Shield, Cpu, IndianRupee } from 'lucide-react'
import { api } from '@/lib/api'

const STEPS = ['Investment Goal', 'Risk Tolerance', 'Time Horizon', 'Preferred Sectors']

const GOALS = [
  { id: 'GROWTH', label: 'Aggressive Growth', desc: 'Maximize capital appreciation. High risk, high reward approach.' },
  { id: 'BALANCED', label: 'Balanced Returns', desc: 'Mix of growth and stability. Moderate risk management.' },
  { id: 'PRESERVATION', label: 'Capital Preservation', desc: 'Protect existing wealth. Low-risk, defensive strategy.' },
]

const RISKS = [
  { id: 'HIGH', label: 'High Risk', badge: 'AGGRESSIVE', color: 'var(--bear)' },
  { id: 'MODERATE', label: 'Moderate Risk', badge: 'BALANCED', color: 'var(--amber)' },
  { id: 'LOW', label: 'Low Risk', badge: 'CONSERVATIVE', color: 'var(--bull)' },
]

const HORIZONS = [
  { id: 12, label: '1 Year', desc: 'Short-term tactical' },
  { id: 36, label: '3 Years', desc: 'Medium-term growth' },
  { id: 60, label: '5+ Years', desc: 'Long-term wealth' },
]

const SECTORS = [
  'Technology', 'Finance', 'Energy', 'Healthcare',
  'Consumer', 'Infrastructure', 'Materials', 'Defence',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [capital, setCapital] = useState(500000)
  const [goal, setGoal] = useState('')
  const [risk, setRisk] = useState('')
  const [horizon, setHorizon] = useState(0)
  const [sectors, setSectors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('pravah_user')
    if (!user) router.push('/login')
  }, [router])

  const toggleSector = (s: string) =>
    setSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleFinish = async () => {
    setLoading(true)
    try {
      const user = JSON.parse(localStorage.getItem('pravah_user') || '{}')
      await api.saveOnboarding(user.email || '', capital, goal, risk, String(horizon), sectors.join(', '))
    } catch { /* graceful */ }
    localStorage.setItem('pravah_onboarding_completed', 'true')
    router.push('/dashboard')
  }

  const canNext = () => {
    if (step === 0) return !!goal && capital >= 10000
    if (step === 1) return !!risk
    if (step === 2) return !!horizon
    if (step === 3) return sectors.length > 0
    return false
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={13} color="#04080F" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>P.R.A.V.A.H</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 700, background: i <= step ? 'var(--amber)' : 'var(--border)', color: i <= step ? '#04080F' : 'var(--muted)', transition: 'all 0.2s' }}>{i + 1}</div>
              <span style={{ fontSize: 11, color: i === step ? 'var(--text)' : 'var(--muted-2)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
              {i < STEPS.length - 1 && <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '0 4px' }} />}
            </div>
          ))}
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 560 }} className="animate-fade-up">

          {step === 0 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Investment Goal & Capital</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>This shapes your entire portfolio construction strategy.</p>

              <div style={{ marginBottom: 24 }}>
                <label className="label">Capital Budget (₹)</label>
                <div style={{ position: 'relative' }}>
                  <IndianRupee size={14} color="var(--muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input className="input" type="number" min={10000} max={10000000} value={capital} onChange={e => setCapital(Number(e.target.value))} style={{ paddingLeft: 30 }} />
                </div>
                <input type="range" min={10000} max={2000000} step={10000} value={capital} onChange={e => setCapital(Number(e.target.value))} style={{ width: '100%', marginTop: 8, accentColor: 'var(--amber)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted-2)' }}>
                  <span>₹10K</span><span className="font-mono" style={{ color: 'var(--amber)' }}>₹{capital.toLocaleString('en-IN')}</span><span>₹20L+</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {GOALS.map(g => (
                  <div key={g.id} onClick={() => setGoal(g.id)} style={{ padding: '14px 16px', background: goal === g.id ? 'rgba(245,158,11,0.04)' : 'var(--surface)', border: `1px solid ${goal === g.id ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 0, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ fontWeight: 605, fontSize: 13.5, color: 'var(--text)', marginBottom: 3, fontFamily: 'monospace', textTransform: 'uppercase' }}>{g.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Risk Tolerance</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>Defines drawdown thresholds and position sizing in our models.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {RISKS.map(r => (
                  <div key={r.id} onClick={() => setRisk(r.id)} style={{ padding: '18px 20px', background: risk === r.id ? 'rgba(245,158,11,0.03)' : 'var(--surface)', border: `1px solid ${risk === r.id ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}>
                    <div style={{ fontWeight: 605, fontSize: 14, color: 'var(--text)', fontFamily: 'monospace', textTransform: 'uppercase' }}>{r.label}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: r.color, background: `${r.color}15`, padding: '3px 8px', borderRadius: 0, border: `1px solid ${r.color}33`, fontFamily: 'monospace' }}>{r.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Investment Horizon</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>Determines compounding runway and volatility tolerance period.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {HORIZONS.map(h => (
                  <div key={h.id} onClick={() => setHorizon(h.id)} style={{ padding: '20px 16px', textAlign: 'center', background: horizon === h.id ? 'rgba(245,158,11,0.04)' : 'var(--surface)', border: `1px solid ${horizon === h.id ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 0, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: horizon === h.id ? 'var(--amber)' : 'var(--text)', marginBottom: 4 }}>{h.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace', textTransform: 'uppercase' }}>{h.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Sector Preferences</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28 }}>Select all sectors to include in strategy universe. Pick at least one.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {SECTORS.map(s => {
                  const sel = sectors.includes(s)
                  return (
                    <div key={s} onClick={() => toggleSector(s)} style={{ padding: '12px 16px', background: sel ? 'rgba(245,158,11,0.04)' : 'var(--surface)', border: `1px solid ${sel ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}>
                      <div style={{ width: 16, height: 16, borderRadius: 0, border: `2px solid ${sel ? 'var(--amber)' : 'var(--border)'}`, background: sel ? 'var(--amber)' : 'transparent', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sel && <div style={{ width: 8, height: 8, background: '#04080F', borderRadius: 0 }} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: sel ? 'var(--text)' : 'var(--text-2)', fontFamily: 'monospace', textTransform: 'uppercase' }}>{s}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'space-between' }}>
            {step > 0 ? (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ padding: '10px 24px' }}>Back</button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{ padding: '10px 28px' }}>Continue</button>
            ) : (
              <button className="btn btn-primary" onClick={handleFinish} disabled={!canNext() || loading} style={{ padding: '10px 28px' }}>
                {loading ? <><div className="spinner" />&nbsp;Saving…</> : 'Launch PRAVAH →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
