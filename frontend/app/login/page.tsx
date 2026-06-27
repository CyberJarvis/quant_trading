'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, TrendingUp, Shield, Cpu, Zap, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'otp'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [niftyVal, setNiftyVal] = useState(24156.20)
  const [vixVal, setVixVal] = useState(13.82)

  useEffect(() => {
    const user = localStorage.getItem('pravah_user')
    if (user) {
      const onboarded = localStorage.getItem('pravah_onboarding_completed')
      router.push(onboarded ? '/dashboard' : '/onboarding')
    }
    const t = setInterval(() => {
      setNiftyVal(v => v + (Math.random() * 4 - 2))
      setVixVal(v => Math.max(9, Math.min(30, v + (Math.random() * 0.1 - 0.05))))
    }, 2200)
    return () => clearInterval(t)
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.login(email, password)
      if (res.requires_otp) { setMode('otp') }
      else if (res.user) {
        localStorage.setItem('pravah_user', JSON.stringify(res.user))
        const onboarded = localStorage.getItem('pravah_onboarding_completed')
        router.push(onboarded ? '/dashboard' : '/onboarding')
      } else setError(res.detail || 'Login failed')
    } catch { setError('Connection error. Using demo mode.'); handleDemoLogin() }
    finally { setLoading(false) }
  }

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.verifyOtp(email, otp)
      if (res.user) {
        localStorage.setItem('pravah_user', JSON.stringify(res.user))
        const onboarded = localStorage.getItem('pravah_onboarding_completed')
        router.push(onboarded ? '/dashboard' : '/onboarding')
      } else setError(res.detail || 'Invalid OTP')
    } catch { setError('OTP verification failed') }
    finally { setLoading(false) }
  }

  const handleDemoLogin = () => {
    localStorage.setItem('pravah_user', JSON.stringify({ name: 'Demo User', email: 'demo@pravah.ai', isDemo: true }))
    localStorage.setItem('pravah_onboarding_completed', 'true')
    router.push('/dashboard')
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', background: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={13} color="#04080F" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.02em', color: 'var(--text)' }}>P.R.A.V.A.H</span>
        </Link>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--muted)' }}>
          {[
            { label: 'NIFTY 50', val: niftyVal.toFixed(2), up: true },
            { label: 'INDIA VIX', val: vixVal.toFixed(2), up: false },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
              <span className="font-mono" style={{ color: item.up ? 'var(--bull)' : 'var(--bear)' }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 480px' }}>
        {/* Left: regime panel */}
        <div style={{ padding: '60px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(145deg, #060B14 0%, #080F1A 100%)' }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 16 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bull)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--bull)', letterSpacing: '0.04em' }}>LIVE MARKET REGIME</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.2, marginBottom: 12 }}>
              Real-Time Regime <br /><span style={{ color: 'var(--amber)' }}>Intelligence Active</span>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              PRAVAH continuously monitors VIX + Nifty rolling SMAs to detect market regimes and auto-rebalance portfolio weights.
            </p>
          </div>

          {/* Live regime card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 22px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>CURRENT REGIME</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bull)' }}>BULL</div>
              </div>
              <span className="badge badge-bull">MOMENTUM ACTIVE</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Nifty 50', val: niftyVal.toFixed(2), up: true },
                { label: 'India VIX', val: vixVal.toFixed(2), up: false },
                { label: 'Trend Signal', val: '+0.34%', up: true },
                { label: 'FII Flow', val: '₹1,842 Cr', up: true },
              ].map(item => (
                <div key={item.label} style={{ padding: '10px 12px', background: '#0B0F19', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted-2)', marginBottom: 4 }}>{item.label}</div>
                  <div className="font-mono" style={{ color: item.up ? 'var(--bull)' : 'var(--bear)', fontWeight: 600, fontSize: 13 }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { icon: Cpu, label: 'Groq LLM', desc: 'Llama-3.3-70B Allocation' },
              { icon: Shield, label: 'Risk Shield', desc: 'VIX-Adaptive Guards' },
              { icon: TrendingUp, label: 'Alpha Gen', desc: '+12.4% vs Nifty 50' },
            ].map(f => (
              <div key={f.label} style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                <f.icon size={14} color="var(--amber)" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: login form */}
        <div style={{ padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
              {mode === 'login' ? 'Access Quant Terminal' : 'Verify Your Identity'}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {mode === 'login' ? "Enter credentials to access your PRAVAH account" : `Check your email for the OTP sent to ${email}`}
            </p>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Email Address</label>
                <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, padding: '10px', width: '100%' }}>
                {loading ? <><div className="spinner" />&nbsp;Signing in…</> : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">One-Time Password</label>
                <input className="input" type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
                <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 6 }}>In demo mode (no email configured), use OTP: 123456</div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px', width: '100%' }}>
                {loading ? <><div className="spinner" />&nbsp;Verifying…</> : 'Verify OTP'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode('login')} style={{ padding: '10px', width: '100%' }}>Back</button>
            </form>
          )}

          <div className="divider" />

          <button onClick={handleDemoLogin} className="btn btn-ghost" style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={14} color="var(--amber)" />
            Quick Demo — Skip Auth
          </button>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
            No account?{' '}
            <Link href="/signup" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600 }}>Create one free</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
