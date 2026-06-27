# PRAVAH — UI Implementation Prompt for Gemini

## Context

You are implementing the full UI for **P.R.A.V.A.H** (Predictive Regime-Adaptive Valuation & Allocation Hub), a quantitative trading platform for Indian markets built with **Next.js 15 App Router + TypeScript + Tailwind CSS v4**.

**Project directory:** `frontend/`
**Tech stack:** Next.js App Router, TypeScript, Tailwind v4 (`@import "tailwindcss"` in globals.css), inline `style={{}}` props for custom CSS vars, Recharts for portfolio charts, lucide-react for icons.

**Design system (already set up in `frontend/app/globals.css`):**

- Background: `#060B14` (var(--bg))
- Surface: `#0B1320` (var(--surface))
- Border: `#1A2B40` (var(--border))
- **Brand accent: `#F59E0B` amber/golden** (var(--amber)) — NOT emerald green
- Bull green: `#22C55E` (var(--bull))
- Bear red: `#F43F5E` (var(--bear))
- Text: `#F1F5F9` (var(--text)), Muted: `#64748B` (var(--muted))
- Font: Inter + JetBrains Mono (from Google Fonts)
- Pre-built CSS utility classes: `.card`, `.card-sm`, `.metric-card`, `.badge`, `.badge-bull`, `.badge-bear`, `.badge-amber`, `.btn`, `.btn-primary`, `.btn-ghost`, `.input`, `.select`, `.label`, `.font-mono`, `.page-title`, `.page-subtitle`, `.section-title`, `.grid-2`, `.grid-3`, `.grid-4`, `.spinner`, `.divider`, `.premium-table`, `.progress-bar`, `.progress-fill`, `.tab-bar`, `.tab`, `.tab.active`, `.signal-card`, `.scenario-card`, `.alert`, `.alert-success`, `.alert-error`, `.animate-fade-up`, `.animate-marquee-container`, `.animate-marquee-inner`

**Existing app structure:**

```
frontend/
  app/
    globals.css          ← DONE (CSS vars + utility classes)
    layout.tsx           ← DONE (Google Fonts import)
    page.tsx             ← DONE (landing page)
    login/page.tsx       ← DONE
    signup/page.tsx      ← DONE
    onboarding/page.tsx  ← DONE
    dashboard/
      layout.tsx         ← EXISTS
      page.tsx           ← EXISTS
    portfolio/page.tsx   ← EXISTS
    research/page.tsx    ← EXISTS
    backtest/page.tsx    ← EXISTS
    stress-test/page.tsx ← EXISTS
    profile/
      layout.tsx         ← DONE (same pattern as dashboard/layout.tsx)
      page.tsx           ← NEEDS TO BE CREATED ← YOU WRITE THIS
  components/
    layout/
      Sidebar.tsx        ← EXISTS (has /profile link added)
      TopBar.tsx         ← EXISTS (has logout button added)
    profile/
      BehavioralProfiling.tsx  ← NEEDS TO BE CREATED ← YOU WRITE THIS
    backtest/
      EquityCurveChart.tsx     ← NEEDS TO BE CREATED ← YOU WRITE THIS
  lib/
    api.ts    ← EXISTS (auth methods: signup, login, verifyOtp, saveOnboarding, getUserProfile, updateProfiling, getHoldingsAnalysis, importCSV already added)
    types.ts  ← EXISTS
    utils.ts  ← EXISTS
```

---

## FILES YOU NEED TO CREATE

### 1. `frontend/components/backtest/EquityCurveChart.tsx`

Recharts `LineChart` comparing PRAVAH strategy vs Buy & Hold benchmark.

**Props:** `data: { date: string; strategy: number; market: number }[]`

**Implementation:**

```tsx
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
```

---

### 2. `frontend/components/profile/BehavioralProfiling.tsx`

5-section behavioral risk profiling form. Uses `api.updateProfiling()`.

**Props:**

```ts
interface BehavioralProfilingProps {
  email: string
  initialData?: {
    past_experience: string
    investment_style: string
    loss_behavior: string
    financial_knowledge: number
    tax_slab: string
  }
  onSaveSuccess?: () => void
}
```

**Sections:**

1. **Investment Experience** — 3-card grid: BEGINNER / INTERMEDIATE / ADVANCED

   - BEGINNER: "0-1 yrs experience. Prefers blue chip index weights."
   - INTERMEDIATE: "1-3 yrs experience. Understands drawdown dynamics."
   - ADVANCED: "3+ yrs experience. Comfortable with active swing weights."
2. **Tactical Strategy Preference** — 2x2 card grid: PASSIVE / ACTIVE / GROWTH / DIVIDEND

   - PASSIVE: "Nifty ETFs and long-term sector compounding."
   - ACTIVE: "Regime-adaptive swing rebalancing & indicators."
   - GROWTH: "High beta allocations to Tech & Infrastructure."
   - DIVIDEND: "Value stocks, stable FMCG & Energy yields."
3. **Market Stress Reaction** — 3-card grid: SELL / HOLD / BUY_MORE

   - SELL: "Risk-averse. Protects capital at all costs."
   - HOLD: "Sticking to strategy through business cycles."
   - BUY_MORE: "Aggressive value buying on index dips."
4. **Quantitative Financial Knowledge** — range slider 1–5 with labels:

   - 1=Novice, 2=Familiar, 3=Proficient, 4=Advanced, 5=Expert
   - Show current label next to value
5. **Tax Bracket Allocations** — 2x2 card grid: UNDER_5L / 5L_15L / 15L_30L / OVER_30L

   - UNDER_5L: "Exempt (< ₹5L)" — "Focus strictly on growth optimization."
   - 5L_15L: "Standard (₹5-15L)" — "Balanced capital gains structures."
   - 15L_30L: "Higher (₹15-30L)" — "Focus on index compounding offsets."
   - OVER_30L: "Super (₹30L+)" — "Max tax-saving dividend reallocation bias."

**Selected card style:** `border: '1px solid var(--amber)'`, `background: 'rgba(245,158,11,0.04)'`, show `<Check size={14} color="var(--amber)" />` on right
**Unselected card style:** `border: '1px solid var(--border)'`, `background: 'rgba(255,255,255,0.01)'`

**Save button** at bottom calls `api.updateProfiling(email, pastExp, style, lossBehavior, knowledge, taxSlab)`. Show success/error message.

Icons to import from lucide-react: `Shield, Brain, TrendingUp, HelpCircle, Check, Award`

---

### 3. `frontend/app/profile/page.tsx`

Full user profile/settings page. Auth guard: reads `pravah_user` from localStorage, redirects to `/login` if missing.

**Layout:** Two-column grid: `320px` left column + `1fr` right column.

**Left column contains two cards:**

**Card A — Identity Card (textAlign: center):**

- Avatar: circular div (64x64), gradient `linear-gradient(135deg, #F59E0B, #D97706)`, shows first letter of name in black, font size 24, font weight 800
- Name (h2, 17px, bold), Email (12px, muted, JetBrains Mono)
- Stats row: "Account Tier" → `QUANT EDGE MEMBER` (amber, 11px bold), "Status" → `ACTIVE INVESTOR` (bull green, with 6px green dot)

**Card B — Credential Secrets:**

- Header: `<Key size={14} color="var(--amber)" />` + "Credential Secrets"
- Two masked inputs (type="password" with toggle Eye/EyeOff button):
  - "GROQ API KEY" — display value: `"gsk_demo_••••••••••••••••••••••"` (read-only)
  - "MONGODB CONNECTION URI" — display value: `"mongodb+srv://••••••••••"` (read-only)
- Both inputs: `fontSize: 11.5, fontFamily: 'JetBrains Mono'`, read-only

**Right column — Tabbed card (3 tabs):**

**Tab 1: "Quant parameters"**
Form with:

- Capital input (number, JetBrains Mono, fontSize 15, fontWeight 700, step 50000)
- 2-col grid: Goal select (Growth/Capital Hedging/Dividend Income/Active Momentum Trading) + Horizon select (12/24/36/60 months)
- Risk tolerance: 3-button toggle (LOW/MODERATE/HIGH) — active: amber border + amber text + amber bg (rgba 0.04)
- Sectors text input (placeholder "Technology, Finance, Energy...")
- Save button `btn btn-primary` aligned right — calls `api.saveOnboarding()`

**Tab 2: "Risk Profiling"**
Renders `<BehavioralProfiling email={email} initialData={profilingData} onSaveSuccess={refreshProfile} />`

**Tab 3: "Import Portfolio"**

- Dashed border card with CSV file input (accept=".csv") + "Import & Analyze Holdings" button
- After upload (calls `api.importCSV(file)`), shows holdings dashboard:
  - 4-metric cards row: Imported Value / Total Investment / Unrealized P&L (green if positive, red if negative) / Portfolio Beta (amber)
  - 2-col grid: Left = Recharts `PieChart` with `Pie` (innerRadius 45, outerRadius 65) for sector splits + legend; Right = AI Rebalancing Insights (styled alert boxes, green for INCREASE, red for REDUCE)
  - Holdings table: Symbol | Sector | Quantity | Buy Price | LTP (amber) | Valuation | P&L% (green/red)
- Empty state when no holdings: centered icon + text "No Holdings Imported Yet"

**Data flow:**

```ts
useEffect(() => {
  const session = localStorage.getItem('pravah_user')
  if (!session) { router.push('/login'); return }
  const parsed = JSON.parse(session)
  setSessionUser(parsed); setName(parsed.name); setEmail(parsed.email)
  
  // Fetch profile from API, fallback gracefully
  Promise.all([
    api.getUserProfile(parsed.email),
    api.getHoldingsAnalysis(parsed.holdings || [])
  ]).then(([profile, holdings]) => {
    setCapital(String(profile.capital || '500000'))
    setGoal(profile.goal || 'growth')
    setRisk(profile.risk || 'MODERATE')
    setHorizon(profile.horizon || '36')
    setSectors(profile.sectors || 'Technology, Finance')
    setProfilingData({ past_experience: profile.past_experience, investment_style: profile.investment_style, loss_behavior: profile.loss_behavior, financial_knowledge: profile.financial_knowledge, tax_slab: profile.tax_slab })
    if (holdings?.imported) setHoldingsData(holdings)
  }).catch(() => {
    // Graceful fallback — keep default form values
  }).finally(() => setLoading(false))
}, [router])
```

**Loading state:** Centered spinner + "Fetching quant profile from database..." text

**Imports needed:**

```tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Shield, Key, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw, Database, AlertTriangle } from 'lucide-react'
import BehavioralProfiling from '@/components/profile/BehavioralProfiling'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { api } from '@/lib/api'
```

**Pie chart colors:** `['#F59E0B', '#22C55E', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']`

---

## IMPORTANT NOTES

1. **No mock data** — all data comes from API calls. Use graceful fallbacks (try/catch, empty states) when API is unavailable.
2. **Color scheme:** Use `var(--amber)` = `#F59E0B` (golden amber). The reference project used emerald green but we use amber.
3. **All styling:** Use inline `style={{}}` props with CSS variables. Tailwind utility classes can supplement.
4. **Auth guard pattern:** Check `localStorage.getItem('pravah_user')` in `useEffect`. If null, `router.push('/login')`.
5. **api.ts methods available:**

   - `api.signup(name, email, password)` → `{ message }` or `{ detail }`
   - `api.login(email, password)` → `{ requires_otp: true }` or `{ user }` or `{ detail }`
   - `api.verifyOtp(email, otp)` → `{ user }` or `{ message }` or `{ detail }`
   - `api.saveOnboarding({ goal, risk, horizon, sectors, capital })` → saves onboarding
   - `api.getUserProfile(email)` → `{ capital, goal, risk, horizon, sectors, past_experience, investment_style, loss_behavior, financial_knowledge, tax_slab }`
   - `api.updateProfiling(email, profiling)` → saves behavioral profiling
   - `api.getHoldingsAnalysis(holdings[])` → `{ imported: bool, metrics: {...}, sector_splits: [...], holdings: [...], rebalancing: [...] }`
   - `api.importCSV(file: File)` → parses CSV, returns holdings analysis
6. **File input for CSV:** `<input type="file" accept=".csv" onChange={e => setImportFile(e.target.files?.[0] || null)} />`
7. **In demo mode** (no backend), all API calls fail — handle with try/catch and show appropriate empty states or defaults.

---

## SUMMARY OF FILES TO WRITE

| File                                                    | Lines est. |
| ------------------------------------------------------- | ---------- |
| `frontend/components/backtest/EquityCurveChart.tsx`   | ~35 lines  |
| `frontend/components/profile/BehavioralProfiling.tsx` | ~180 lines |
| `frontend/app/profile/page.tsx`                       | ~350 lines |

Write all three files. Use the CSS variable design system. No mock data — just real API calls with graceful fallbacks.
