'use client'

import { useState } from 'react'
import { Shield, Brain, TrendingUp, HelpCircle, Check, Award, AlertCircle, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'

interface BehavioralProfilingProps {
  email: string
  initialData?: {
    past_experience?: string
    investment_style?: string
    loss_behavior?: string
    financial_knowledge?: number
    tax_slab?: string
  }
  onSaveSuccess?: () => void
}

const KNOWLEDGE_LABELS: Record<number, string> = {
  1: 'Novice',
  2: 'Familiar',
  3: 'Proficient',
  4: 'Advanced',
  5: 'Expert',
}

export default function BehavioralProfiling({ email, initialData, onSaveSuccess }: BehavioralProfilingProps) {
  const [pastExperience, setPastExperience] = useState(initialData?.past_experience || 'BEGINNER')
  const [investmentStyle, setInvestmentStyle] = useState(initialData?.investment_style || 'PASSIVE')
  const [lossBehavior, setLossBehavior] = useState(initialData?.loss_behavior || 'HOLD')
  const [financialKnowledge, setFinancialKnowledge] = useState(initialData?.financial_knowledge || 3)
  const [taxSlab, setTaxSlab] = useState(initialData?.tax_slab || 'UNDER_5L')

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSuccess(null)
    setError(null)
    try {
      const res = await api.updateProfiling(email, {
        past_experience: pastExperience,
        investment_style: investmentStyle,
        loss_behavior: lossBehavior,
        financial_knowledge: financialKnowledge,
        tax_slab: taxSlab,
      })
      if (res?.detail) {
        setError(res.detail)
      } else {
        setSuccess('Behavioral profile updated successfully!')
        if (onSaveSuccess) onSaveSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update behavioral profile.')
    } finally {
      setSaving(false)
    }
  }

  const cardSelectedStyle = {
    border: '1px solid var(--amber)',
    background: 'rgba(245,158,11,0.04)',
  }

  const cardUnselectedStyle = {
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.01)',
  }

  return (
    <div className="space-y-6">
      {/* 1. Investment Experience */}
      <div>
        <label className="label flex items-center gap-2 mb-2">
          <Award size={14} className="text-amber-500" />
          <span>Investment Experience</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'BEGINNER', label: 'Beginner', desc: '0-1 yrs experience. Prefers blue chip index weights.' },
            { id: 'INTERMEDIATE', label: 'Intermediate', desc: '1-3 yrs experience. Understands drawdown dynamics.' },
            { id: 'ADVANCED', label: 'Advanced', desc: '3+ yrs experience. Comfortable with active swing weights.' },
          ].map((exp) => (
            <div
              key={exp.id}
              onClick={() => setPastExperience(exp.id)}
              style={pastExperience === exp.id ? cardSelectedStyle : cardUnselectedStyle}
              className="p-4 rounded-xl cursor-pointer transition-all hover:border-amber-500/40 relative flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-bold text-gray-200">{exp.label}</p>
                <p className="text-[10.5px] text-gray-500 mt-1 leading-relaxed">{exp.desc}</p>
              </div>
              {pastExperience === exp.id && (
                <div className="absolute top-3 right-3">
                  <Check size={14} color="var(--amber)" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Tactical Strategy Preference */}
      <div>
        <label className="label flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-amber-500" />
          <span>Tactical Strategy Preference</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { id: 'PASSIVE', label: 'Passive', desc: 'Nifty ETFs and long-term sector compounding.' },
            { id: 'ACTIVE', label: 'Active', desc: 'Regime-adaptive swing rebalancing & indicators.' },
            { id: 'GROWTH', label: 'Growth', desc: 'High beta allocations to Tech & Infrastructure.' },
            { id: 'DIVIDEND', label: 'Dividend', desc: 'Value stocks, stable FMCG & Energy yields.' },
          ].map((style) => (
            <div
              key={style.id}
              onClick={() => setInvestmentStyle(style.id)}
              style={investmentStyle === style.id ? cardSelectedStyle : cardUnselectedStyle}
              className="p-4 rounded-xl cursor-pointer transition-all hover:border-amber-500/40 relative flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-bold text-gray-200">{style.label}</p>
                <p className="text-[10.5px] text-gray-500 mt-1 leading-relaxed">{style.desc}</p>
              </div>
              {investmentStyle === style.id && (
                <div className="absolute top-3 right-3">
                  <Check size={14} color="var(--amber)" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Market Stress Reaction */}
      <div>
        <label className="label flex items-center gap-2 mb-2">
          <Shield size={14} className="text-amber-500" />
          <span>Market Stress Reaction</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'SELL', label: 'Sell / Hedge', desc: 'Risk-averse. Protects capital at all costs.' },
            { id: 'HOLD', label: 'Hold Strategy', desc: 'Sticking to strategy through business cycles.' },
            { id: 'BUY_MORE', label: 'Aggressive Buy', desc: 'Aggressive value buying on index dips.' },
          ].map((react) => (
            <div
              key={react.id}
              onClick={() => setLossBehavior(react.id)}
              style={lossBehavior === react.id ? cardSelectedStyle : cardUnselectedStyle}
              className="p-4 rounded-xl cursor-pointer transition-all hover:border-amber-500/40 relative flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-bold text-gray-200">{react.label}</p>
                <p className="text-[10.5px] text-gray-500 mt-1 leading-relaxed">{react.desc}</p>
              </div>
              {lossBehavior === react.id && (
                <div className="absolute top-3 right-3">
                  <Check size={14} color="var(--amber)" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Quantitative Financial Knowledge */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label flex items-center gap-2">
            <Brain size={14} className="text-amber-500" />
            <span>Quantitative Financial Knowledge</span>
          </label>
          <span className="text-xs font-bold text-amber-500 font-mono">
            {financialKnowledge}: {KNOWLEDGE_LABELS[financialKnowledge]}
          </span>
        </div>
        <div className="bg-[#0D1829] border border-[#1A2B40] rounded-xl p-4">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={financialKnowledge}
            onChange={(e) => setFinancialKnowledge(parseInt(e.target.value))}
            className="w-full h-1.5 bg-[#1A2B40] rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-2 font-mono">
            <span>1: Novice</span>
            <span>2: Familiar</span>
            <span>3: Proficient</span>
            <span>4: Advanced</span>
            <span>5: Expert</span>
          </div>
        </div>
      </div>

      {/* 5. Tax Bracket Allocations */}
      <div>
        <label className="label flex items-center gap-2 mb-2">
          <HelpCircle size={14} className="text-amber-500" />
          <span>Tax Bracket Allocations</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { id: 'UNDER_5L', label: 'Exempt (< ₹5L)', desc: 'Focus strictly on growth optimization.' },
            { id: '5L_15L', label: 'Standard (₹5-15L)', desc: 'Balanced capital gains structures.' },
            { id: '15L_30L', label: 'Higher (₹15-30L)', desc: 'Focus on index compounding offsets.' },
            { id: 'OVER_30L', label: 'Super (₹30L+)', desc: 'Max tax-saving dividend reallocation bias.' },
          ].map((tax) => (
            <div
              key={tax.id}
              onClick={() => setTaxSlab(tax.id)}
              style={tax.id === taxSlab ? cardSelectedStyle : cardUnselectedStyle}
              className="p-4 rounded-xl cursor-pointer transition-all hover:border-amber-500/40 relative flex flex-col justify-between"
            >
              <div>
                <p className="text-xs font-bold text-gray-200">{tax.label}</p>
                <p className="text-[10.5px] text-gray-500 mt-1 leading-relaxed">{tax.desc}</p>
              </div>
              {taxSlab === tax.id && (
                <div className="absolute top-3 right-3">
                  <Check size={14} color="var(--amber)" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <p className="text-xs text-emerald-400">{success}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary min-w-[120px]"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
