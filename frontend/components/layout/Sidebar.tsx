'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, PieChart, LineChart,
  FlaskConical, Zap, Activity, User
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/portfolio', label: 'Portfolio',   icon: PieChart },
  { href: '/research',  label: 'Research',    icon: LineChart },
  { href: '/backtest',  label: 'Backtest',    icon: FlaskConical },
  { href: '/stress-test', label: 'Stress Test', icon: Zap },
  { href: '/profile',   label: 'User Profile', icon: User },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('pravah_user')
    if (!user) {
      router.push('/login')
    } else {
      setIsReady(true)
    }
  }, [router])

  if (!isReady) return null // Avoid flash of sidebar content before redirect


  return (
    <aside className="app-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand logo header */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--amber)', fontFamily: 'monospace' }}>P</span>
          </div>
          <div>
            <div style={{
              fontWeight: 700, fontSize: 14.5, letterSpacing: '-0.02em',
              color: 'var(--text)'
            }}>P.R.A.V.A.H</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', fontWeight: 600 }}>
              QUANT PLATFORM
            </div>
          </div>
        </div>
      </div>

      {/* Navigation link rows */}
      <nav style={{ flex: 1, padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                background: active ? 'var(--surface-hover)' : 'transparent',
                color: active ? 'var(--amber)' : 'var(--muted)',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                transition: 'all 0.15s ease-in-out',
                cursor: 'pointer',
                border: active ? '1px solid var(--border)' : '1px solid transparent'
              }}
                onMouseEnter={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.background = 'var(--surface-hover)'
                    el.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.background = 'transparent'
                    el.style.color = 'var(--muted)'
                  }
                }}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Simplified details footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10.5, color: 'var(--muted-2)', lineHeight: 1.4 }}>
          QuantEdge Terminal v2.0<br />
          Production Build
        </div>
      </div>
    </aside>
  )
}
