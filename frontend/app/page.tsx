'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Shield, Cpu, BarChart3, ArrowRight, Sparkles, Sliders, TrendingUp, HelpCircle, Check, ArrowUpRight } from 'lucide-react'

const TICKER_ITEMS = [
  { symbol: 'RELIANCE', price: 2848.00, change: 1.25 },
  { symbol: 'TCS', price: 3925.00, change: -0.45 },
  { symbol: 'HDFCBANK', price: 1783.00, change: 0.82 },
  { symbol: 'INFY', price: 1648.00, change: 1.05 },
  { symbol: 'SBIN', price: 842.00, change: 0.30 },
  { symbol: 'BHARTIARTL', price: 1724.00, change: -0.15 },
  { symbol: 'BAJFINANCE', price: 7248.00, change: 0.55 },
]

const FAQS = [
  {
    q: "How does the Regime-Adaptive algorithm function?",
    a: "Our engine continuously monitors India VIX, Nifty 50 rolling SMAs, and FII Net Flow vectors. By mapping these indexes dynamically, it automatically shifts asset weights between momentum tech (Bull), defensive consumer (Bear), or range-bound mean reversion (Sideways) to minimize drawdowns."
  },
  {
    q: "What inputs does the Groq AI model extract from my briefs?",
    a: "We process your natural language target using Groq's Llama-3.3 LLM. The AI automatically parses your capital budget sizing, target horizon, risk threshold, and outputs a personalized strategy recommendation to initialize your backtests."
  },
  {
    q: "Can I simulate custom rate hikes or market crash scenarios?",
    a: "Yes. Our Stress Test engine maps historical covariance matrices (e.g. 2008 Lehman collapse, 2020 Covid crash) alongside custom interest rate shocks. It applies asset betas to estimate potential drawdown shocks on your custom portfolio allocation."
  }
]

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [budget, setBudget] = useState(500000)
  const [risk, setRisk] = useState<'LOW' | 'MODERATE' | 'HIGH'>('MODERATE')
  const [regime, setRegime] = useState<'BULL' | 'BEAR' | 'SIDEWAYS'>('BULL')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  
  // Live simulated index tickers
  const [niftyVal, setNiftyVal] = useState(24156.20)
  const [vixVal, setVixVal] = useState(13.82)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    handleScroll() // Initialize scroll state on mount
    window.addEventListener('scroll', handleScroll)
    
    // Simulate live ticking indices
    const timer = setInterval(() => {
      setNiftyVal(prev => prev + (Math.random() * 4 - 2))
      setVixVal(prev => Math.max(9, Math.min(30, prev + (Math.random() * 0.1 - 0.05))))
    }, 2500)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearInterval(timer)
    }
  }, [])

  // Dynamic yields calculation based on slider/toggles
  const getSimulatedStats = () => {
    let yieldPct = 12.8
    let sharpe = 1.05

    if (regime === 'BULL') {
      yieldPct = risk === 'HIGH' ? 22.4 : risk === 'MODERATE' ? 17.5 : 12.8
      sharpe = risk === 'HIGH' ? 1.45 : risk === 'MODERATE' ? 1.34 : 1.15
    } else if (regime === 'BEAR') {
      yieldPct = risk === 'HIGH' ? 4.2 : risk === 'MODERATE' ? 6.4 : 7.8
      sharpe = risk === 'HIGH' ? 0.35 : risk === 'MODERATE' ? 0.61 : 0.82
    } else { // SIDEWAYS
      yieldPct = risk === 'HIGH' ? 11.2 : risk === 'MODERATE' ? 10.8 : 8.5
      sharpe = risk === 'HIGH' ? 0.88 : risk === 'MODERATE' ? 0.92 : 0.95
    }

    const projectedProfit = (budget * yieldPct) / 100
    return { yieldPct, sharpe, projectedProfit }
  }

  const { yieldPct, sharpe, projectedProfit } = getSimulatedStats()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: isScrolled ? 'rgba(248, 250, 252, 0.95)' : 'transparent',
        backdropFilter: isScrolled ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
        borderBottom: isScrolled ? '1px solid var(--border)' : 'none',
        transition: 'all 0.2s ease',
        padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
            background: 'var(--amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={16} color="#04080F" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{
              fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em',
              color: 'var(--text)'
            }}>P.R.A.V.A.H</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
              QUANT PLATFORM
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="#features" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Features</a>
          <a href="#comparison" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Performance</a>
          <a href="#workflow" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Workflow</a>
          <a href="#faq" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>FAQ</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13, border: 'none', background: 'transparent' }}>
              Sign In
            </button>
          </Link>
          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
              Get Started
            </button>
          </Link>
        </div>
      </header>

      {/* Infinite scrolling ticker below navbar */}
      <div style={{
        marginTop: 56,
        background: 'var(--surface-hover)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 0',
      }} className="animate-marquee-container">
        <div className="animate-marquee-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 24px', fontSize: 12 }}>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-2)' }}>{item.symbol}</span>
              <span className="font-mono" style={{ color: 'var(--muted)' }}>₹{item.price.toFixed(2)}</span>
              <span className="font-mono" style={{ fontWeight: 600, color: item.change >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
                {item.change >= 0 ? '+' : ''}{item.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Intro */}
      <section style={{
        padding: '80px 24px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        background: 'radial-gradient(circle at top, rgba(16,185,129,0.03) 0%, transparent 60%)'
      }}>
        <div style={{ maxWidth: 1040 }} className="animate-fade-up">
          {/* Accent Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
            marginBottom: 20,
          }}>
            <Sparkles size={12} color="var(--amber)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--amber)', letterSpacing: '0.02em' }}>
              RETAIL QUANT SOLUTIONS FOR INDIAN WEALTH
            </span>
          </div>

          <h1 style={{
            fontSize: 44, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2,
            color: 'var(--text)', marginBottom: 16
          }}>
            Institutional Algorithmic Intelligence <br />
            <span style={{ color: 'var(--amber)' }}>For Your Personal Investment Capital</span>
          </h1>

          <p style={{ fontSize: 14.5, color: 'var(--muted)', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.5 }}>
            PRAVAH detects dynamic market regimes, extracts portfolios using Groq LLMs, and executes vectorized strategy backtests to protect capital.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>
                Enter Quant Terminal <ArrowRight size={14} style={{ marginLeft: 4 }} />
              </button>
            </Link>
            <a href="#simulator" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ padding: '10px 24px', fontSize: 14 }}>
                Run Simulator
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* Real-time Ticking index stats */}
      <section style={{ padding: '0 24px 30px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>NIFTY 50 INDEX</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text)', marginTop: 4 }}>
                ₹{niftyVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--bull)', fontWeight: 700, background: 'rgba(16,185,129,0.08)', padding: '2px 6px', borderRadius: 4 }}>+0.34%</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>INDIA VIX INDEX</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text)', marginTop: 4 }}>
                {vixVal.toFixed(2)}
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--bull)', fontWeight: 700, background: 'rgba(16,185,129,0.08)', padding: '2px 6px', borderRadius: 4 }}>LOW FEAR</span>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>DAILY OPTIMIZED VOLUME</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--amber)', marginTop: 4 }}>
                ₹45.8 Crores
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>AUTO</span>
          </div>
        </div>
      </section>

      {/* Simulator Widget Section */}
      <section id="simulator" style={{ padding: '40px 24px 60px' }} className="animate-fade-up">
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div className="card" style={{ padding: '32px 36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sliders size={16} color="var(--amber)" />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Interactive Quant Yield Estimator</h2>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 24 }}>
              Toggle parameters to test projected regime returns based on historical NSE data models.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="label" style={{ marginBottom: 0 }}>Capital Budget</span>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>
                      ₹{budget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <input
                    type="range" min={50000} max={1000000} step={50000}
                    value={budget} onChange={e => setBudget(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--amber)', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <span className="label">Risk Preference</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['LOW', 'MODERATE', 'HIGH'] as const).map(r => (
                      <button
                        key={r} onClick={() => setRisk(r)}
                        className={`tab ${risk === r ? 'active' : ''}`}
                        style={{ flex: 1, padding: '6px 0', fontSize: 11.5 }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="label">Simulated Market Regime</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['BULL', 'BEAR', 'SIDEWAYS'] as const).map(reg => (
                      <button
                        key={reg} onClick={() => setRegime(reg)}
                        className={`tab ${regime === reg ? 'active' : ''}`}
                        style={{ flex: 1, padding: '6px 0', fontSize: 11.5 }}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculated Outputs */}
              <div style={{
                padding: 20, borderRadius: 'var(--radius)',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Projected Annual Return</div>
                  <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--bull)' }}>
                    {yieldPct.toFixed(1)}%
                  </div>
                </div>

                <div style={{ margin: '14px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--muted)' }}>Expected Profit</span>
                    <span className="font-mono" style={{ color: 'var(--text)', fontWeight: 600 }}>
                      +₹{projectedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <span style={{ color: 'var(--muted)' }}>Sharpe Ratio</span>
                    <span className="font-mono" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                      {sharpe.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--muted-2)', lineHeight: 1.4 }}>
                  Calculated based on optimized portfolio indicators. Enter the terminal to run live backtests.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Grid Section */}
      <section id="comparison" style={{ padding: '60px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.08em' }}>STRATEGY BENCHMARKING</span>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginTop: 6, letterSpacing: '-0.02em' }}>Adaptive Optimization vs Index</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Our regime-adaptive model manages risks where passive indexes index heavy drawdowns.</p>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600 }}>Performance Metric</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--amber)', fontWeight: 700 }}>PRAVAH Adaptive</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--muted)', fontWeight: 600 }}>Nifty 50 Index</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text-2)' }}>Annualized Sharpe Ratio</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--bull)', fontWeight: 700 }}>1.42</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--text-2)' }}>0.85</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text-2)' }}>Maximum Drawdown (MDD)</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--bull)', fontWeight: 700 }}>-11.0%</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--bear)' }}>-24.6%</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text-2)' }}>Alpha Generation</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--bull)', fontWeight: 700 }}>+12.4%</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--muted-2)' }}>Benchmark Base</td>
                </tr>
                <tr>
                  <td style={{ padding: '14px 18px', color: 'var(--text-2)' }}>Volatility Shield</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--bull)', fontWeight: 700 }}>Active (India VIX Trigger)</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', color: 'var(--muted-2)' }}>None (Raw Beta)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Workflow Timeline Section */}
      <section id="workflow" style={{ padding: '60px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.08em' }}>USER PIPELINE</span>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginTop: 6, letterSpacing: '-0.02em' }}>How PRAVAH Shields Capital</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Four seamless steps to deploy institutional algorithmic protection.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            {[
              { step: '01', title: 'Connect Account', desc: 'Securely create your credentials with OTP verification.' },
              { step: '02', title: 'Input Target', desc: 'Describe your capital sizing & goals in natural language.' },
              { step: '03', title: 'Regime Scan', desc: 'Llama-3.3 parses parameters against VIX indicators.' },
              { step: '04', title: 'Run Stress-Tests', desc: 'Simulate Lehman or Covid-like shocks before deploying.' }
            ].map((item, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'rgba(245,158,11,0.06)', fontFamily: 'JetBrains Mono' }}>{item.step}</div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: '8px 0 6px' }}>{item.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" style={{ padding: '60px 24px 60px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'left', marginBottom: 40 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 6 }}>
              Built For Volatility Management
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Core analytical engines designed to execute without complexity.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              {
                icon: Cpu,
                title: 'Market Regime Detection',
                desc: 'Scrapes live index movements and VIX sentiment metrics to establish optimal asset allocations for Bull, Bear, and Sideways regimes.',
              },
              {
                icon: TrendingUp,
                title: 'Goal-Based Portfolio Builder',
                desc: 'Translate natural language investment targets into weighted stock portfolio receipts scaled to your specific timeline and risk.',
              },
              {
                icon: BarChart3,
                title: 'Strategy Backtest Engine',
                desc: 'Simulate trading rules across historical data to retrieve win rates, maximum drawdown curves, and annualized Sharpe metrics.',
              },
              {
                icon: Shield,
                title: 'Stress Shock Simulators',
                desc: 'Review portfolio beta sensitivities against extreme crash scenarios including the 2020 COVID crash or custom rate hike cycles.',
              },
            ].map((f, i) => (
              <div key={i} className="card" style={{ padding: 24 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16, color: 'var(--amber)'
                }}>
                  <f.icon size={18} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" style={{ padding: '60px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.08em' }}>SUPPORT</span>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginTop: 6, letterSpacing: '-0.02em' }}>Frequently Asked Questions</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-2)'}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <HelpCircle size={15} color="var(--amber)" />
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-2)' }}>{faq.q}</span>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--muted)' }}>{isOpen ? '−' : '+'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA Gradient banner */}
      <section style={{ padding: '60px 24px 80px' }}>
        <div style={{
          maxWidth: 1040, margin: '0 auto', borderRadius: 12,
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg-2) 100%)',
          border: '1px solid var(--border)', padding: '54px 40px',
          display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 32, alignItems: 'center',
          boxShadow: '0 20px 48px rgba(0,0,0,0.4)', textAlign: 'left'
        }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 12, letterSpacing: '-0.02em' }}>
              Unlock Institutional Grade Alpha
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
              Join quantitative managers and retail investors shielding capital with adaptive regime-aware algorithms. No credit card required.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                "Instant vectorized strategy backtesting",
                "Automatic volatility indicators (India VIX) shield",
                "Groq LLM-driven natural language allocation receipts"
              ].map((tick, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--bull-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={8} color="var(--bull)" strokeWidth={3} />
                  </div>
                  {tick}
                </div>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em' }}>GET STARTED INSTANTLY</div>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 13.5 }}>
                Create Free Account <ArrowUpRight size={14} style={{ marginLeft: 4 }} />
              </button>
            </Link>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn btn-ghost" style={{ width: '100%', padding: '11px', fontSize: 13.5 }}>
                Access Quant Terminal
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Multi-Column Regulatory Compliant Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '56px 40px 32px', background: 'var(--bg-2)' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          
          {/* Main columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 0.9fr 1fr', gap: 32, marginBottom: 44 }}>
            {/* Col 1: Branding */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Activity size={15} color="var(--amber)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>P.R.A.V.A.H</span>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 16 }}>
                Predictive Regime-Adaptive Valuation & Allocation Hub. Built for institutional-grade portfolio rebalancing.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--bull)', background: 'rgba(16,185,129,0.06)', padding: '4px 10px', borderRadius: 4, fontWeight: 600 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bull)' }} />
                System Operational
              </div>
            </div>

            {/* Col 2: Platform */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em', marginBottom: 14 }}>PLATFORM</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Terminal Dashboard</Link>
                <Link href="/portfolio" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>AI Portfolio Builder</Link>
                <Link href="/backtest" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Backtest Engine</Link>
                <Link href="/stress" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Stress Simulator</Link>
              </div>
            </div>

            {/* Col 3: Resources */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em', marginBottom: 14 }}>RESOURCES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <a href="#features" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Features Overview</a>
                <a href="#comparison" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Backtest Studies</a>
                <a href="#faq" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Platform FAQ</a>
                <a href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>Quant Docs</a>
              </div>
            </div>

            {/* Col 4: Regulatory Disclaimer */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.04em', marginBottom: 14 }}>REGULATORY WARNING</div>
              <p style={{ fontSize: 10, color: 'var(--muted-2)', lineHeight: 1.4 }}>
                Investment in securities market are subject to market risks. Read all the related documents carefully before investing. Backtested performance results have certain inherent limitations and do not represent actual trading.
              </p>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--muted-2)' }}>
            <div>
              © {new Date().getFullYear()} PRAVAH Quant Technologies. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <a href="#" style={{ color: 'var(--muted-2)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-2)'}>SEBI Disclaimer</a>
              <a href="#" style={{ color: 'var(--muted-2)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-2)'}>Terms of Use</a>
              <a href="#" style={{ color: 'var(--muted-2)', textDecoration: 'none' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-2)'}>Risk Disclosure</a>
            </div>
          </div>

        </div>
      </footer>
    </div>
  )
}
