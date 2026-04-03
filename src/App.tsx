// src/App.tsx — Prop Firm Empire v2 | Bloomberg Terminal HUD
// Full 6-tab trading dashboard | Real Supabase CRUD | Schema-correct

import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'

// ─────────────────────────────────────────────────────────────
// TYPES — match exact Supabase column names
// ─────────────────────────────────────────────────────────────

interface PropFirm {
  id: string
  name: string
  slug?: string
  challenge_cost_100k: number
  refundable?: boolean
  phase1_target?: number
  phase2_target?: number
  daily_loss_limit?: number
  max_drawdown?: number
  payout_split: number
  max_funded_accounts?: number
  website_url?: string
  notes?: string
  is_israel_friendly?: boolean
}

interface FundedAccount {
  id: string
  prop_firm_id: string
  account_size: number
  start_date: string
  status: string
  total_profit?: number
  current_month_profit: number
  total_payouts_received?: number
  notes?: string
  prop_firms?: PropFirm
}

interface Challenge {
  id: string
  prop_firm_id: string
  account_size: number
  cost: number
  purchase_date: string
  phase: number
  current_profit: number
  phase1_target: number
  phase2_target?: number
  status: string
  estimated_pass_date?: string
  funded_account_id?: string
  notes?: string
  prop_firms?: PropFirm
}

interface DailyLog {
  id: string
  funded_account_id: string
  log_date: string
  pnl: number
  locked?: boolean
  notes?: string
}

interface TradingSettings {
  id?: string
  daily_target: number
  monthly_target: number
  total_capital_goal: number
  payout_split: number
  reinvestment_rate: number
  avg_challenge_cost?: number
  pass_rate: number
}

interface LiveAccountData {
  id?: string
  funded_account_id: string
  equity: number
  balance: number
  daily_pnl: number
  open_positions: number
  floating_pnl: number
  last_update: string
}

// ─────────────────────────────────────────────────────────────
// SAMPLE / FALLBACK DATA
// ─────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]

const SAMPLE_FIRMS: PropFirm[] = [
  { id: '1', name: 'E8 Markets', challenge_cost_100k: 228, payout_split: 80, website_url: 'https://e8funding.com', phase1_target: 8000, phase2_target: 4000, daily_loss_limit: 5, max_drawdown: 8 },
  { id: '2', name: 'Top One Trader', challenge_cost_100k: 250, payout_split: 80, website_url: 'https://toponetrader.com', phase1_target: 8000, phase2_target: 4000, daily_loss_limit: 5, max_drawdown: 8 },
  { id: '3', name: 'TopTier Trader', challenge_cost_100k: 299, payout_split: 80, website_url: 'https://toptiertader.com', phase1_target: 8000, phase2_target: 4000, daily_loss_limit: 5, max_drawdown: 8 },
  { id: '4', name: 'Maven Trading', challenge_cost_100k: 388, payout_split: 80, website_url: 'https://maventrading.io', phase1_target: 8000, phase2_target: 4000, daily_loss_limit: 5, max_drawdown: 8 },
  { id: '5', name: 'The5ers', challenge_cost_100k: 545, payout_split: 80, website_url: 'https://the5ers.com', phase1_target: 8000, phase2_target: 4000, daily_loss_limit: 4, max_drawdown: 8 },
  { id: '6', name: 'FTMO', challenge_cost_100k: 580, payout_split: 80, website_url: 'https://ftmo.com', phase1_target: 10000, phase2_target: 5000, daily_loss_limit: 5, max_drawdown: 10 },
]

const SAMPLE_ACCOUNTS: FundedAccount[] = [
  { id: 'acc1', prop_firm_id: '6', account_size: 100000, start_date: '2026-03-01', current_month_profit: 3785, status: 'active', prop_firms: SAMPLE_FIRMS[5] },
]

const SAMPLE_DAILY_LOGS: DailyLog[] = Array.from({ length: 10 }, (_, i) => ({
  id: `log${i}`, funded_account_id: 'acc1',
  log_date: new Date(Date.now() - (9 - i) * 86400000).toISOString().split('T')[0],
  pnl: 430 + Math.sin(i) * 120 + Math.random() * 60,
  locked: false, notes: '',
}))

const SAMPLE_SETTINGS: TradingSettings = {
  daily_target: 500, monthly_target: 10000, total_capital_goal: 2000000,
  payout_split: 80, reinvestment_rate: 50, avg_challenge_cost: 350, pass_rate: 80,
}

const SAMPLE_LIVE: LiveAccountData = {
  funded_account_id: 'acc1', equity: 103785, balance: 103785,
  daily_pnl: 473.5, open_positions: 3, floating_pnl: 0,
  last_update: new Date().toISOString(),
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const S = {
  header: {
    background: 'rgba(10,10,15,0.97)',
    borderBottom: '1px solid rgba(0,212,255,0.2)',
    backdropFilter: 'blur(10px)',
    position: 'sticky' as const, top: 0, zIndex: 100, padding: '0 20px',
  },
  headerInner: {
    maxWidth: '1400px', margin: '0 auto',
    display: 'flex', alignItems: 'center',
    gap: '20px', height: '52px', overflowX: 'auto' as const,
  },
  liveDot: (live: boolean) => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '3px 10px', borderRadius: '4px',
    background: live ? 'rgba(0,255,136,0.1)' : 'rgba(100,116,139,0.1)',
    border: `1px solid ${live ? 'rgba(0,255,136,0.3)' : 'rgba(100,116,139,0.3)'}`,
    fontSize: '11px', color: live ? '#00ff88' : '#64748b',
    whiteSpace: 'nowrap' as const,
  }),
  logo: {
    fontSize: '15px', fontWeight: 700, color: '#00d4ff',
    letterSpacing: '2px', whiteSpace: 'nowrap' as const,
    textShadow: '0 0 20px rgba(0,212,255,0.5)',
  },
  chip: (color: string) => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '12px', color, whiteSpace: 'nowrap' as const,
  }),
  clock: { fontSize: '12px', color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' as const },
  tabs: {
    display: 'flex', gap: '2px', padding: '10px 20px 0',
    maxWidth: '1400px', margin: '0 auto', overflowX: 'auto' as const,
  },
  tab: (active: boolean) => ({
    padding: '7px 14px', borderRadius: '6px 6px 0 0',
    fontSize: '11px', fontWeight: 600,
    color: active ? '#00d4ff' : '#64748b',
    background: active ? 'rgba(0,212,255,0.06)' : 'transparent',
    border: active ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
    borderBottom: active ? '2px solid #00d4ff' : '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const,
  }),
  card: {
    background: 'rgba(0,212,255,0.03)',
    border: '1px solid rgba(0,212,255,0.15)',
    boxShadow: '0 0 30px rgba(0,212,255,0.04), inset 0 1px 0 rgba(0,212,255,0.08)',
    borderRadius: '8px', backdropFilter: 'blur(8px)', padding: '20px',
  } as React.CSSProperties,
  lbl: { fontSize: '10px', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: '8px' } as React.CSSProperties,
  val: (color = '#e2e8f0') => ({ fontSize: '26px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' } as React.CSSProperties),
  sub: { fontSize: '11px', color: '#64748b', marginTop: '6px' } as React.CSSProperties,
  bar: { height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' } as React.CSSProperties,
  fill: (pct: number, color: string) => ({
    height: '100%', width: `${Math.min(pct, 100)}%`, background: color,
    borderRadius: '3px', transition: 'width 0.5s ease', boxShadow: `0 0 8px ${color}`,
  } as React.CSSProperties),
  badge: (color: string, bg: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
    letterSpacing: '1px', color, background: bg, border: `1px solid ${color}33`,
  } as React.CSSProperties),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' },
  th: {
    padding: '10px 12px', textAlign: 'left' as const, color: '#64748b', fontSize: '10px',
    letterSpacing: '1px', borderBottom: '1px solid rgba(0,212,255,0.1)',
    fontWeight: 600, textTransform: 'uppercase' as const,
  } as React.CSSProperties,
  td: { padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e2e8f0' } as React.CSSProperties,
  btn: (v: 'primary' | 'secondary' | 'danger' | 'success' = 'primary') => ({
    padding: '6px 14px', borderRadius: '5px', cursor: 'pointer',
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px',
    border: v === 'primary' ? '1px solid rgba(0,212,255,0.4)' : v === 'danger' ? '1px solid rgba(255,51,102,0.4)' : v === 'success' ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,255,255,0.1)',
    background: v === 'primary' ? 'rgba(0,212,255,0.1)' : v === 'danger' ? 'rgba(255,51,102,0.1)' : v === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)',
    color: v === 'primary' ? '#00d4ff' : v === 'danger' ? '#ff3366' : v === 'success' ? '#00ff88' : '#e2e8f0',
    transition: 'all 0.2s',
  } as React.CSSProperties),
  input: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: '5px', padding: '8px 12px', color: '#e2e8f0',
    fontFamily: 'inherit', fontSize: '13px', width: '100%', outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  select: {
    background: '#0d1117', border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: '5px', padding: '8px 12px', color: '#e2e8f0',
    fontFamily: 'inherit', fontSize: '13px', width: '100%', outline: 'none',
    cursor: 'pointer', boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  flabel: { fontSize: '10px', color: '#64748b', letterSpacing: '1px', textTransform: 'uppercase' as const } as React.CSSProperties,
  frow: { display: 'flex', flexDirection: 'column' as const, gap: '5px' },
}

// ─────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0d1117', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px', padding: '10px 14px' }}>
      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '6px' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#00d4ff', fontSize: '13px', fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number'
            ? (p.name?.match(/capital|equity|pnl|profit|payout|kept|reinvest/i)
              ? (p.value >= 0 ? '' : '-') + '$' + Math.abs(p.value).toLocaleString()
              : p.value.toLocaleString())
            : p.value}
        </div>
      ))}
    </div>
  )
}

const Divider = () => <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,255,0.15)', flexShrink: 0 }} />

// ─────────────────────────────────────────────────────────────
// MODAL SYSTEM
// ─────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
  >
    <div style={{ ...S.card, width: '100%', maxWidth: '520px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '12px', letterSpacing: '2px' }}>{title}</div>
        <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: 0 }} onClick={onClose}>✕</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>{children}</div>
    </div>
  </div>
)

// Account Modal
interface AccountModalProps {
  firms: PropFirm[]
  account: FundedAccount | null  // null = new
  onClose: () => void
  onSave: (data: Partial<FundedAccount>, id?: string) => void
  loading: boolean
}
const AccountModal = ({ firms, account, onClose, onSave, loading }: AccountModalProps) => {
  const [f, setF] = useState({
    prop_firm_id: account?.prop_firm_id ?? firms[0]?.id ?? '',
    account_size: account?.account_size ?? 100000,
    start_date: account?.start_date ?? TODAY,
    status: account?.status ?? 'active',
    current_month_profit: account?.current_month_profit ?? 0,
    total_profit: account?.total_profit ?? 0,
    notes: account?.notes ?? '',
  })
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  return (
    <Modal title={account ? 'EDIT FUNDED ACCOUNT' : 'ADD FUNDED ACCOUNT'} onClose={onClose}>
      <div style={S.frow}>
        <span style={S.flabel}>Prop Firm</span>
        <select style={S.select} value={f.prop_firm_id} onChange={e => u('prop_firm_id', e.target.value)}>
          {firms.map(firm => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
        </select>
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Account Size ($)</span>
        <input style={S.input} type="number" value={f.account_size} onChange={e => u('account_size', Number(e.target.value))} />
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Start Date</span>
        <input style={S.input} type="date" value={f.start_date} onChange={e => u('start_date', e.target.value)} />
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Status</span>
        <select style={S.select} value={f.status} onChange={e => u('status', e.target.value)}>
          {['active', 'inactive', 'breached', 'archived'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Current Month Profit ($)</span>
        <input style={S.input} type="number" value={f.current_month_profit} onChange={e => u('current_month_profit', Number(e.target.value))} />
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Total Profit ($)</span>
        <input style={S.input} type="number" value={f.total_profit} onChange={e => u('total_profit', Number(e.target.value))} />
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Notes</span>
        <input style={S.input} type="text" value={f.notes} onChange={e => u('notes', e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button style={S.btn('secondary')} onClick={onClose}>Cancel</button>
        <button style={S.btn('primary')} disabled={loading} onClick={() => onSave(f, account?.id)}>
          {loading ? 'Saving...' : account ? 'Update Account' : 'Add Account'}
        </button>
      </div>
    </Modal>
  )
}

// Challenge Modal
interface ChallengeModalProps {
  firms: PropFirm[]
  challenge: Challenge | null
  onClose: () => void
  onSave: (data: Partial<Challenge>, id?: string) => void
  loading: boolean
}
const ChallengeModal = ({ firms, challenge, onClose, onSave, loading }: ChallengeModalProps) => {
  const defaultFirm = firms[0]
  const [f, setF] = useState({
    prop_firm_id: challenge?.prop_firm_id ?? defaultFirm?.id ?? '',
    account_size: challenge?.account_size ?? 100000,
    cost: challenge?.cost ?? defaultFirm?.challenge_cost_100k ?? 350,
    purchase_date: challenge?.purchase_date ?? TODAY,
    phase: challenge?.phase ?? 1,
    current_profit: challenge?.current_profit ?? 0,
    phase1_target: challenge?.phase1_target ?? defaultFirm?.phase1_target ?? 8000,
    phase2_target: challenge?.phase2_target ?? defaultFirm?.phase2_target ?? 4000,
    status: challenge?.status ?? 'active',
    estimated_pass_date: challenge?.estimated_pass_date ?? '',
    notes: challenge?.notes ?? '',
  })
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  // Auto-fill cost + targets when firm changes
  const onFirmChange = (firmId: string) => {
    const firm = firms.find(f => f.id === firmId)
    if (firm) {
      setF(p => ({
        ...p, prop_firm_id: firmId,
        cost: firm.challenge_cost_100k,
        phase1_target: firm.phase1_target ?? 8000,
        phase2_target: firm.phase2_target ?? 4000,
      }))
    }
  }
  const targetForPhase = f.phase === 2 ? (f.phase2_target || 4000) : f.phase1_target
  const progress = targetForPhase > 0 ? ((f.current_profit / targetForPhase) * 100).toFixed(1) : '0'
  return (
    <Modal title={challenge ? 'EDIT CHALLENGE' : 'ADD CHALLENGE'} onClose={onClose}>
      <div style={S.frow}>
        <span style={S.flabel}>Prop Firm</span>
        <select style={S.select} value={f.prop_firm_id} onChange={e => onFirmChange(e.target.value)}>
          {firms.map(firm => <option key={firm.id} value={firm.id}>{firm.name}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={S.frow}>
          <span style={S.flabel}>Phase</span>
          <select style={S.select} value={f.phase} onChange={e => u('phase', Number(e.target.value))}>
            <option value={1}>Phase 1</option>
            <option value={2}>Phase 2</option>
          </select>
        </div>
        <div style={S.frow}>
          <span style={S.flabel}>Status</span>
          <select style={S.select} value={f.status} onChange={e => u('status', e.target.value)}>
            {['active', 'passed', 'failed', 'refunded'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={S.frow}>
          <span style={S.flabel}>Account Size ($)</span>
          <input style={S.input} type="number" value={f.account_size} onChange={e => u('account_size', Number(e.target.value))} />
        </div>
        <div style={S.frow}>
          <span style={S.flabel}>Challenge Cost ($)</span>
          <input style={S.input} type="number" value={f.cost} onChange={e => u('cost', Number(e.target.value))} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={S.frow}>
          <span style={S.flabel}>Phase 1 Target ($)</span>
          <input style={S.input} type="number" value={f.phase1_target} onChange={e => u('phase1_target', Number(e.target.value))} />
        </div>
        <div style={S.frow}>
          <span style={S.flabel}>Phase 2 Target ($)</span>
          <input style={S.input} type="number" value={f.phase2_target} onChange={e => u('phase2_target', Number(e.target.value))} />
        </div>
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Current Profit ($) — Progress: {progress}%</span>
        <input style={S.input} type="number" value={f.current_profit} onChange={e => u('current_profit', Number(e.target.value))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={S.frow}>
          <span style={S.flabel}>Purchase Date</span>
          <input style={S.input} type="date" value={f.purchase_date} onChange={e => u('purchase_date', e.target.value)} />
        </div>
        <div style={S.frow}>
          <span style={S.flabel}>Est. Pass Date</span>
          <input style={S.input} type="date" value={f.estimated_pass_date} onChange={e => u('estimated_pass_date', e.target.value)} />
        </div>
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Notes</span>
        <input style={S.input} type="text" value={f.notes} onChange={e => u('notes', e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button style={S.btn('secondary')} onClick={onClose}>Cancel</button>
        <button style={S.btn('primary')} disabled={loading} onClick={() => onSave(f, challenge?.id)}>
          {loading ? 'Saving...' : challenge ? 'Update Challenge' : 'Add Challenge'}
        </button>
      </div>
    </Modal>
  )
}

// Daily Log Modal
interface LogModalProps {
  accounts: FundedAccount[]
  log: DailyLog | null
  onClose: () => void
  onSave: (data: Partial<DailyLog>, id?: string) => void
  loading: boolean
}
const LogModal = ({ accounts, log, onClose, onSave, loading }: LogModalProps) => {
  const [f, setF] = useState({
    funded_account_id: log?.funded_account_id ?? accounts[0]?.id ?? '',
    log_date: log?.log_date ?? TODAY,
    pnl: log?.pnl ?? 0,
    notes: log?.notes ?? '',
  })
  const u = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))
  return (
    <Modal title={log ? 'EDIT DAILY LOG' : 'ADD DAILY LOG'} onClose={onClose}>
      <div style={S.frow}>
        <span style={S.flabel}>Account</span>
        <select style={S.select} value={f.funded_account_id} onChange={e => u('funded_account_id', e.target.value)}>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.prop_firms?.name ?? 'Account'} — ${a.account_size.toLocaleString()}</option>)}
        </select>
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Date</span>
        <input style={S.input} type="date" value={f.log_date} onChange={e => u('log_date', e.target.value)} />
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>P&L ($)</span>
        <input style={S.input} type="number" step="0.01" value={f.pnl} onChange={e => u('pnl', Number(e.target.value))} placeholder="e.g. 523.45" />
      </div>
      <div style={S.frow}>
        <span style={S.flabel}>Notes</span>
        <input style={S.input} type="text" value={f.notes} onChange={e => u('notes', e.target.value)} placeholder="Trade summary, setup used..." />
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button style={S.btn('secondary')} onClick={onClose}>Cancel</button>
        <button style={S.btn('primary')} disabled={loading} onClick={() => onSave(f, log?.id)}>
          {loading ? 'Saving...' : log ? 'Update Log' : 'Add Log'}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState(0)
  const [time, setTime] = useState(new Date())
  const [firms, setFirms] = useState<PropFirm[]>(SAMPLE_FIRMS)
  const [accounts, setAccounts] = useState<FundedAccount[]>(SAMPLE_ACCOUNTS)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(SAMPLE_DAILY_LOGS)
  const [settings, setSettings] = useState<TradingSettings>(SAMPLE_SETTINGS)
  const [liveData, setLiveData] = useState<LiveAccountData[]>([SAMPLE_LIVE])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Modal state
  const [accountModal, setAccountModal] = useState<FundedAccount | null | false>(false)
  const [challengeModal, setChallengeModal] = useState<Challenge | null | false>(false)
  const [logModal, setLogModal] = useState<DailyLog | null | false>(false)
  const [accountNew, setAccountNew] = useState(false)
  const [challengeNew, setChallengeNew] = useState(false)
  const [logNew, setLogNew] = useState(false)

  // Projector sliders
  const [monthlyReturn, setMonthlyReturn] = useState(10)
  const [projAccounts, setProjAccounts] = useState(1)
  const [projPassRate, setProjPassRate] = useState(80)
  const [projReinvest, setProjReinvest] = useState(50)

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }
  }, [toast])

  // Supabase load + realtime
  useEffect(() => {
    const load = async () => {
      try {
        const [f, a, c, d, s, l] = await Promise.all([
          supabase.from('prop_firms').select('*').order('challenge_cost_100k'),
          supabase.from('funded_accounts').select('*, prop_firms(*)').order('start_date'),
          supabase.from('challenges').select('*, prop_firms(*)').order('purchase_date', { ascending: false }),
          supabase.from('daily_logs').select('*').order('log_date', { ascending: true }).limit(90),
          supabase.from('trading_settings').select('*').limit(1).single(),
          supabase.from('live_account_data').select('*'),
        ])
        if (f.data?.length) setFirms(f.data)
        if (a.data?.length) setAccounts(a.data)
        if (c.data) setChallenges(c.data)
        if (d.data?.length) setDailyLogs(d.data)
        if (s.data) { setSettings(s.data); setProjReinvest(s.data.reinvestment_rate ?? 50); setProjPassRate(s.data.pass_rate ?? 80) }
        if (l.data?.length) { setLiveData(l.data); setIsLive(true) }
      } catch (e) { console.error('Load error:', e) }
    }
    load()
    const sub = supabase.channel('live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_account_data' }, (p) => {
        setLiveData(prev => {
          const idx = prev.findIndex(x => x.funded_account_id === (p.new as LiveAccountData).funded_account_id)
          if (idx >= 0) { const n = [...prev]; n[idx] = p.new as LiveAccountData; return n }
          return [...prev, p.new as LiveAccountData]
        })
        setIsLive(true)
      })
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  // ── CRUD ─────────────────────────────────────────────────────

  const showOk = (msg: string) => setToast({ msg, ok: true })
  const showErr = (msg: string) => setToast({ msg, ok: false })

  const saveAccount = async (data: Partial<FundedAccount>, id?: string) => {
    setLoading(true)
    try {
      if (id) {
        const { data: u, error } = await supabase.from('funded_accounts').update(data).eq('id', id).select('*, prop_firms(*)').single()
        if (error) throw error
        if (u) setAccounts(p => p.map(a => a.id === id ? u : a))
        showOk('Account updated ✓')
      } else {
        const { data: u, error } = await supabase.from('funded_accounts').insert(data).select('*, prop_firms(*)').single()
        if (error) throw error
        if (u) setAccounts(p => [...p, u])
        showOk('Account added ✓')
      }
    } catch (e: any) { showErr('Error: ' + (e.message ?? 'Unknown')) }
    setLoading(false); setAccountModal(false); setAccountNew(false)
  }

  const archiveAccount = async (id: string) => {
    if (!confirm('Archive this account?')) return
    const { error } = await supabase.from('funded_accounts').update({ status: 'archived' }).eq('id', id)
    if (!error) { setAccounts(p => p.map(a => a.id === id ? { ...a, status: 'archived' } : a)); showOk('Account archived') }
    else showErr('Archive failed')
  }

  const saveChallenge = async (data: Partial<Challenge>, id?: string) => {
    setLoading(true)
    try {
      if (id) {
        const { data: u, error } = await supabase.from('challenges').update(data).eq('id', id).select('*, prop_firms(*)').single()
        if (error) throw error
        if (u) setChallenges(p => p.map(c => c.id === id ? u : c))
        showOk('Challenge updated ✓')
      } else {
        const { data: u, error } = await supabase.from('challenges').insert(data).select('*, prop_firms(*)').single()
        if (error) throw error
        if (u) setChallenges(p => [u, ...p])
        showOk('Challenge added ✓')
      }
    } catch (e: any) { showErr('Error: ' + (e.message ?? 'Unknown')) }
    setLoading(false); setChallengeModal(false); setChallengeNew(false)
  }

  const deleteChallenge = async (id: string) => {
    if (!confirm('Delete this challenge? This cannot be undone.')) return
    const { error } = await supabase.from('challenges').delete().eq('id', id)
    if (!error) { setChallenges(p => p.filter(c => c.id !== id)); showOk('Challenge deleted') }
    else showErr('Delete failed')
  }

  const saveLog = async (data: Partial<DailyLog>, id?: string) => {
    setLoading(true)
    try {
      if (id) {
        const { data: u, error } = await supabase.from('daily_logs').update(data).eq('id', id).select('*').single()
        if (error) throw error
        if (u) setDailyLogs(p => p.map(l => l.id === id ? u : l))
        showOk('Log updated ✓')
      } else {
        const { data: u, error } = await supabase.from('daily_logs').insert(data).select('*').single()
        if (error) throw error
        if (u) setDailyLogs(p => [...p, u].sort((a, b) => a.log_date.localeCompare(b.log_date)))
        showOk('Log added ✓')
      }
    } catch (e: any) { showErr('Error: ' + (e.message ?? 'Unknown')) }
    setLoading(false); setLogModal(false); setLogNew(false)
  }

  const deleteLog = async (id: string) => {
    if (!confirm('Delete this log entry?')) return
    const { error } = await supabase.from('daily_logs').delete().eq('id', id)
    if (!error) { setDailyLogs(p => p.filter(l => l.id !== id)); showOk('Log deleted') }
  }

  // ── Derived Metrics ───────────────────────────────────────

  const activeAccounts = accounts.filter(a => a.status !== 'archived')
  const totalCapital = activeAccounts.reduce((s, a) => s + a.account_size, 0)
  const monthlyProfit = activeAccounts.reduce((s, a) => s + (a.current_month_profit || 0), 0)
  const todayPnl = liveData.reduce((s, l) => s + (l.daily_pnl || 0), 0)
  const monthlyPct = settings.monthly_target > 0 ? (monthlyProfit / settings.monthly_target * 100) : 0
  const recentLogs = dailyLogs.slice(-30)
  const avgDaily = recentLogs.length > 0 ? recentLogs.reduce((s, l) => s + l.pnl, 0) / recentLogs.length : 0
  const totalPnl = dailyLogs.reduce((s, l) => s + l.pnl, 0)
  const daysToMonthlyTarget = avgDaily > 0 ? Math.ceil((settings.monthly_target - monthlyProfit) / avgDaily) : 0
  const avgChallengeCost = settings.avg_challenge_cost ?? 350

  // Running equity chart
  const chartData = (() => {
    const base = activeAccounts[0]?.account_size ?? 100000
    let eq = base
    return recentLogs.map(l => {
      eq += l.pnl
      return { date: l.log_date.slice(5), equity: Math.round(eq), pnl: Math.round(l.pnl * 100) / 100 }
    })
  })()

  // ── Projections ───────────────────────────────────────────

  const calcProjection = () => {
    const rows: any[] = []
    let cap = totalCapital || 100000
    let numAcc = projAccounts
    let cumKept = 0
    for (let m = 1; m <= 24; m++) {
      const gross = cap * (monthlyReturn / 100)
      const payout = gross * (settings.payout_split / 100)
      const reinvested = payout * (projReinvest / 100)
      const kept = payout - reinvested
      const newAcc = Math.floor(Math.floor(reinvested / avgChallengeCost) * (projPassRate / 100))
      numAcc += newAcc
      cap += reinvested
      cumKept += kept
      rows.push({ month: m, accounts: numAcc, capital: Math.round(cap), payout: Math.round(payout), reinvested: Math.round(reinvested), kept: Math.round(kept), cumKept: Math.round(cumKept) })
    }
    return rows
  }
  const projection = calcProjection()
  const monthsToGoal = projection.find(r => r.capital >= settings.total_capital_goal)?.month

  const calcReinvestment = () => {
    const rows: any[] = []
    let cap = totalCapital || 100000
    let numAcc = activeAccounts.length || 1
    let cumKept = 0
    for (let m = 1; m <= 12; m++) {
      const profit = cap * 0.10
      const payout = profit * (settings.payout_split / 100)
      const reinvest = payout * (settings.reinvestment_rate / 100)
      const kept = payout - reinvest
      const challs = Math.floor(reinvest / avgChallengeCost)
      numAcc += Math.floor(challs * (settings.pass_rate / 100))
      cap += reinvest
      cumKept += kept
      rows.push({ month: m, accounts: numAcc, capital: Math.round(cap), profit: Math.round(profit), payout: Math.round(payout), reinvested: Math.round(reinvest), kept: Math.round(kept), cumKept: Math.round(cumKept), challenges: challs })
    }
    return rows
  }
  const reinvestPlan = calcReinvestment()

  // ── Formatters ────────────────────────────────────────────

  const $$ = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
  const $s = (n: number) => (n >= 0 ? '+$' : '-$') + Math.abs(n).toFixed(2)
  const pct = (n: number) => n.toFixed(1) + '%'
  const ratingStars = (cost: number) => {
    const roi = (100000 * 0.10 * 0.80) / cost
    if (roi > 30) return '★★★★★'
    if (roi > 22) return '★★★★'
    return '★★★'
  }
  const statusBadge = (status: string) => {
    const map: Record<string, [string, string]> = {
      active: ['#00ff88', 'rgba(0,255,136,0.1)'],
      passed: ['#00d4ff', 'rgba(0,212,255,0.1)'],
      failed: ['#ff3366', 'rgba(255,51,102,0.1)'],
      refunded: ['#f59e0b', 'rgba(245,158,11,0.1)'],
      breached: ['#ff3366', 'rgba(255,51,102,0.1)'],
      inactive: ['#64748b', 'rgba(100,116,139,0.1)'],
      archived: ['#64748b', 'rgba(100,116,139,0.1)'],
    }
    const [c, bg] = map[status?.toLowerCase()] ?? ['#64748b', 'rgba(100,116,139,0.1)']
    return <span style={S.badge(c, bg)}>{status?.toUpperCase()}</span>
  }

  const TABS = ['📊 DASHBOARD', '💼 FUNDED ACCOUNTS', '🏆 CHALLENGES', '📈 GROWTH PROJECTOR', '🏢 PROP FIRMS DB', '💸 REINVESTMENT PLAN']

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'JetBrains Mono', 'Courier New', monospace", color: '#e2e8f0' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '64px', right: '20px', zIndex: 999,
          background: toast.ok ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,102,0.1)',
          border: `1px solid ${toast.ok ? 'rgba(0,255,136,0.4)' : 'rgba(255,51,102,0.4)'}`,
          borderRadius: '6px', padding: '10px 20px',
          color: toast.ok ? '#00ff88' : '#ff3366',
          fontSize: '12px', fontWeight: 700,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {(accountNew || accountModal !== false) && (
        <AccountModal
          firms={firms}
          account={accountNew ? null : (accountModal as FundedAccount)}
          onClose={() => { setAccountModal(false); setAccountNew(false) }}
          onSave={saveAccount}
          loading={loading}
        />
      )}
      {(challengeNew || challengeModal !== false) && (
        <ChallengeModal
          firms={firms}
          challenge={challengeNew ? null : (challengeModal as Challenge)}
          onClose={() => { setChallengeModal(false); setChallengeNew(false) }}
          onSave={saveChallenge}
          loading={loading}
        />
      )}
      {(logNew || logModal !== false) && (
        <LogModal
          accounts={activeAccounts}
          log={logNew ? null : (logModal as DailyLog)}
          onClose={() => { setLogModal(false); setLogNew(false) }}
          onSave={saveLog}
          loading={loading}
        />
      )}

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={S.liveDot(isLive)} className="live-badge">
            <span style={{ fontSize: '8px' }}>●</span> {isLive ? 'LIVE' : 'DEMO'}
          </div>
          <div style={S.logo}>⚡ PROP FIRM EMPIRE</div>
          <Divider />
          <div style={S.chip('#00d4ff')}>💰 {$$(totalCapital)}</div>
          <Divider />
          <div style={S.chip(todayPnl >= 0 ? '#00ff88' : '#ff3366')}>📈 {$s(todayPnl)}</div>
          <Divider />
          <div style={S.chip('#f59e0b')}>🎯 {pct(monthlyPct)} monthly</div>
          <Divider />
          <div style={S.chip('#06b6d4')}>🏦 {activeAccounts.length} funded</div>
          <Divider />
          <div style={S.chip('#a78bfa')}>📋 {challenges.filter(c => c.status === 'active').length} active challenges</div>
          <div style={S.clock}>{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        </div>
        <div style={S.tabs}>
          {TABS.map((t, i) => <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>)}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>

        {/* ══════════════════════════════════════════════════════
            TAB 0 — DASHBOARD
        ══════════════════════════════════════════════════════ */}
        {tab === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {[
                { label: 'TOTAL FUNDED CAPITAL', value: $$(totalCapital), color: '#00d4ff', sub: `${activeAccounts.length} active account${activeAccounts.length !== 1 ? 's' : ''}` },
                { label: "TODAY'S P&L", value: $s(todayPnl), color: todayPnl >= 0 ? '#00ff88' : '#ff3366', sub: `Target: ${$$(settings.daily_target)}/day` },
                { label: 'MONTHLY PROGRESS', value: pct(monthlyPct), color: monthlyPct >= 100 ? '#00ff88' : '#f59e0b', sub: `${$$(monthlyProfit)} / ${$$(settings.monthly_target)}` },
                { label: 'AVG DAILY P&L', value: $s(avgDaily), color: avgDaily >= settings.daily_target ? '#00ff88' : '#f59e0b', sub: `${daysToMonthlyTarget > 0 ? daysToMonthlyTarget + 'd to target' : 'Target hit!'}` },
                { label: 'TOTAL LOGGED P&L', value: $$(totalPnl), color: '#a78bfa', sub: `Over ${dailyLogs.length} trading days` },
                { label: 'CAPITAL GOAL', value: pct(totalCapital / settings.total_capital_goal * 100), color: '#06b6d4', sub: `Goal: ${$$(settings.total_capital_goal)}` },
              ].map((m, i) => (
                <div key={i} style={S.card}>
                  <div style={S.lbl}>{m.label}</div>
                  <div style={S.val(m.color)}>{m.value}</div>
                  <div style={S.sub}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Daily Target Alert */}
            {todayPnl >= settings.daily_target && (
              <div style={{ border: '1px solid #00ff88', background: 'rgba(0,255,136,0.05)', borderRadius: '8px', padding: '12px 20px', color: '#00ff88', fontSize: '13px', fontWeight: 700 }}>
                🎯 DAILY TARGET HIT! {$s(todayPnl)} — Consider locking profits for the day
              </div>
            )}

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={S.card}>
                <div style={{ ...S.lbl, marginBottom: '16px' }}>EQUITY CURVE (30 DAYS)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="equity" stroke="#00d4ff" strokeWidth={2} fill="url(#eqGrad)" name="Equity" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={S.card}>
                <div style={{ ...S.lbl, marginBottom: '16px' }}>DAILY P&L</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => '$' + v} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="pnl" name="P&L" fill="#00ff88" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Feed */}
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={S.lbl}>⚡ LIVE ACCOUNT FEED</div>
                <span style={S.badge(isLive ? '#00ff88' : '#64748b', isLive ? 'rgba(0,255,136,0.1)' : 'rgba(100,116,139,0.1)')} className="live-badge">
                  ● {isLive ? 'cTrader CONNECTED' : 'cTrader OFFLINE'}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    {['Account', 'Equity', 'Balance', 'Daily P&L', 'Positions', 'Float P&L', 'Status', 'Last Update'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {activeAccounts.map(acc => {
                      const live = liveData.find(l => l.funded_account_id === acc.id)
                      const online = live && (Date.now() - new Date(live.last_update).getTime()) < 120000
                      return (
                        <tr key={acc.id}>
                          <td style={S.td}>
                            <span style={{ color: '#00d4ff', fontWeight: 700 }}>{acc.prop_firms?.name ?? 'Account'}</span>
                            <br /><span style={{ fontSize: '10px', color: '#64748b' }}>{$$(acc.account_size)}</span>
                          </td>
                          <td style={{ ...S.td, color: '#00ff88', fontWeight: 700 }}>{live ? $$(live.equity) : '—'}</td>
                          <td style={S.td}>{live ? $$(live.balance) : '—'}</td>
                          <td style={{ ...S.td, color: live ? (live.daily_pnl >= 0 ? '#00ff88' : '#ff3366') : '#64748b', fontWeight: 700 }}>
                            {live ? $s(live.daily_pnl) : '—'}
                          </td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{live ? live.open_positions : '—'}</td>
                          <td style={{ ...S.td, color: live ? (live.floating_pnl >= 0 ? '#00ff88' : '#ff3366') : '#64748b' }}>
                            {live ? $s(live.floating_pnl) : '—'}
                          </td>
                          <td style={S.td}>{online ? <span style={S.badge('#00ff88', 'rgba(0,255,136,0.1)')} className="live-badge">● LIVE</span> : <span style={S.badge('#64748b', 'rgba(100,116,139,0.1)')}>● OFFLINE</span>}</td>
                          <td style={{ ...S.td, fontSize: '10px', color: '#64748b' }}>{live ? new Date(live.last_update).toLocaleTimeString() : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Log */}
            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={S.lbl}>TRADING JOURNAL — RECENT LOGS</div>
                <button style={S.btn('primary')} onClick={() => setLogNew(true)}>+ Log Today's P&L</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    {['Date', 'Account', 'P&L', 'Running Total', 'Notes', 'Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[...dailyLogs].reverse().slice(0, 10).map((log, i) => {
                      const acc = accounts.find(a => a.id === log.funded_account_id)
                      const runningTotal = dailyLogs.slice(0, dailyLogs.indexOf(log) + 1).reduce((s, l) => s + l.pnl, 0)
                      return (
                        <tr key={log.id}>
                          <td style={{ ...S.td, color: '#00d4ff' }}>{log.log_date}</td>
                          <td style={S.td}>{acc?.prop_firms?.name ?? 'Account'}</td>
                          <td style={{ ...S.td, color: log.pnl >= 0 ? '#00ff88' : '#ff3366', fontWeight: 700 }}>{$s(log.pnl)}</td>
                          <td style={{ ...S.td, color: '#a78bfa' }}>{$$(runningTotal)}</td>
                          <td style={{ ...S.td, color: '#64748b', fontSize: '11px' }}>{log.notes || '—'}</td>
                          <td style={S.td}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button style={{ ...S.btn('secondary'), padding: '4px 10px' }} onClick={() => { setLogModal(log); setLogNew(false) }}>Edit</button>
                              <button style={{ ...S.btn('danger'), padding: '4px 10px' }} onClick={() => deleteLog(log.id)}>Del</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 1 — FUNDED ACCOUNTS
        ══════════════════════════════════════════════════════ */}
        {tab === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>FUNDED ACCOUNTS</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{activeAccounts.length} active — {$$(totalCapital)} total capital</div>
              </div>
              <button style={S.btn('primary')} onClick={() => setAccountNew(true)}>+ Add Account</button>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                { label: 'TOTAL CAPITAL', value: $$(totalCapital), color: '#00d4ff' },
                { label: 'MONTHLY PROFIT', value: $$(monthlyProfit), color: '#00ff88' },
                { label: 'MONTHLY TARGET', value: pct(monthlyPct), color: '#f59e0b' },
                { label: 'TOTAL P&L (ALL TIME)', value: $$(totalPnl), color: '#a78bfa' },
              ].map((m, i) => (
                <div key={i} style={{ ...S.card, padding: '14px' }}>
                  <div style={{ ...S.lbl, marginBottom: '6px' }}>{m.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {accounts.length === 0 && (
              <div style={{ ...S.card, textAlign: 'center', padding: '48px', color: '#64748b' }}>
                No funded accounts yet. Click "+ Add Account" to get started.
              </div>
            )}

            {accounts.map(acc => {
              const live = liveData.find(l => l.funded_account_id === acc.id)
              const online = live && (Date.now() - new Date(live.last_update).getTime()) < 120000
              const pctMonthly = settings.monthly_target > 0 ? (acc.current_month_profit / settings.monthly_target * 100) : 0
              const ddPct = live ? ((acc.account_size - live.equity) / acc.account_size * 100) : 0
              const maxDD = acc.prop_firms?.max_drawdown ?? 10
              const ddWarning = ddPct > maxDD * 0.7
              const borderColor = ddPct > maxDD * 0.9 ? 'rgba(255,51,102,0.5)' : ddWarning ? 'rgba(245,158,11,0.5)' : 'rgba(0,212,255,0.15)'
              return (
                <div key={acc.id} style={{ ...S.card, border: `1px solid ${borderColor}`, opacity: acc.status === 'archived' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: '18px' }}>{acc.prop_firms?.name ?? 'Prop Firm'}</span>
                      <span style={{ color: '#64748b', fontSize: '13px', marginLeft: '10px' }}>{$$(acc.account_size)} Account</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {online ? <span style={S.badge('#00ff88', 'rgba(0,255,136,0.1)')} className="live-badge">● LIVE</span> : <span style={S.badge('#64748b', 'rgba(100,116,139,0.1)')}>● OFFLINE</span>}
                      {statusBadge(acc.status)}
                      {ddWarning && <span style={S.badge('#ff3366', 'rgba(255,51,102,0.1)')}>⚠ DD {pct(ddPct)}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div><div style={S.lbl}>Monthly P&L</div><div style={S.val('#00ff88')}>{$$(acc.current_month_profit)}</div></div>
                    <div><div style={S.lbl}>Total P&L</div><div style={{ ...S.val('#a78bfa'), fontSize: '20px' }}>{$$(acc.total_profit ?? 0)}</div></div>
                    {live && <>
                      <div><div style={S.lbl}>Live Equity</div><div style={S.val('#00d4ff')}>{$$(live.equity)}</div></div>
                      <div><div style={S.lbl}>Daily P&L</div><div style={S.val(live.daily_pnl >= 0 ? '#00ff88' : '#ff3366')}>{$s(live.daily_pnl)}</div></div>
                      <div><div style={S.lbl}>Open Positions</div><div style={S.val('#f59e0b')}>{live.open_positions}</div></div>
                      <div><div style={S.lbl}>Float P&L</div><div style={{ ...S.val(live.floating_pnl >= 0 ? '#00ff88' : '#ff3366'), fontSize: '20px' }}>{$s(live.floating_pnl)}</div></div>
                    </>}
                    <div>
                      <div style={S.lbl}>Max Drawdown</div>
                      <div style={{ ...S.val(ddPct > maxDD * 0.7 ? '#ff3366' : '#64748b'), fontSize: '20px' }}>{pct(ddPct)} / {maxDD}%</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>MONTHLY TARGET PROGRESS</span>
                      <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>{pct(pctMonthly)} of {$$(settings.monthly_target)}</span>
                    </div>
                    <div style={S.bar}><div style={S.fill(pctMonthly, pctMonthly >= 100 ? '#00ff88' : '#f59e0b')} /></div>
                  </div>

                  {/* Webhook URL */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px' }}>WEBHOOK</span>
                    <span style={{ fontSize: '10px', color: '#06b6d4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      https://yuadrxbvyhbbtbmodsve.supabase.co/functions/v1/ctrader-webhook?account={acc.id}
                    </span>
                    <button style={{ ...S.btn('secondary'), padding: '3px 8px', fontSize: '10px' }}
                      onClick={() => navigator.clipboard?.writeText(`https://yuadrxbvyhbbtbmodsve.supabase.co/functions/v1/ctrader-webhook?account=${acc.id}`).then(() => showOk('URL copied'))}>
                      📋 Copy
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={S.btn('secondary')} onClick={() => { setAccountModal(acc); setAccountNew(false) }}>✏️ Edit</button>
                    {acc.status !== 'archived' && <button style={S.btn('danger')} onClick={() => archiveAccount(acc.id)}>Archive</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2 — CHALLENGES
        ══════════════════════════════════════════════════════ */}
        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>CHALLENGES</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Track & manage all prop firm challenges</div>
              </div>
              <button style={S.btn('primary')} onClick={() => setChallengeNew(true)}>+ Add Challenge</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {[
                { label: 'ACTIVE', value: challenges.filter(c => c.status === 'active').length, color: '#00d4ff' },
                { label: 'TOTAL INVESTED', value: $$( challenges.reduce((s, c) => s + c.cost, 0)), color: '#ff3366' },
                { label: 'AVG PROGRESS', value: pct(challenges.filter(c => c.status === 'active').reduce((s, c) => s + (c.current_profit / c.phase1_target * 100), 0) / Math.max(challenges.filter(c => c.status === 'active').length, 1)), color: '#f59e0b' },
                { label: 'PASSED', value: challenges.filter(c => c.status === 'passed').length, color: '#00ff88' },
                { label: 'FAILED', value: challenges.filter(c => c.status === 'failed').length, color: '#ff3366' },
                { label: 'WIN RATE', value: pct(challenges.length > 0 ? (challenges.filter(c => c.status === 'passed').length / Math.max(challenges.filter(c => ['passed','failed'].includes(c.status)).length, 1)) * 100 : 0), color: '#a78bfa' },
              ].map((m, i) => (
                <div key={i} style={{ ...S.card, padding: '14px' }}>
                  <div style={{ ...S.lbl, marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {challenges.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', padding: '48px', color: '#64748b' }}>
                No challenges yet. Add one to start tracking.
              </div>
            ) : challenges.map(ch => {
              const targetProfit = ch.phase === 2 ? (ch.phase2_target ?? 4000) : ch.phase1_target
              const pctDone = targetProfit > 0 ? (ch.current_profit / targetProfit * 100) : 0
              const daysLeft = ch.estimated_pass_date ? Math.ceil((new Date(ch.estimated_pass_date).getTime() - Date.now()) / 86400000) : 0
              const expectedPayout = targetProfit * (settings.payout_split / 100)
              return (
                <div key={ch.id} style={{ ...S.card, borderColor: ch.status === 'failed' ? 'rgba(255,51,102,0.3)' : ch.status === 'passed' ? 'rgba(0,255,136,0.3)' : 'rgba(0,212,255,0.15)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: '15px' }}>Phase {ch.phase} — {ch.prop_firms?.name ?? 'Prop Firm'}</span>
                      <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '10px' }}>{$$(ch.account_size)} Account</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {statusBadge(ch.status)}
                      {daysLeft > 0 && ch.status === 'active' && <span style={S.badge(daysLeft < 7 ? '#ff3366' : '#f59e0b', daysLeft < 7 ? 'rgba(255,51,102,0.1)' : 'rgba(245,158,11,0.1)')}>{daysLeft}d left</span>}
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>PHASE {ch.phase} PROGRESS</span>
                      <span style={{ fontSize: '10px', color: pctDone >= 100 ? '#00ff88' : '#00d4ff', fontWeight: 700 }}>
                        {$$(ch.current_profit)} / {$$(targetProfit)} ({pct(pctDone)})
                      </span>
                    </div>
                    <div style={S.bar}><div style={S.fill(pctDone, pctDone >= 100 ? '#00ff88' : pctDone > 70 ? '#f59e0b' : '#00d4ff')} /></div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div><div style={S.lbl}>Cost</div><div style={{ color: '#ff3366', fontWeight: 700 }}>{$$(ch.cost)}</div></div>
                    <div><div style={S.lbl}>Phase 1 Target</div><div style={{ color: '#f59e0b', fontWeight: 700 }}>{$$(ch.phase1_target)}</div></div>
                    <div><div style={S.lbl}>Phase 2 Target</div><div style={{ color: '#f59e0b', fontWeight: 700 }}>{ch.phase2_target ? $$(ch.phase2_target) : '—'}</div></div>
                    <div><div style={S.lbl}>Expected Payout</div><div style={{ color: '#00ff88', fontWeight: 700 }}>{$$(expectedPayout)}</div></div>
                    <div><div style={S.lbl}>ROI on Cost</div><div style={{ color: '#a78bfa', fontWeight: 700 }}>{pct((expectedPayout - ch.cost) / ch.cost * 100)}</div></div>
                    <div><div style={S.lbl}>Purchase Date</div><div style={{ color: '#64748b', fontSize: '12px' }}>{ch.purchase_date}</div></div>
                  </div>

                  {ch.notes && <div style={{ fontSize: '11px', color: '#64748b', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', marginBottom: '12px' }}>{ch.notes}</div>}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={S.btn('secondary')} onClick={() => { setChallengeModal(ch); setChallengeNew(false) }}>✏️ Edit</button>
                    {ch.status === 'active' && (
                      <>
                        <button style={S.btn('success')} onClick={() => saveChallenge({ status: 'passed' }, ch.id)}>✓ Pass</button>
                        <button style={S.btn('danger')} onClick={() => saveChallenge({ status: 'failed' }, ch.id)}>✗ Fail</button>
                      </>
                    )}
                    <button style={S.btn('danger')} onClick={() => deleteChallenge(ch.id)}>🗑️ Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3 — GROWTH PROJECTOR
        ══════════════════════════════════════════════════════ */}
        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>GROWTH PROJECTOR</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>24-month compound growth model to $2M</div>
            </div>

            {/* Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Monthly Return %', val: monthlyReturn, set: setMonthlyReturn, min: 2, max: 25, color: '#00ff88', unit: '%' },
                { label: 'Starting Accounts', val: projAccounts, set: setProjAccounts, min: 1, max: 20, color: '#00d4ff', unit: '' },
                { label: 'Challenge Pass Rate %', val: projPassRate, set: setProjPassRate, min: 30, max: 100, color: '#f59e0b', unit: '%' },
                { label: 'Reinvestment Rate %', val: projReinvest, set: setProjReinvest, min: 0, max: 100, color: '#06b6d4', unit: '%' },
              ].map((s, i) => (
                <div key={i} style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', letterSpacing: '1px' }}>{s.label.toUpperCase()}</span>
                    <span style={{ color: s.color, fontWeight: 700, fontSize: '20px' }}>{s.val}{s.unit}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} value={s.val} onChange={e => s.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: s.color }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Milestones */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { goal: 250000, icon: '⭐', label: '$250K' },
                { goal: 500000, icon: '🏆', label: '$500K' },
                { goal: 1000000, icon: '🚀', label: '$1M' },
                { goal: 2000000, icon: '👑', label: '$2M' },
              ].map(m => {
                const reached = projection.find(r => r.capital >= m.goal)
                return (
                  <div key={m.goal} style={{
                    ...S.card, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px',
                    border: reached ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(0,212,255,0.15)',
                    boxShadow: reached ? '0 0 20px rgba(0,255,136,0.15)' : undefined,
                  }}>
                    <span style={{ fontSize: '20px' }}>{m.icon}</span>
                    <div>
                      <div style={{ color: reached ? '#00ff88' : '#64748b', fontWeight: 700, fontSize: '12px' }}>{m.label}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{reached ? `Month ${reached.month}` : 'Not reached in 24mo'}</div>
                    </div>
                  </div>
                )
              })}
              {monthsToGoal && (
                <div style={{ ...S.card, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(0,212,255,0.4)' }}>
                  <span style={{ fontSize: '20px' }}>📅</span>
                  <div>
                    <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '12px' }}>MONTHS TO ${(settings.total_capital_goal / 1000000).toFixed(0)}M</div>
                    <div style={{ fontSize: '24px', color: '#00d4ff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{monthsToGoal}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Chart */}
            <div style={S.card}>
              <div style={{ ...S.lbl, marginBottom: '16px' }}>CAPITAL GROWTH CURVE (24 MONTHS)</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={projection}>
                  <defs>
                    <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="keptGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `M${v}`} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => '$' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'K')} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="capital" stroke="#00d4ff" strokeWidth={2} fill="url(#capGrad)" name="Capital" />
                  <Area type="monotone" dataKey="cumKept" stroke="#00ff88" strokeWidth={2} fill="url(#keptGrad)" name="Cumulative Kept" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Projection Table */}
            <div style={S.card}>
              <div style={{ ...S.lbl, marginBottom: '16px' }}>24-MONTH PROJECTION TABLE</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    {['Month', 'Accounts', 'Capital', 'Payout', 'Reinvested', 'Kept', 'Cumulative Kept'].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {projection.map(r => {
                      const milestone = r.capital >= 2000000 ? '#00ff88' : r.capital >= 1000000 ? '#00d4ff' : r.capital >= 500000 ? '#f59e0b' : undefined
                      return (
                        <tr key={r.month} style={{ background: milestone ? `${milestone}08` : undefined }}>
                          <td style={{ ...S.td, color: '#00d4ff', fontWeight: 700 }}>
                            M{r.month} {r.capital >= 2000000 ? '👑' : r.capital >= 1000000 ? '🚀' : r.capital >= 500000 ? '🏆' : ''}
                          </td>
                          <td style={S.td}>{r.accounts}</td>
                          <td style={{ ...S.td, color: milestone ?? '#e2e8f0', fontWeight: 700 }}>{$$(r.capital)}</td>
                          <td style={{ ...S.td, color: '#00ff88' }}>{$$(r.payout)}</td>
                          <td style={{ ...S.td, color: '#06b6d4' }}>{$$(r.reinvested)}</td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{$$(r.kept)}</td>
                          <td style={{ ...S.td, color: r.cumKept >= 500000 ? '#00ff88' : '#e2e8f0', fontWeight: 700 }}>{$$(r.cumKept)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 4 — PROP FIRMS DB
        ══════════════════════════════════════════════════════ */}
        {tab === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>PROP FIRMS DATABASE</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>All firms sorted by lowest challenge cost — best value first</div>
            </div>

            <div style={S.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    {['Firm', '$100K Challenge', 'Payout Split', 'Phase 1 Target', 'Phase 2 Target', 'Max Drawdown', 'Daily Limit', 'Cost/$1K', 'Est. ROI', 'Rating', 'Website'].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {[...firms].sort((a, b) => a.challenge_cost_100k - b.challenge_cost_100k).map(f => {
                      const costPer1k = (f.challenge_cost_100k / 100000 * 1000).toFixed(2)
                      const estPayout = (f.phase1_target ?? 8000) * (f.payout_split / 100)
                      const roi = ((estPayout - f.challenge_cost_100k) / f.challenge_cost_100k * 100).toFixed(0)
                      return (
                        <tr key={f.id} style={{ borderBottom: '1px solid rgba(0,212,255,0.04)' }}>
                          <td style={{ ...S.td, color: '#00d4ff', fontWeight: 700 }}>
                            {f.name}
                            {f.is_israel_friendly && <span style={{ ...S.badge('#00ff88', 'rgba(0,255,136,0.1)'), marginLeft: '6px', fontSize: '9px' }}>IL ✓</span>}
                          </td>
                          <td style={{ ...S.td, color: '#ff3366', fontWeight: 700 }}>{$$(f.challenge_cost_100k)}</td>
                          <td style={{ ...S.td, color: '#00ff88' }}>{f.payout_split}%</td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{f.phase1_target ? $$(f.phase1_target) : '—'}</td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{f.phase2_target ? $$(f.phase2_target) : '—'}</td>
                          <td style={S.td}>{f.max_drawdown ? f.max_drawdown + '%' : '—'}</td>
                          <td style={S.td}>{f.daily_loss_limit ? f.daily_loss_limit + '%' : '—'}</td>
                          <td style={S.td}>${costPer1k}</td>
                          <td style={{ ...S.td, color: Number(roi) > 1500 ? '#00ff88' : '#e2e8f0', fontWeight: 700 }}>{roi}%</td>
                          <td style={S.td}>{ratingStars(f.challenge_cost_100k)}</td>
                          <td style={S.td}>
                            {f.website_url ? (
                              <a href={f.website_url} target="_blank" rel="noopener noreferrer" style={{ color: '#06b6d4', fontSize: '11px', textDecoration: 'none' }}>↗ Visit</a>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={S.card}>
                <div style={{ ...S.lbl, marginBottom: '16px' }}>CHALLENGE COST COMPARISON</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[...firms].sort((a, b) => a.challenge_cost_100k - b.challenge_cost_100k)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => '$' + v} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 9 }} width={95} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="challenge_cost_100k" fill="#ff3366" name="Challenge Cost" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={S.card}>
                <div style={{ ...S.lbl, marginBottom: '16px' }}>PHASE 1 TARGET COMPARISON</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[...firms].sort((a, b) => (a.phase1_target ?? 0) - (b.phase1_target ?? 0))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => '$' + v} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 9 }} width={95} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="phase1_target" fill="#f59e0b" name="Phase 1 Target" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Best Value Analysis */}
            <div style={S.card}>
              <div style={{ ...S.lbl, marginBottom: '16px' }}>SCALING STRATEGY — BEST VALUE FOR VOLUME</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {[...firms].sort((a, b) => a.challenge_cost_100k - b.challenge_cost_100k).slice(0, 3).map((f, i) => {
                  const estPayout = (f.phase1_target ?? 8000) * (f.payout_split / 100)
                  const roi = ((estPayout - f.challenge_cost_100k) / f.challenge_cost_100k * 100).toFixed(0)
                  const numAccsFrom10k = Math.floor(10000 / f.challenge_cost_100k)
                  return (
                    <div key={f.id} style={{ ...S.card, border: i === 0 ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(0,212,255,0.15)', padding: '16px' }}>
                      {i === 0 && <div style={{ ...S.badge('#00ff88', 'rgba(0,255,136,0.1)'), marginBottom: '8px', display: 'inline-flex' }}>BEST VALUE</div>}
                      <div style={{ color: '#00d4ff', fontWeight: 700, marginBottom: '8px' }}>{f.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.8 }}>
                        Cost: <span style={{ color: '#ff3366' }}>{$$(f.challenge_cost_100k)}</span><br />
                        Expected Payout: <span style={{ color: '#00ff88' }}>{$$(estPayout)}</span><br />
                        ROI: <span style={{ color: '#a78bfa' }}>{roi}%</span><br />
                        Accounts/$10K: <span style={{ color: '#f59e0b' }}>{numAccsFrom10k}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 5 — REINVESTMENT PLAN
        ══════════════════════════════════════════════════════ */}
        {tab === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>REINVESTMENT PLAN</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>12-month compound reinvestment schedule — based on live settings</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                { label: 'PAYOUT SPLIT', value: settings.payout_split + '%', color: '#00ff88', sub: 'From prop firm' },
                { label: 'REINVEST RATE', value: settings.reinvestment_rate + '%', color: '#06b6d4', sub: 'Of payout received' },
                { label: 'KEEP RATE', value: (100 - settings.reinvestment_rate) + '%', color: '#f59e0b', sub: 'Personal income' },
                { label: 'CAPITAL GOAL', value: $$(settings.total_capital_goal), color: '#00d4ff', sub: 'Total funded capital' },
                { label: 'PASS RATE', value: settings.pass_rate + '%', color: '#a78bfa', sub: 'Challenge success' },
                { label: 'AVG CHALLENGE', value: $$(avgChallengeCost), color: '#64748b', sub: 'Cost per $100K' },
              ].map((s, i) => (
                <div key={i} style={{ ...S.card, padding: '14px' }}>
                  <div style={{ ...S.lbl, marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={S.card}>
              <div style={{ ...S.lbl, marginBottom: '16px' }}>CAPITAL COMPOUNDING (12 MONTHS)</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={reinvestPlan}>
                  <defs>
                    <linearGradient id="riGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="kGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => `M${v}`} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={v => '$' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'K')} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="capital" stroke="#00ff88" strokeWidth={2} fill="url(#riGrad)" name="Capital" />
                  <Area type="monotone" dataKey="cumKept" stroke="#00d4ff" strokeWidth={2} fill="url(#kGrad)" name="Cumulative Kept" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div style={S.card}>
              <div style={{ ...S.lbl, marginBottom: '16px' }}>MONTH-BY-MONTH BREAKDOWN</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead><tr>
                    {['Month', 'Accounts', 'Capital', '10% Profit', `Payout (${settings.payout_split}%)`, `Reinvest (${settings.reinvestment_rate}%)`, `Keep (${100 - settings.reinvestment_rate}%)`, 'New Challs', 'Cumulative Kept'].map(h => <th key={h} style={S.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {reinvestPlan.map(r => {
                      const milestone = r.capital >= 2000000 ? '#00ff88' : r.capital >= 1000000 ? '#00d4ff' : r.capital >= 500000 ? '#f59e0b' : undefined
                      return (
                        <tr key={r.month} style={{ background: milestone ? `${milestone}08` : undefined }}>
                          <td style={{ ...S.td, color: '#00d4ff', fontWeight: 700 }}>
                            M{r.month} {r.capital >= 2000000 ? '👑' : r.capital >= 1000000 ? '🚀' : r.capital >= 500000 ? '🏆' : r.capital >= 250000 ? '⭐' : ''}
                          </td>
                          <td style={S.td}>{r.accounts}</td>
                          <td style={{ ...S.td, fontWeight: 700, color: milestone ?? '#e2e8f0' }}>{$$(r.capital)}</td>
                          <td style={{ ...S.td, color: '#00ff88' }}>{$$(r.profit)}</td>
                          <td style={{ ...S.td, color: '#00ff88' }}>{$$(r.payout)}</td>
                          <td style={{ ...S.td, color: '#06b6d4' }}>{$$(r.reinvested)}</td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{$$(r.kept)}</td>
                          <td style={S.td}>{r.challenges}</td>
                          <td style={{ ...S.td, color: '#00ff88', fontWeight: 700 }}>{$$(r.cumKept)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* cTrader Setup Guide */}
            <div style={{ ...S.card, border: '1px solid rgba(245,158,11,0.3)' }}>
              <div style={{ ...S.lbl, marginBottom: '14px', color: '#f59e0b' }}>🤖 cTRADER cBOT SETUP — CONNECT LIVE DATA</div>
              <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.9 }}>
                <div style={{ color: '#e2e8f0', marginBottom: '8px' }}>To connect live equity/P&L to this dashboard:</div>
                <div>1. Open cTrader → Automate → New cBot → paste <span style={{ color: '#00d4ff' }}>PropFirmBot_cTrader.cs</span></div>
                <div>2. Set Webhook URL in cBot parameters to your account's webhook (see Funded Accounts tab)</div>
                <div>3. Build + Start the cBot on your funded account</div>
                <div>4. Dashboard updates every 30 seconds with live equity, P&L, open positions</div>
                <div style={{ marginTop: '10px', color: '#f59e0b' }}>Edge Function: <span style={{ color: '#00d4ff' }}>https://yuadrxbvyhbbtbmodsve.supabase.co/functions/v1/ctrader-webhook</span></div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
