// src/App.tsx - Prop Firm Empire — Bloomberg Terminal HUD
// Full 6-tab trading dashboard with Supabase integration

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'

// ── Types ──────────────────────────────────────────────
interface PropFirm {
  id: string; name: string; account_size: number
  challenge_cost: number; payout_split: number
  pass_rate: number; website: string
}
interface FundedAccount {
  id: string; prop_firm_id: string; account_size: number
  start_date: string; current_month_profit: number
  status: string; phase: string
  prop_firms?: PropFirm
}
interface Challenge {
  id: string; prop_firm_id: string; phase: number; cost: number
  target_profit: number; current_profit: number
  status: string; start_date: string; deadline: string
  prop_firms?: PropFirm
}
interface DailyLog {
  id: string; funded_account_id: string; date: string
  profit: number; equity: number; notes: string
}
interface TradingSettings {
  daily_target: number; monthly_target: number
  total_capital_goal: number; payout_split: number
  reinvestment_rate: number; pass_rate: number
}
interface LiveAccountData {
  funded_account_id: string; equity: number; balance: number
  daily_pnl: number; open_positions: number
  floating_pnl: number; last_update: string
}

// ── Sample / Fallback Data ──────────────────────────────
const SAMPLE_FIRMS: PropFirm[] = [
  { id: '1', name: 'E8 Markets', account_size: 100000, challenge_cost: 228, payout_split: 80, pass_rate: 85, website: 'https://e8funding.com' },
  { id: '2', name: 'Top One Trader', account_size: 100000, challenge_cost: 250, payout_split: 80, pass_rate: 82, website: 'https://toponetrader.com' },
  { id: '3', name: 'TopTier Trader', account_size: 100000, challenge_cost: 299, payout_split: 80, pass_rate: 80, website: 'https://toptiertader.com' },
  { id: '4', name: 'Maven Trading', account_size: 100000, challenge_cost: 388, payout_split: 80, pass_rate: 78, website: 'https://maventrading.io' },
  { id: '5', name: 'The5ers', account_size: 100000, challenge_cost: 545, payout_split: 80, pass_rate: 75, website: 'https://the5ers.com' },
  { id: '6', name: 'FTMO', account_size: 100000, challenge_cost: 580, payout_split: 80, pass_rate: 80, website: 'https://ftmo.com' },
]
const SAMPLE_ACCOUNTS: FundedAccount[] = [
  { id: 'acc1', prop_firm_id: '6', account_size: 100000, start_date: '2026-03-01', current_month_profit: 3785, status: 'active', phase: '2', prop_firms: SAMPLE_FIRMS[5] }
]
const SAMPLE_DAILY_LOGS: DailyLog[] = Array.from({ length: 8 }, (_, i) => ({
  id: `log${i}`, funded_account_id: 'acc1',
  date: new Date(Date.now() - (7 - i) * 86400000).toISOString().split('T')[0],
  profit: 473 + Math.random() * 40 - 20,
  equity: 100000 + (i + 1) * 490,
  notes: ''
}))
const SAMPLE_SETTINGS: TradingSettings = {
  daily_target: 500, monthly_target: 10000, total_capital_goal: 2000000,
  payout_split: 80, reinvestment_rate: 50, pass_rate: 80
}
const SAMPLE_LIVE: LiveAccountData = {
  funded_account_id: 'acc1', equity: 103785, balance: 103785,
  daily_pnl: 473.50, open_positions: 3, floating_pnl: 0,
  last_update: new Date().toISOString()
}

// ── Style helpers ────────────────────────────────────────
const S = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '0 16px' } as React.CSSProperties,
  header: {
    background: 'rgba(10, 10, 15, 0.95)',
    borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    position: 'sticky' as const, top: 0, zIndex: 100,
    padding: '0 20px',
  },
  headerInner: {
    maxWidth: '1400px', margin: '0 auto',
    display: 'flex', alignItems: 'center',
    gap: '24px', height: '52px', overflowX: 'auto' as const,
  },
  liveDot: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '3px 10px', borderRadius: '4px',
    background: 'rgba(0,255,136,0.1)',
    border: '1px solid rgba(0,255,136,0.3)',
    fontSize: '11px', color: '#00ff88', whiteSpace: 'nowrap' as const,
  },
  logo: {
    fontSize: '16px', fontWeight: 700, color: '#00d4ff',
    letterSpacing: '2px', whiteSpace: 'nowrap' as const,
    textShadow: '0 0 20px rgba(0,212,255,0.5)',
  },
  statChip: (color: string) => ({
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '12px', color, whiteSpace: 'nowrap' as const,
  }),
  clock: { fontSize: '13px', color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' as const },
  tabs: {
    display: 'flex', gap: '4px', padding: '12px 20px 0',
    maxWidth: '1400px', margin: '0 auto', overflowX: 'auto' as const,
  },
  tab: (active: boolean) => ({
    padding: '8px 16px', borderRadius: '6px 6px 0 0',
    fontSize: '12px', fontWeight: 600,
    color: active ? '#00d4ff' : '#64748b',
    background: active ? 'rgba(0,212,255,0.05)' : 'transparent',
    border: active ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent',
    borderBottom: active ? '2px solid #00d4ff' : '1px solid transparent',
    cursor: 'pointer', transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  }),
  card: {
    background: 'rgba(0, 212, 255, 0.03)',
    border: '1px solid rgba(0, 212, 255, 0.15)',
    boxShadow: '0 0 30px rgba(0, 212, 255, 0.05), inset 0 1px 0 rgba(0, 212, 255, 0.1)',
    borderRadius: '8px', backdropFilter: 'blur(8px)',
    padding: '20px',
  } as React.CSSProperties,
  metric: {
    label: { fontSize: '10px', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: '8px' },
    value: (color: string = '#e2e8f0') => ({ fontSize: '28px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }),
    sub: { fontSize: '11px', color: '#64748b', marginTop: '6px' },
  },
  progressBar: (pct: number, color: string) => ({
    height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  }),
  progressFill: (pct: number, color: string) => ({
    height: '100%', width: `${Math.min(pct, 100)}%`,
    background: color, borderRadius: '3px',
    transition: 'width 0.5s ease',
    boxShadow: `0 0 8px ${color}`,
  }),
  badge: (color: string, bg: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 8px', borderRadius: '4px',
    fontSize: '10px', fontWeight: 600, letterSpacing: '1px',
    color, background: bg, border: `1px solid ${color}33`,
  }),
  table: {
    width: '100%', borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  th: {
    padding: '10px 12px', textAlign: 'left' as const,
    color: '#64748b', fontSize: '10px', letterSpacing: '1px',
    borderBottom: '1px solid rgba(0,212,255,0.1)',
    fontWeight: 600, textTransform: 'uppercase' as const,
  },
  td: {
    padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)',
    color: '#e2e8f0',
  },
  btn: (variant: 'primary' | 'secondary' | 'danger' = 'primary') => ({
    padding: '6px 14px', borderRadius: '5px', cursor: 'pointer',
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px',
    border: variant === 'primary' ? '1px solid rgba(0,212,255,0.4)' : variant === 'danger' ? '1px solid rgba(255,51,102,0.4)' : '1px solid rgba(255,255,255,0.1)',
    background: variant === 'primary' ? 'rgba(0,212,255,0.1)' : variant === 'danger' ? 'rgba(255,51,102,0.1)' : 'rgba(255,255,255,0.05)',
    color: variant === 'primary' ? '#00d4ff' : variant === 'danger' ? '#ff3366' : '#e2e8f0',
    transition: 'all 0.2s',
  }),
  input: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: '5px', padding: '8px 12px', color: '#e2e8f0',
    fontFamily: 'var(--font-mono)', fontSize: '13px', width: '100%',
    outline: 'none',
  } as React.CSSProperties,
}

// ── Custom Tooltip ────────────────────────────────────────
const BloombergTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#0d1117', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '6px', padding: '10px 14px' }}>
      <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '6px' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || '#00d4ff', fontSize: '13px', fontWeight: 700 }}>
          {p.name}: {typeof p.value === 'number' ? (p.name?.includes('P&L') || p.name?.includes('profit') ? (p.value >= 0 ? '+' : '') + '$' + p.value.toFixed(2) : '$' + p.value.toLocaleString()) : p.value}
        </div>
      ))}
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────
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

  // Projector state
  const [monthlyReturn, setMonthlyReturn] = useState(10)
  const [startAccounts, setStartAccounts] = useState(1)
  const [passRate, setPassRate] = useState(80)
  const [reinvestRate, setReinvestRate] = useState(50)

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Supabase fetch
  useEffect(() => {
    const load = async () => {
      try {
        const [f, a, c, d, s, l] = await Promise.all([
          supabase.from('prop_firms').select('*'),
          supabase.from('funded_accounts').select('*, prop_firms(*)'),
          supabase.from('challenges').select('*, prop_firms(*)'),
          supabase.from('daily_logs').select('*').order('date', { ascending: true }).limit(30),
          supabase.from('trading_settings').select('*').limit(1).single(),
          supabase.from('live_account_data').select('*'),
        ])
        if (f.data?.length) setFirms(f.data)
        if (a.data?.length) setAccounts(a.data)
        if (c.data) setChallenges(c.data)
        if (d.data?.length) setDailyLogs(d.data)
        if (s.data) setSettings(s.data)
        if (l.data?.length) { setLiveData(l.data); setIsLive(true) }
      } catch {}
    }
    load()

    // Realtime
    const sub = supabase.channel('live').on('postgres_changes', { event: '*', schema: 'public', table: 'live_account_data' }, (p) => {
      setLiveData(prev => {
        const idx = prev.findIndex(x => x.funded_account_id === (p.new as LiveAccountData).funded_account_id)
        if (idx >= 0) { const n = [...prev]; n[idx] = p.new as LiveAccountData; return n }
        return [...prev, p.new as LiveAccountData]
      })
      setIsLive(true)
    }).subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [])

  // ── Derived metrics ───────────────────────────────────
  const totalCapital = accounts.reduce((s, a) => s + a.account_size, 0)
  const monthlyProfit = accounts.reduce((s, a) => s + a.current_month_profit, 0)
  const todayPnl = liveData.reduce((s, l) => s + (l.daily_pnl || 0), 0)
  const monthlyPct = settings.monthly_target > 0 ? (monthlyProfit / settings.monthly_target * 100) : 0
  const avgDaily = dailyLogs.length > 0 ? dailyLogs.reduce((s, l) => s + l.profit, 0) / dailyLogs.length : 0
  const daysToTarget = avgDaily > 0 ? Math.ceil((settings.monthly_target - monthlyProfit) / avgDaily) : 0

  const chartData = dailyLogs.map(l => ({
    date: l.date.slice(5), equity: l.equity, profit: l.profit
  }))

  // ── Growth projection ─────────────────────────────────
  const calcProjection = () => {
    const rows = []
    let capital = accounts.reduce((s, a) => s + a.account_size, 0) || 100000
    let numAccounts = startAccounts
    let cumKept = 0
    for (let m = 1; m <= 18; m++) {
      const grossProfit = capital * (monthlyReturn / 100)
      const payout = grossProfit * (settings.payout_split / 100)
      const reinvested = payout * (reinvestRate / 100)
      const kept = payout - reinvested
      const newChallenges = Math.floor(reinvested / 580)
      const newAccounts = Math.floor(newChallenges * (passRate / 100))
      numAccounts += newAccounts
      capital += reinvested
      cumKept += kept
      rows.push({ month: m, accounts: numAccounts, capital: Math.round(capital), payout: Math.round(payout), reinvested: Math.round(reinvested), kept: Math.round(kept), cumKept: Math.round(cumKept) })
    }
    return rows
  }
  const projection = calcProjection()
  const monthsToGoal = projection.find(r => r.capital >= settings.total_capital_goal)?.month

  // ── Reinvestment Plan ─────────────────────────────────
  const calcReinvestment = () => {
    const rows = []
    let capital = totalCapital || 100000
    let numAccounts = accounts.length || 1
    let cumKept = 0
    for (let m = 1; m <= 12; m++) {
      const monthlyProfitCalc = capital * 0.10
      const payoutAmt = monthlyProfitCalc * (settings.payout_split / 100)
      const reinvestAmt = payoutAmt * (settings.reinvestment_rate / 100)
      const keepAmt = payoutAmt - reinvestAmt
      const newChalls = Math.floor(reinvestAmt / 580)
      const passedChalls = Math.floor(newChalls * (settings.pass_rate / 100))
      numAccounts += passedChalls
      capital += reinvestAmt
      cumKept += keepAmt
      rows.push({ month: m, accounts: numAccounts, capital: Math.round(capital), profit: Math.round(monthlyProfitCalc), payout: Math.round(payoutAmt), reinvested: Math.round(reinvestAmt), kept: Math.round(keepAmt), cumKept: Math.round(cumKept), challenges: newChalls })
    }
    return rows
  }
  const reinvestPlan = calcReinvestment()

  const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtMoneyDec = (n: number) => (n >= 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2)
  const stars = (firm: PropFirm) => {
    const roi = (firm.account_size * (firm.payout_split / 100) * 0.1) / firm.challenge_cost
    if (roi > 12) return '⭐⭐⭐⭐⭐'
    if (roi > 10) return '⭐⭐⭐⭐'
    return '⭐⭐⭐'
  }

  const TABS = ['📊 DASHBOARD', '💼 FUNDED ACCOUNTS', '🏆 CHALLENGES', '📈 GROWTH PROJECTOR', '🏢 PROP FIRMS', '💸 REINVESTMENT']

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div style={S.liveDot} className="live-badge">
            <span style={{ fontSize: '8px' }}>●</span> LIVE
          </div>
          <div style={S.logo}>⚡ PROP FIRM EMPIRE</div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,255,0.2)' }} />
          <div style={S.statChip('#00d4ff')} title="Total Capital">
            💰 {fmtMoney(totalCapital)}
          </div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,255,0.2)' }} />
          <div style={S.statChip(todayPnl >= 0 ? '#00ff88' : '#ff3366')} title="Daily P&L">
            📈 Today: {fmtMoneyDec(todayPnl)}
          </div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(0,212,255,0.2)' }} />
          <div style={S.statChip('#f59e0b')} title="Monthly Target">
            🎯 Monthly: {monthlyPct.toFixed(1)}%
          </div>
          <div style={S.clock}>{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        </div>
        {/* Tabs */}
        <div style={S.tabs}>
          {TABS.map((t, i) => (
            <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ ...S.container, padding: '24px 20px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── TAB 0: DASHBOARD ── */}
        {tab === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {[
                { label: 'TOTAL FUNDED CAPITAL', value: fmtMoney(totalCapital), color: '#00d4ff', sub: `${accounts.length} funded account${accounts.length !== 1 ? 's' : ''}`, tip: 'Total Capital' },
                { label: "TODAY'S P&L", value: fmtMoneyDec(todayPnl), color: todayPnl >= 0 ? '#00ff88' : '#ff3366', sub: `Daily target: ${fmtMoney(settings.daily_target)}`, tip: 'Daily P&L' },
                { label: 'MONTHLY PROGRESS', value: monthlyPct.toFixed(1) + '%', color: '#f59e0b', sub: `${fmtMoney(monthlyProfit)} / ${fmtMoney(settings.monthly_target)}`, tip: 'Monthly Target' },
                { label: 'DAYS TO PAYOUT', value: daysToTarget > 0 ? daysToTarget + 'd' : '—', color: '#06b6d4', sub: `Avg ${fmtMoneyDec(avgDaily)}/day`, tip: 'Days to Goal' },
              ].map((m, i) => (
                <div key={i} style={S.card} title={m.tip}>
                  <div style={S.metric.label}>{m.label}</div>
                  <div style={S.metric.value(m.color)}>{m.value}</div>
                  <div style={S.metric.sub}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Daily Target Alert */}
            {todayPnl >= settings.daily_target && (
              <div style={{ border: '1px solid #00ff88', background: 'rgba(0,255,136,0.05)', borderRadius: '8px', padding: '14px 20px', color: '#00ff88', fontSize: '14px', fontWeight: 700 }}>
                🎯 DAILY TARGET HIT! {fmtMoneyDec(todayPnl)} — Consider locking profits
              </div>
            )}

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={S.card}>
                <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', marginBottom: '16px' }}>EQUITY CURVE (30 DAYS)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} />
                    <Tooltip content={<BloombergTooltip />} />
                    <Area type="monotone" dataKey="equity" stroke="#00d4ff" strokeWidth={2} fill="url(#eqGrad)" name="Equity" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={S.card}>
                <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', marginBottom: '16px' }}>DAILY P&L</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => '$' + v} />
                    <Tooltip content={<BloombergTooltip />} />
                    <Bar dataKey="profit" name="P&L" fill="#00ff88" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Live Feed */}
            <div style={S.card}>
              <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', marginBottom: '16px' }}>⚡ LIVE ACCOUNT FEED</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Account', 'Equity', 'Balance', 'Daily P&L', 'Positions', 'Float P&L', 'Status', 'Last Update'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(acc => {
                      const live = liveData.find(l => l.funded_account_id === acc.id)
                      const secsSinceUpdate = live ? (Date.now() - new Date(live.last_update).getTime()) / 1000 : 999
                      const isOnline = secsSinceUpdate < 60
                      return (
                        <tr key={acc.id} style={{ borderBottom: '1px solid rgba(0,212,255,0.05)' }}>
                          <td style={S.td}>
                            <span style={{ color: '#00d4ff', fontWeight: 700 }}>{acc.prop_firms?.name || 'Unknown'}</span>
                            <br /><span style={{ fontSize: '11px', color: '#64748b' }}>{fmtMoney(acc.account_size)}</span>
                          </td>
                          <td style={{ ...S.td, color: '#00ff88', fontWeight: 700 }}>{live ? fmtMoney(live.equity) : '—'}</td>
                          <td style={S.td}>{live ? fmtMoney(live.balance) : '—'}</td>
                          <td style={{ ...S.td, color: live && live.daily_pnl >= 0 ? '#00ff88' : '#ff3366', fontWeight: 700 }}>
                            {live ? fmtMoneyDec(live.daily_pnl) : '—'}
                          </td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{live ? live.open_positions : '—'}</td>
                          <td style={{ ...S.td, color: live && live.floating_pnl >= 0 ? '#00ff88' : '#ff3366' }}>
                            {live ? fmtMoneyDec(live.floating_pnl) : '—'}
                          </td>
                          <td style={S.td}>
                            {isOnline
                              ? <span style={{ ...S.badge('#00ff88', 'rgba(0,255,136,0.1)') }} className="live-badge">● LIVE</span>
                              : <span style={S.badge('#64748b', 'rgba(100,116,139,0.1)')}>● OFFLINE</span>}
                          </td>
                          <td style={{ ...S.td, fontSize: '11px', color: '#64748b' }}>
                            {live ? new Date(live.last_update).toLocaleTimeString() : '—'}
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

        {/* ── TAB 1: FUNDED ACCOUNTS ── */}
        {tab === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>FUNDED ACCOUNTS</div>
              <button style={S.btn('primary')}>+ Add Account</button>
            </div>
            {accounts.map(acc => {
              const live = liveData.find(l => l.funded_account_id === acc.id)
              const isOnline = live && (Date.now() - new Date(live.last_update).getTime()) < 60000
              const pct = settings.monthly_target > 0 ? (acc.current_month_profit / settings.monthly_target * 100) : 0
              const ddPct = (1 - (live ? live.equity : acc.account_size + acc.current_month_profit) / acc.account_size) * 100
              const borderColor = ddPct > 8 ? 'rgba(255,51,102,0.5)' : ddPct > 5 ? 'rgba(245,158,11,0.5)' : 'rgba(0,212,255,0.15)'
              return (
                <div key={acc.id} style={{ ...S.card, border: `1px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <span style={{ color: '#00d4ff', fontWeight: 700, fontSize: '18px' }}>{acc.prop_firms?.name || 'Prop Firm'}</span>
                      <span style={{ color: '#64748b', fontSize: '14px', marginLeft: '12px' }}>— {fmtMoney(acc.account_size)} Account</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isOnline
                        ? <span style={S.badge('#00ff88', 'rgba(0,255,136,0.1)')} className="live-badge">● LIVE</span>
                        : <span style={S.badge('#64748b', 'rgba(100,116,139,0.1)')}>● OFFLINE</span>}
                      <span style={S.badge('#06b6d4', 'rgba(6,182,212,0.1)')}>Phase {acc.phase}</span>
                      <span style={S.badge('#00ff88', 'rgba(0,255,136,0.1)')}>{acc.status?.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div><div style={S.metric.label}>Monthly Profit</div><div style={S.metric.value('#00ff88')}>{fmtMoney(acc.current_month_profit)}</div></div>
                    {live && <>
                      <div><div style={S.metric.label}>Equity</div><div style={S.metric.value('#00d4ff')}>{fmtMoney(live.equity)}</div></div>
                      <div><div style={S.metric.label}>Daily P&L</div><div style={S.metric.value(live.daily_pnl >= 0 ? '#00ff88' : '#ff3366')}>{fmtMoneyDec(live.daily_pnl)}</div></div>
                      <div><div style={S.metric.label}>Open Positions</div><div style={S.metric.value('#f59e0b')}>{live.open_positions}</div></div>
                    </>}
                  </div>
                  {/* Progress bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Monthly Target Progress</span>
                      <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700 }}>{pct.toFixed(1)}% of {fmtMoney(settings.monthly_target)}</span>
                    </div>
                    <div style={S.progressBar(pct, '#f59e0b')}>
                      <div style={S.progressFill(pct, pct >= 100 ? '#00ff88' : '#f59e0b')} />
                    </div>
                  </div>
                  {/* Webhook */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>WEBHOOK:</span>
                    <span style={{ fontSize: '11px', color: '#06b6d4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      https://yuadrxbvyhbbtbmodsve.supabase.co/functions/v1/ctrader-webhook?account={acc.id}
                    </span>
                    <button style={S.btn('secondary')} onClick={() => navigator.clipboard?.writeText(`https://yuadrxbvyhbbtbmodsve.supabase.co/functions/v1/ctrader-webhook?account=${acc.id}`)}>📋</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={S.btn('secondary')}>Edit</button>
                    <button style={S.btn('danger')}>Archive</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB 2: CHALLENGES ── */}
        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>CHALLENGES</div>
              <button style={S.btn('primary')}>+ Add Challenge</button>
            </div>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              {[
                { label: 'TOTAL ACTIVE', value: challenges.filter(c => c.status === 'active').length || '0', color: '#00d4ff' },
                { label: 'TOTAL COST', value: fmtMoney(challenges.reduce((s, c) => s + c.cost, 0)), color: '#ff3366' },
                { label: 'EXPECTED PAYOUT', value: fmtMoney(challenges.reduce((s, c) => s + c.target_profit * (settings.payout_split / 100), 0)), color: '#00ff88' },
                { label: 'AVG PASS RATE', value: settings.pass_rate + '%', color: '#f59e0b' },
              ].map((m, i) => (
                <div key={i} style={{ ...S.card, padding: '14px' }}>
                  <div style={{ ...S.metric.label, marginBottom: '4px' }}>{m.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
            {challenges.length === 0 ? (
              <div style={{ ...S.card, textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No challenges found. Add a challenge to get started.
              </div>
            ) : challenges.map(ch => {
              const pct = ch.target_profit > 0 ? (ch.current_profit / ch.target_profit * 100) : 0
              const daysLeft = ch.deadline ? Math.ceil((new Date(ch.deadline).getTime() - Date.now()) / 86400000) : 0
              return (
                <div key={ch.id} style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div>
                      <span style={{ color: '#00d4ff', fontWeight: 700 }}>Phase {ch.phase} — {ch.prop_firms?.name}</span>
                      <span style={{ color: '#64748b', marginLeft: '12px' }}>{fmtMoney(ch.prop_firms?.account_size || 100000)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={S.badge('#00ff88', 'rgba(0,255,136,0.1)')}>{ch.status?.toUpperCase()}</span>
                      {daysLeft > 0 && <span style={S.badge('#f59e0b', 'rgba(245,158,11,0.1)')}>{daysLeft}d left</span>}
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Progress</span>
                      <span style={{ fontSize: '11px', color: pct >= 100 ? '#00ff88' : '#00d4ff', fontWeight: 700 }}>
                        {fmtMoney(ch.current_profit)} / {fmtMoney(ch.target_profit)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={S.progressBar(pct, '#00d4ff')}>
                      <div style={S.progressFill(pct, pct >= 100 ? '#00ff88' : '#00d4ff')} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div><div style={S.metric.label}>Cost</div><div style={{ color: '#ff3366', fontWeight: 700 }}>{fmtMoney(ch.cost)}</div></div>
                    <div><div style={S.metric.label}>Target</div><div style={{ color: '#f59e0b', fontWeight: 700 }}>{fmtMoney(ch.target_profit)}</div></div>
                    <div><div style={S.metric.label}>Expected Payout</div><div style={{ color: '#00ff88', fontWeight: 700 }}>{fmtMoney(ch.target_profit * (settings.payout_split / 100))}</div></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── TAB 3: GROWTH PROJECTOR ── */}
        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>GROWTH PROJECTOR</div>
            {/* Sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Monthly Return %', val: monthlyReturn, set: setMonthlyReturn, min: 2, max: 20, color: '#00ff88' },
                { label: 'Starting Accounts', val: startAccounts, set: setStartAccounts, min: 1, max: 10, color: '#00d4ff' },
                { label: 'Pass Rate %', val: passRate, set: setPassRate, min: 50, max: 100, color: '#f59e0b' },
                { label: 'Reinvestment Rate %', val: reinvestRate, set: setReinvestRate, min: 0, max: 100, color: '#06b6d4' },
              ].map((s, i) => (
                <div key={i} style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1px' }}>{s.label.toUpperCase()}</span>
                    <span style={{ color: s.color, fontWeight: 700, fontSize: '18px' }}>{s.val}{s.label.includes('%') ? '%' : ''}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} value={s.val} onChange={e => s.set(Number(e.target.value))}
                    style={{ width: '100%', accentColor: s.color }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                    <span>{s.min}{s.label.includes('%') ? '%' : ''}</span>
                    <span>{s.max}{s.label.includes('%') ? '%' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Milestones */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
              {[{ goal: 500000, icon: '🏆', label: '$500K' }, { goal: 1000000, icon: '🚀', label: '$1M' }, { goal: 2000000, icon: '👑', label: '$2M' }].map(m => {
                const reached = projection.find(r => r.capital >= m.goal)
                return (
                  <div key={m.goal} style={{ ...S.card, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${reached ? 'rgba(0,255,136,0.4)' : 'rgba(0,212,255,0.15)'}`, boxShadow: reached ? '0 0 20px rgba(0,255,136,0.2)' : undefined }}>
                    <span style={{ fontSize: '18px' }}>{m.icon}</span>
                    <div>
                      <div style={{ color: reached ? '#00ff88' : '#64748b', fontWeight: 700, fontSize: '13px' }}>{m.label} FUNDED</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{reached ? `Month ${reached.month}` : 'Not reached in 18mo'}</div>
                    </div>
                  </div>
                )
              })}
              {monthsToGoal && (
                <div style={{ ...S.card, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(0,212,255,0.4)' }}>
                  <span style={{ fontSize: '18px' }}>📅</span>
                  <div>
                    <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '13px' }}>MONTHS TO ${(settings.total_capital_goal / 1000000).toFixed(0)}M GOAL</div>
                    <div style={{ fontSize: '20px', color: '#00d4ff', fontWeight: 700 }}>{monthsToGoal}</div>
                  </div>
                </div>
              )}
            </div>
            {/* Chart */}
            <div style={S.card}>
              <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', marginBottom: '16px' }}>CAPITAL GROWTH CURVE (18 MONTHS)</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={projection}>
                  <defs>
                    <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `M${v}`} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} />
                  <Tooltip content={<BloombergTooltip />} />
                  <Area type="monotone" dataKey="capital" stroke="#00d4ff" strokeWidth={2} fill="url(#capGrad)" name="Capital" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Table */}
            <div style={S.card}>
              <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', marginBottom: '16px' }}>18-MONTH PROJECTION</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Month', 'Accounts', 'Capital', 'Monthly Payout', 'Reinvested', 'Kept', 'Cumulative'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projection.map(r => (
                      <tr key={r.month} style={{ background: r.capital >= settings.total_capital_goal ? 'rgba(0,255,136,0.05)' : undefined }}>
                        <td style={{ ...S.td, color: '#00d4ff', fontWeight: 700 }}>M{r.month}</td>
                        <td style={S.td}>{r.accounts}</td>
                        <td style={{ ...S.td, color: '#e2e8f0', fontWeight: 700 }}>{fmtMoney(r.capital)}</td>
                        <td style={{ ...S.td, color: '#00ff88' }}>{fmtMoney(r.payout)}</td>
                        <td style={{ ...S.td, color: '#06b6d4' }}>{fmtMoney(r.reinvested)}</td>
                        <td style={{ ...S.td, color: '#f59e0b' }}>{fmtMoney(r.kept)}</td>
                        <td style={{ ...S.td, color: r.cumKept >= 500000 ? '#00ff88' : '#e2e8f0', fontWeight: 700 }}>{fmtMoney(r.cumKept)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: PROP FIRMS ── */}
        {tab === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>PROP FIRMS DATABASE</div>
            <div style={S.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Firm', '$100K Challenge', 'Payout Split', 'Pass Rate', 'Cost per $1K', 'ROI (1st payout)', 'Rating'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {firms.sort((a, b) => a.challenge_cost - b.challenge_cost).map(f => {
                      const costPer1k = (f.challenge_cost / f.account_size * 1000).toFixed(2)
                      const roi = (f.account_size * 0.10 * (f.payout_split / 100) / f.challenge_cost * 100).toFixed(0)
                      return (
                        <tr key={f.id}>
                          <td style={{ ...S.td, color: '#00d4ff', fontWeight: 700 }}>{f.name}</td>
                          <td style={{ ...S.td, color: '#ff3366' }}>${f.challenge_cost.toLocaleString()}</td>
                          <td style={{ ...S.td, color: '#00ff88' }}>{f.payout_split}%</td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{f.pass_rate}%</td>
                          <td style={S.td}>${costPer1k}</td>
                          <td style={{ ...S.td, color: Number(roi) > 1000 ? '#00ff88' : '#e2e8f0', fontWeight: 700 }}>{roi}%</td>
                          <td style={S.td}>{stars(f)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* ROI Chart */}
            <div style={S.card}>
              <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', marginBottom: '16px' }}>CHALLENGE COST COMPARISON</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={firms.sort((a, b) => a.challenge_cost - b.challenge_cost)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => '$' + v} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10 }} width={100} />
                  <Tooltip content={<BloombergTooltip />} />
                  <Bar dataKey="challenge_cost" fill="#00d4ff" name="Challenge Cost" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── TAB 5: REINVESTMENT PLAN ── */}
        {tab === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ color: '#00d4ff', fontWeight: 700, fontSize: '16px' }}>REINVESTMENT PLAN</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
              {[
                { label: 'Payout Split', value: settings.payout_split + '%', color: '#00ff88' },
                { label: 'Reinvestment Rate', value: settings.reinvestment_rate + '%', color: '#06b6d4' },
                { label: 'Capital Goal', value: fmtMoney(settings.total_capital_goal), color: '#00d4ff' },
              ].map((s, i) => (
                <div key={i} style={{ ...S.card, padding: '12px 20px' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', letterSpacing: '1px' }}>{s.label.toUpperCase()}</div>
                  <div style={{ color: s.color, fontWeight: 700, fontSize: '20px' }}>{s.value}</div>
                </div>
              ))}
            </div>
            {/* Chart */}
            <div style={S.card}>
              <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '1.5px', marginBottom: '16px' }}>CAPITAL COMPOUNDING (12 MONTHS)</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={reinvestPlan}>
                  <defs>
                    <linearGradient id="riGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `M${v}`} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'K'} />
                  <Tooltip content={<BloombergTooltip />} />
                  <Area type="monotone" dataKey="capital" stroke="#00ff88" strokeWidth={2} fill="url(#riGrad)" name="Capital" />
                  <Area type="monotone" dataKey="cumKept" stroke="#00d4ff" strokeWidth={2} fill="none" name="Cumulative Kept" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Table */}
            <div style={S.card}>
              <div style={{ overflowX: 'auto' }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {['Month', 'Accounts', 'Capital', 'Monthly Profit', 'Payout (80%)', 'Reinvest (50%)', 'Keep (50%)', 'Challenges', 'Cumulative Kept'].map(h => (
                        <th key={h} style={S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reinvestPlan.map(r => {
                      const milestone = r.capital >= 2000000 ? '👑' : r.capital >= 1000000 ? '🚀' : r.capital >= 500000 ? '🏆' : r.capital >= 250000 ? '⭐' : ''
                      return (
                        <tr key={r.month} style={{ background: milestone ? 'rgba(245,158,11,0.05)' : undefined }}>
                          <td style={{ ...S.td, color: '#00d4ff', fontWeight: 700 }}>M{r.month} {milestone}</td>
                          <td style={S.td}>{r.accounts}</td>
                          <td style={{ ...S.td, fontWeight: 700, color: milestone ? '#f59e0b' : '#e2e8f0' }}>{fmtMoney(r.capital)}</td>
                          <td style={{ ...S.td, color: '#00ff88' }}>{fmtMoney(r.profit)}</td>
                          <td style={{ ...S.td, color: '#00ff88' }}>{fmtMoney(r.payout)}</td>
                          <td style={{ ...S.td, color: '#06b6d4' }}>{fmtMoney(r.reinvested)}</td>
                          <td style={{ ...S.td, color: '#f59e0b' }}>{fmtMoney(r.kept)}</td>
                          <td style={S.td}>{r.challenges}</td>
                          <td style={{ ...S.td, color: '#00ff88', fontWeight: 700 }}>{fmtMoney(r.cumKept)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
