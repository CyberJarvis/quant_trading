'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'otp'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [niftyVal, setNiftyVal] = useState(24156.20)

  useEffect(() => {
    const user = localStorage.getItem('pravah_user')
    if (user) router.push('/dashboard')
    const t = setInterval(() => setNiftyVal(v => v + (Math.random() * 4 - 2)), 2000)
    return () => clearInterval(t)
  }, [router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.signup(name, email, password)
      if (res.message) setMode('otp')
      else setError(res.detail || 'Signup failed')
    } catch { setError('Connection error. Please try again.') }
    finally { setLoading(false) }
  }

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.verifyOtp(email, otp)
      if (res.message || res.user) router.push('/login')
      else setError(res.detail || 'Invalid OTP')
    } catch { setError('Verification failed') }
    finally { setLoading(false) }
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
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
          NIFTY <span style={{ color: 'var(--bull)' }}>{niftyVal.toFixed(2)}</span>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 480px' }}>
        {/* Left */}
        <div style={{ padding: '60px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(145deg, #060B14 0%, #080F1A 100%)' }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.2, marginBottom: 12 }}>
              Join PRAVAH <br /><span style={{ color: 'var(--amber)' }}>Quant Intelligence</span>
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Create your account in 60 seconds and gain access to institutional-grade quantitative analytics for Indian markets.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Regime-adaptive portfolio construction',
              'Groq LLM goal-based strategy extraction',
              'Vectorized NSE backtesting engine',
              'Historical stress scenario simulation',
              'Angel One SmartAPI auto-trading integration',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-2)' }}>
                <CheckCircle size={15} color="var(--amber)" />
                {item}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, padding: '16px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.4 }}>
              Investment in securities market are subject to market risks. Read all the related documents carefully before investing. PRAVAH provides analytical tools and does not offer investment advice regulated by SEBI.
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div style={{ padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#0B1320', borderLeft: '1px solid var(--border)' }}>
          {mode === 'signup' ? (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Create Free Account</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Start analyzing markets in minutes.</p>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" type="text" placeholder="Roshan Ajith" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 4, padding: '10px', width: '100%' }}>
                  {loading ? <><div className="spinner" />&nbsp;Creating account…</> : 'Create Account'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>Verify Email</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>Enter the OTP sent to <strong style={{ color: 'var(--text-2)' }}>{email}</strong></p>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

              <form onSubmit={handleOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">One-Time Password</label>
                  <input className="input" type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
                  <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 6 }}>Demo mode: enter 123456</div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '10px', width: '100%' }}>
                  {loading ? <><div className="spinner" />&nbsp;Verifying…</> : 'Verify & Continue'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode('signup')} style={{ padding: '10px', width: '100%' }}>Back</button>
              </form>
            </>
          )}

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
