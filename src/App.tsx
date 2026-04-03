import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Legend
} from 'recharts'
import {
  TrendingUp, TrendingDown, Activity, DollarSign, Target,
  Zap, Award, AlertCircle, ChevronRight, RefreshCw,
  Building2, Clock, BarChart2, Layers, Settings,
  CheckCircle, XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { supabase } from './lib/supabase'
import type {
  PropFirm, FundedAccount, Challenge, DailyLog,
  TradingSettings, LiveAccountData, GrowthProjection, TabId
} from './types'

// ─── Utilities ──────────────────────────────────────────────────────────────

function fmt$(n: number, decimals = 0): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

function pnlClass(n: number): string {
  if (n > 0) return 'profit'
  if (n < 0) return 'loss'
  return 'neutral'
}

function calcProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.max(0, (current / target) * 100))
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ background: 'rgba(0,212,255,0.06)', ...style }}
    />
  )
}

// ─── Live Time ───────────────────────────────────────────────────────────────

function LiveTime() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="number-mono text-xs" style={{ color: '#475569' }}>
      {time.toLocaleTimeString('en-US', { hour12: false })} IST
    </span>
  )
}

// ─── Animated Number ─────────────────────────────────────────────────────────

function AnimNumber({ value, format = fmt$ }: { value: number; format?: (n: number) => string }) {
  const prevRef = useRef(value)
  const [key, setKey] = useState(0)
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value
      setKey(k => k + 1)
    }
  }, [value])
  return (
    <span key={key} className="number-change">
      {format(value)}
    </span>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  positive?: boolean | null
  tooltip?: string
  loading?: boolean
  large?: boolean
}

function MetricCard({ label, value, sub, icon, positive, tooltip, loading, large }: MetricCardProps) {
  const colorClass = positive === true ? 'profit' : positive === false ? 'loss' : ''
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between mb-3">
        <span style={{ fontSize: 11, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              title={tooltip}>{label}</span>
        {icon && <span style={{ color: 'rgba(0,212,255,0.4)' }}>{icon}</span>}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-28 mb-1" />
          <Skeleton className="h-4 w-20" />
        </>
      ) : (
        <>
          <div className={`number-mono font-bold ${colorClass}`}
               style={{ fontSize: large ? 28 : 22, lineHeight: 1.1 }}>
            {typeof value === 'number' ? fmt$(value) : value}
          </div>
          {sub && (
            <div className="mt-1" style={{ fontSize: 12, color: '#475569' }}>{sub}</div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = 'blue' }: { pct: number; color?: 'blue' | 'green' | 'red' }) {
  const fillClass = color === 'green' ? 'progress-fill progress-fill-green'
    : color === 'red' ? 'progress-fill progress-fill-red'
    : 'progress-fill'
  return (
    <div className="progress-track">
      <div className={fillClass} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'badge badge-active', funded: 'badge badge-funded',
    passed: 'badge badge-passed', failed: 'badge badge-failed',
    pending: 'badge badge-pending', breached: 'badge badge-failed',
    paid_out: 'badge badge-passed', phase1: 'badge badge-phase1',
    phase2: 'badge badge-phase2',
  }
  return <span className={map[status] || 'badge badge-pending'}>{status.replace('_', ' ')}</span>
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,10,20,0.97)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 8,
      padding: '10px 14px',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{ color: '#475569', fontSize: 11, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} className={`number-mono ${p.value >= 0 ? 'profit' : 'loss'}`} style={{ fontSize: 13 }}>
          {p.name}: {fmt$(p.value)}
        </div>
      ))}
    </div>
  )
}

// ─── DASHBOARD TAB ───────────────────────────────────────────────────────────

interface DashboardTabProps {
  fundedAccounts: FundedAccount[]
  challenges: Challenge[]
  dailyLogs: DailyLog[]
  settings: TradingSettings | null
  liveData: LiveAccountData[]
  loading: boolean
  targetHit: boolean
}

function DashboardTab({ fundedAccounts, challenges, dailyLogs, settings, liveData, loading, targetHit }: DashboardTabProps) {
  const totalCapital = fundedAccounts.reduce((s, a) => s + a.account_size, 0)
  const totalMonthlyProfit = fundedAccounts.reduce((s, a) => s + (a.current_month_profit || 0), 0)
  const totalDailyPnL = liveData.reduce((s, l) => s + (l.daily_pnl || 0), 0)
  const totalEquity = liveData.reduce((s, l) => s + (l.equity || 0), 0)
  const openPositions = liveData.reduce((s, l) => s + (l.open_positions || 0), 0)
  const floatingPnl = liveData.reduce((s, l) => s + (l.floating_pnl || 0), 0)
  const activeChallenges = challenges.filter(c => c.status === 'active').length

  // Chart data from daily logs — last 30 days aggregated
  const chartData = (() => {
    const map: Record<string, number> = {}
    dailyLogs.forEach(l => {
      map[l.date] = (map[l.date] || 0) + l.profit
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, profit]) => ({
        date: date.slice(5), // MM-DD
        profit,
        cumulative: 0,
      }))
      .map((d, i, arr) => ({
        ...d,
        cumulative: arr.slice(0, i + 1).reduce((s, x) => s + x.profit, 0),
      }))
  })()

  const monthlyTarget = settings?.monthly_target || 5000

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Target Hit Banner */}
      {targetHit && (
        <div className="target-banner">
          <Zap size={20} color="#00ff88" />
          <div>
            <div style={{ color: '#00ff88', fontWeight: 700, fontSize: 14 }}>🎯 DAILY TARGET HIT!</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Daily P&L has exceeded $500 — outstanding performance, Ayman!</div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <MetricCard
          label="Total Capital"
          value={fmt$(totalCapital || 100000)}
          sub={`${fundedAccounts.length} funded account${fundedAccounts.length !== 1 ? 's' : ''}`}
          icon={<DollarSign size={16} />}
          tooltip="הון כולל"
          loading={loading}
        />
        <MetricCard
          label="Today's P&L"
          value={fmt$(totalDailyPnL)}
          sub={totalDailyPnL >= 0 ? 'Positive session' : 'In drawdown'}
          icon={totalDailyPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          positive={totalDailyPnL > 0 ? true : totalDailyPnL < 0 ? false : null}
          tooltip="רווח יומי"
          loading={loading}
        />
        <MetricCard
          label="Monthly Profit"
          value={fmt$(totalMonthlyProfit)}
          sub={`${((totalMonthlyProfit / (monthlyTarget || 1)) * 100).toFixed(0)}% of target`}
          icon={<BarChart2 size={16} />}
          positive={totalMonthlyProfit > 0 ? true : null}
          tooltip="יעד חודשי"
          loading={loading}
        />
        <MetricCard
          label="Total Equity"
          value={fmt$(totalEquity || totalCapital || 100000)}
          sub={floatingPnl !== 0 ? `Floating: ${fmt$(floatingPnl)}` : 'No open trades'}
          icon={<Activity size={16} />}
          positive={floatingPnl > 0 ? true : floatingPnl < 0 ? false : null}
          tooltip="הון עצמי"
          loading={loading}
        />
        <MetricCard
          label="Open Positions"
          value={openPositions}
          sub={floatingPnl !== 0 ? `PnL: ${fmt$(floatingPnl)}` : 'No floating'}
          icon={<Layers size={16} />}
          loading={loading}
        />
        <MetricCard
          label="Active Challenges"
          value={activeChallenges}
          sub={`${challenges.filter(c => c.status === 'passed').length} passed this month`}
          icon={<Target size={16} />}
          loading={loading}
        />
      </div>

      {/* Monthly Progress */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>MONTHLY TARGET PROGRESS</span>
          <span className="number-mono" style={{ fontSize: 13, color: '#475569' }}>
            {fmt$(totalMonthlyProfit)} / {fmt$(monthlyTarget)}
          </span>
        </div>
        <ProgressBar
          pct={calcProgress(totalMonthlyProfit, monthlyTarget)}
          color={totalMonthlyProfit >= monthlyTarget ? 'green' : 'blue'}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>
            {calcProgress(totalMonthlyProfit, monthlyTarget).toFixed(1)}% complete
          </span>
          <span style={{ fontSize: 11, color: '#475569' }}>
            {fmt$(Math.max(0, monthlyTarget - totalMonthlyProfit))} remaining
          </span>
        </div>
      </div>

      {/* Equity Chart */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>CUMULATIVE P&L — LAST 30 DAYS</span>
          <div className="live-badge">
            <div className="live-dot" />
            LIVE
          </div>
        </div>
        {loading ? (
          <Skeleton className="w-full" style={{ height: 220 }} />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="cumulative" name="Cumulative P&L"
                stroke="#00d4ff" fill="url(#cumulativeGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
            <div style={{ textAlign: 'center' }}>
              <BarChart2 size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div style={{ fontSize: 12 }}>No daily log data yet. Start logging trades!</div>
            </div>
          </div>
        )}
      </div>

      {/* Daily P&L Bar Chart */}
      {chartData.length > 0 && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>DAILY P&L BREAKDOWN</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData.slice(-14)} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="profit" name="Daily P&L"
                fill="#00d4ff"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Live Feed */}
      {liveData.length > 0 && (
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>LIVE ACCOUNT FEED</span>
            <div className="live-badge"><div className="live-dot" />REALTIME</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liveData.map(live => {
              const acc = fundedAccounts.find(a => a.id === live.funded_account_id)
              return (
                <div key={live.funded_account_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px',
                  background: 'rgba(0,212,255,0.03)',
                  border: '1px solid rgba(0,212,255,0.08)',
                  borderRadius: 8,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>
                      {acc?.prop_firm?.name || `Account ${live.funded_account_id.slice(0, 6)}`}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                      {live.open_positions} position{live.open_positions !== 1 ? 's' : ''} open
                      {live.last_update && ` · Updated ${new Date(live.last_update).toLocaleTimeString('en-US', { hour12: false })}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className={`number-mono font-bold ${pnlClass(live.daily_pnl)}`} style={{ fontSize: 16 }}>
                      <AnimNumber value={live.daily_pnl} />
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }} title="הון עצמי">
                      Equity: <span className="number-mono">{fmt$(live.equity)}</span>
                    </div>
                    {live.floating_pnl !== 0 && (
                      <div style={{ fontSize: 11 }} className={pnlClass(live.floating_pnl)}>
                        Float: {fmt$(live.floating_pnl)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FUNDED ACCOUNTS TAB ─────────────────────────────────────────────────────

interface FundedTabProps {
  accounts: FundedAccount[]
  liveData: LiveAccountData[]
  dailyLogs: DailyLog[]
  settings: TradingSettings | null
  loading: boolean
}

function FundedTab({ accounts, liveData, dailyLogs, settings, loading }: FundedTabProps) {
  const monthlyTarget = settings?.monthly_target || 5000

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card" style={{ padding: 20 }}>
            <Skeleton className="h-5 w-32 mb-3" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
        <Building2 size={48} style={{ margin: '0 auto 16px', color: 'rgba(0,212,255,0.3)' }} />
        <div style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>No funded accounts yet</div>
        <div style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>
          Pass your challenges to get funded! Check the Challenges tab.
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
      {accounts.map(acc => {
        const live = liveData.find(l => l.funded_account_id === acc.id)
        const logs = dailyLogs.filter(l => l.funded_account_id === acc.id).slice(-7)
        const chartData = logs.map(l => ({ date: l.date.slice(5), profit: l.profit, equity: l.equity }))
        const pct = calcProgress(acc.current_month_profit, monthlyTarget)

        return (
          <div key={acc.id} className={`glass-card ${live ? 'glass-card-active' : ''}`} style={{ padding: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>
                  {acc.prop_firm?.name || 'Funded Account'}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  {fmt$(acc.account_size)} account · Started {new Date(acc.start_date).toLocaleDateString('en-GB')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <StatusBadge status={acc.status} />
                <StatusBadge status={acc.phase} />
              </div>
            </div>

            {/* Live P&L Overlay */}
            {live && (
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(0,212,255,0.1)',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 14,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }} title="רווח יומי">Daily P&L</div>
                  <div className={`number-mono font-bold ${pnlClass(live.daily_pnl)}`} style={{ fontSize: 18 }}>
                    <AnimNumber value={live.daily_pnl} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }} title="הון עצמי">Equity</div>
                  <div className="number-mono font-bold glow-text-sm" style={{ fontSize: 18 }}>
                    <AnimNumber value={live.equity} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Balance</div>
                  <div className="number-mono" style={{ fontSize: 13, color: '#94a3b8' }}>{fmt$(live.balance)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Floating</div>
                  <div className={`number-mono ${pnlClass(live.floating_pnl)}`} style={{ fontSize: 13 }}>
                    {live.floating_pnl !== 0 ? fmt$(live.floating_pnl) : '—'}
                  </div>
                </div>
                {live.open_positions > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Open Positions</div>
                    <div className="number-mono" style={{ fontSize: 13, color: '#00d4ff' }}>{live.open_positions} active</div>
                  </div>
                )}
              </div>
            )}

            {/* Monthly Progress */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#475569' }}>Monthly Progress</span>
                <span className="number-mono" style={{ fontSize: 11, color: '#94a3b8' }}>
                  {fmt$(acc.current_month_profit)} / {fmt$(monthlyTarget)}
                </span>
              </div>
              <ProgressBar pct={pct} color={pct >= 100 ? 'green' : 'blue'} />
            </div>

            {/* Payout Split */}
            {acc.prop_firm && (
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.04)',
                fontSize: 12, color: '#64748b',
              }}>
                <span>Payout Split</span>
                <span className="number-mono" style={{ color: '#00d4ff' }}>
                  {acc.prop_firm.payout_split}% / {100 - acc.prop_firm.payout_split}%
                </span>
              </div>
            )}

            {/* Mini Equity Chart */}
            {chartData.length > 1 && (
              <div style={{ marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="profit"
                      stroke="#00d4ff" fill={`url(#grad-${acc.id})`}
                      strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── CHALLENGES TAB ──────────────────────────────────────────────────────────

interface ChallengesTabProps {
  challenges: Challenge[]
  loading: boolean
}

function ChallengesTab({ challenges, loading }: ChallengesTabProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card" style={{ padding: 20 }}>
            <Skeleton className="h-5 w-40 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    )
  }

  const active = challenges.filter(c => c.status === 'active')
  const completed = challenges.filter(c => c.status !== 'active')

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Active', value: active.length, icon: <Activity size={16} />, color: '#00d4ff' },
          { label: 'Passed', value: challenges.filter(c => c.status === 'passed').length, icon: <CheckCircle size={16} />, color: '#00ff88' },
          { label: 'Failed', value: challenges.filter(c => c.status === 'failed').length, icon: <XCircle size={16} />, color: '#ef4444' },
          { label: 'Total Cost', value: fmt$(challenges.reduce((s, c) => s + c.cost, 0)), icon: <DollarSign size={16} />, color: '#fbbf24' },
        ].map(stat => (
          <div key={stat.label} className="metric-card" style={{ textAlign: 'center' }}>
            <div style={{ color: stat.color, marginBottom: 6 }}>{stat.icon}</div>
            <div className="number-mono font-bold" style={{ fontSize: 20, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Active Challenges */}
      {active.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            ACTIVE EVALUATIONS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.map(ch => {
              const pct = calcProgress(ch.current_profit, ch.target_profit)
              const daysLeft = Math.ceil((new Date(ch.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              const progressColor: 'blue' | 'green' | 'red' = pct >= 100 ? 'green' : daysLeft < 7 ? 'red' : 'blue'
              return (
                <div key={ch.id} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>
                        {ch.prop_firm?.name || 'Challenge'} — {ch.phase === 'phase1' ? 'Phase 1' : 'Phase 2'}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                        Started {new Date(ch.start_date).toLocaleDateString('en-GB')}
                        {ch.deadline && ` · Deadline ${new Date(ch.deadline).toLocaleDateString('en-GB')}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <StatusBadge status={ch.phase} />
                      {daysLeft > 0 && daysLeft <= 7 && (
                        <span className="badge badge-failed">⚡ {daysLeft}d left</span>
                      )}
                      {daysLeft > 7 && (
                        <span className="badge badge-pending">{daysLeft}d left</span>
                      )}
                    </div>
                  </div>

                  {/* Profit Progress */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Target Progress</span>
                      <span className="number-mono" style={{ fontSize: 12, color: '#94a3b8' }}>
                        {fmt$(ch.current_profit)} / {fmt$(ch.target_profit)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <ProgressBar pct={pct} color={progressColor} />
                  </div>

                  {/* Cost + Potential */}
                  <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#475569' }}>
                    <div>Entry Cost: <span className="number-mono" style={{ color: '#ef4444' }}>{fmt$(ch.cost)}</span></div>
                    {ch.prop_firm && (
                      <div>
                        Est. Payout: <span className="number-mono profit">
                          {fmt$(ch.target_profit * (ch.prop_firm.payout_split / 100))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
            COMPLETED CHALLENGES
          </div>
          <div className="glass-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Firm</th>
                  <th>Phase</th>
                  <th>Cost</th>
                  <th>Target</th>
                  <th>Achieved</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {completed.map(ch => (
                  <tr key={ch.id}>
                    <td>{ch.prop_firm?.name || '—'}</td>
                    <td><StatusBadge status={ch.phase} /></td>
                    <td className="number-mono loss">{fmt$(ch.cost)}</td>
                    <td className="number-mono">{fmt$(ch.target_profit)}</td>
                    <td className={`number-mono ${pnlClass(ch.current_profit)}`}>{fmt$(ch.current_profit)}</td>
                    <td><StatusBadge status={ch.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {challenges.length === 0 && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <Target size={48} style={{ margin: '0 auto 16px', color: 'rgba(0,212,255,0.3)' }} />
          <div style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>No challenges recorded</div>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>
            Add challenge data in Supabase to track your evaluation progress.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── GROWTH PROJECTOR TAB ────────────────────────────────────────────────────

function GrowthProjectorTab({ settings }: { settings: TradingSettings | null }) {
  const [monthlyReturn, setMonthlyReturn] = useState(10)
  const [startAccounts, setStartAccounts] = useState(1)
  const [passRate, setPassRate] = useState(settings?.pass_rate || 80)
  const [reinvestRate, setReinvestRate] = useState(settings?.reinvestment_rate || 50)
  const [accountSize] = useState(100000)

  const projections: GrowthProjection[] = (() => {
    const rows: GrowthProjection[] = []
    let accounts = startAccounts
    let totalCapital = accounts * accountSize
    let cumulativeKept = 0

    for (let month = 1; month <= 18; month++) {
      const monthlyPayout = totalCapital * (monthlyReturn / 100)
      const reinvested = monthlyPayout * (reinvestRate / 100)
      const kept = monthlyPayout - reinvested
      cumulativeKept += kept

      // New accounts from reinvestment (each challenge costs ~$500 avg, pass rate applied)
      const newChallenges = Math.floor(reinvested / 500)
      const newAccountsPassed = Math.floor(newChallenges * (passRate / 100))
      accounts = accounts + newAccountsPassed
      totalCapital = accounts * accountSize

      rows.push({
        month,
        accounts,
        totalCapital,
        monthlyPayout,
        reinvested,
        kept,
        newAccountsPassed,
      })
    }
    return rows
  })()

  const milestoneMonths = projections.filter(r =>
    [250000, 500000, 1000000, 2000000].some(m =>
      r.totalCapital >= m && (projections[r.month - 2]?.totalCapital || 0) < m
    )
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 20, letterSpacing: '0.06em' }}>
          ⚙️ PROJECTION PARAMETERS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {([
            { label: 'Monthly Return per Account', key: 'monthlyReturn', value: monthlyReturn, set: setMonthlyReturn, min: 1, max: 30, suffix: '%', step: 0.5 },
            { label: 'Starting Accounts', key: 'startAccounts', value: startAccounts, set: setStartAccounts, min: 1, max: 20, suffix: '', step: 1 },
            { label: 'Pass Rate', key: 'passRate', value: passRate, set: setPassRate, min: 10, max: 100, suffix: '%', step: 5 },
            { label: 'Reinvestment Rate', key: 'reinvestRate', value: reinvestRate, set: setReinvestRate, min: 0, max: 100, suffix: '%', step: 5 },
          ] as const).map(ctrl => (
            <div key={ctrl.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{ctrl.label}</span>
                <span className="number-mono glow-text-sm" style={{ fontSize: 13, fontWeight: 700 }}>
                  {ctrl.value}{ctrl.suffix}
                </span>
              </div>
              <input
                type="range"
                min={ctrl.min}
                max={ctrl.max}
                step={ctrl.step}
                value={ctrl.value}
                onChange={e => ctrl.set(Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Milestone flags */}
      {milestoneMonths.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {milestoneMonths.map(m => (
            <span key={m.month} className="milestone">
              🏆 Month {m.month}: {fmt$(m.totalCapital, 0)} reached
            </span>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>CAPITAL GROWTH CURVE (18 MONTHS)</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={projections} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => `M${v}`} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: number) => fmt$(v)} labelFormatter={v => `Month ${v}`} />
            <Legend />
            <Line type="monotone" dataKey="totalCapital" name="Total Capital"
              stroke="#00d4ff" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="monthlyPayout" name="Monthly Payout"
              stroke="#00ff88" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Accounts</th>
              <th>Total Capital</th>
              <th>Monthly Payout</th>
              <th>Reinvested</th>
              <th>Kept (You)</th>
              <th>New Accts</th>
            </tr>
          </thead>
          <tbody>
            {projections.map(row => (
              <tr key={row.month} style={
                [6, 12, 18].includes(row.month)
                  ? { background: 'rgba(0,212,255,0.03)', borderTop: '1px solid rgba(0,212,255,0.1)' }
                  : {}
              }>
                <td className="number-mono" style={{ color: '#64748b' }}>Month {row.month}</td>
                <td className="number-mono glow-text-sm">{row.accounts}</td>
                <td className="number-mono" style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt$(row.totalCapital)}</td>
                <td className="number-mono profit">{fmt$(row.monthlyPayout)}</td>
                <td className="number-mono" style={{ color: '#06b6d4' }}>{fmt$(row.reinvested)}</td>
                <td className="number-mono" style={{ color: '#00ff88', fontWeight: 700 }}>{fmt$(row.kept)}</td>
                <td className="number-mono" style={{ color: '#a855f7' }}>+{row.newAccountsPassed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── PROP FIRMS DB TAB ────────────────────────────────────────────────────────

interface PropFirmsTabProps {
  firms: PropFirm[]
  loading: boolean
}

const DEFAULT_FIRMS: PropFirm[] = [
  { id: 'ftmo', name: 'FTMO', account_size: 200000, challenge_cost: 1080, payout_split: 90, pass_rate: 25, website: 'ftmo.com' },
  { id: 'toptier', name: 'TopTier Trader', account_size: 200000, challenge_cost: 950, payout_split: 90, pass_rate: 30, website: 'toptiertrader.com' },
  { id: 'topone', name: 'Top One Trader', account_size: 200000, challenge_cost: 880, payout_split: 85, pass_rate: 28, website: 'toponetrader.com' },
  { id: 'maven', name: 'Maven Trading', account_size: 200000, challenge_cost: 750, payout_split: 80, pass_rate: 35, website: 'maventrading.io' },
  { id: 'e8', name: 'E8 Markets', account_size: 250000, challenge_cost: 698, payout_split: 80, pass_rate: 32, website: 'e8markets.com' },
  { id: 'apex', name: 'Apex Trader Funding', account_size: 300000, challenge_cost: 657, payout_split: 90, pass_rate: 40, website: 'apextraderfunding.com' },
]

function PropFirmsTab({ firms, loading }: PropFirmsTabProps) {
  const displayFirms = firms.length > 0 ? firms : DEFAULT_FIRMS
  const [sort, setSort] = useState<keyof PropFirm>('payout_split')
  const [desc, setDesc] = useState(true)

  const sorted = [...displayFirms].sort((a, b) => {
    const va = a[sort] as number
    const vb = b[sort] as number
    return desc ? (vb - va) : (va - vb)
  })

  const toggleSort = (col: keyof PropFirm) => {
    if (sort === col) setDesc(d => !d)
    else { setSort(col); setDesc(true) }
  }

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: 20 }}>
        <Skeleton className="h-6 w-48 mb-4" />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full mb-2" />)}
      </div>
    )
  }

  const SortTh = ({ col, label }: { col: keyof PropFirm; label: string }) => (
    <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sort === col && (desc ? ' ↓' : ' ↑')}
      </span>
    </th>
  )

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {firms.length === 0 && (
        <div style={{
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#fbbf24',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} />
          Showing default firm data — add real data via Supabase prop_firms table to override.
        </div>
      )}

      {/* Best value cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Best Payout', firm: [...displayFirms].sort((a, b) => b.payout_split - a.payout_split)[0], metric: (f: PropFirm) => `${f.payout_split}%` },
          { label: 'Lowest Cost', firm: [...displayFirms].sort((a, b) => a.challenge_cost - b.challenge_cost)[0], metric: (f: PropFirm) => fmt$(f.challenge_cost) },
          { label: 'Highest Cap', firm: [...displayFirms].sort((a, b) => b.account_size - a.account_size)[0], metric: (f: PropFirm) => fmt$(f.account_size) },
          { label: 'Best Pass Rate', firm: [...displayFirms].sort((a, b) => b.pass_rate - a.pass_rate)[0], metric: (f: PropFirm) => `${f.pass_rate}%` },
        ].map(card => (
          <div key={card.label} className="metric-card">
            <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
            <div className="number-mono font-bold glow-text" style={{ fontSize: 18 }}>{card.metric(card.firm)}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{card.firm.name}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Firm</th>
              <SortTh col="account_size" label="Max Account" />
              <SortTh col="challenge_cost" label="Challenge Cost" />
              <SortTh col="payout_split" label="Payout Split" />
              <SortTh col="pass_rate" label="Pass Rate" />
              <th>Website</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((firm, i) => (
              <tr key={firm.id}>
                <td>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{firm.name}</div>
                  {i === 0 && <span style={{ fontSize: 10, color: '#fbbf24' }}>⭐ Top rated</span>}
                </td>
                <td className="number-mono">{fmt$(firm.account_size)}</td>
                <td className="number-mono loss">{fmt$(firm.challenge_cost)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProgressBar pct={firm.payout_split} color="green" />
                    <span className="number-mono profit" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {firm.payout_split}%
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ProgressBar pct={firm.pass_rate} color="blue" />
                    <span className="number-mono" style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#00d4ff' }}>
                      {firm.pass_rate}%
                    </span>
                  </div>
                </td>
                <td>
                  <a href={`https://${firm.website}`} target="_blank" rel="noreferrer"
                     style={{ color: '#00d4ff', fontSize: 12, textDecoration: 'none' }}>
                    {firm.website} <ArrowUpRight size={10} style={{ display: 'inline' }} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ROI Analysis */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 16 }}>
          ROI ANALYSIS — Cost vs. First Month Payout
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sorted} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={(v: number) => fmt$(v)} />
            <Legend />
            <Bar dataKey="challenge_cost" name="Challenge Cost" fill="#ef4444" radius={[3, 3, 0, 0]} opacity={0.8} />
            <Bar dataKey={(d: PropFirm) => Math.round(d.account_size * 0.1 * (d.payout_split / 100))}
              name="Est. 1st Payout (10%)" fill="#00ff88" radius={[3, 3, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── REINVESTMENT PLAN TAB ────────────────────────────────────────────────────

interface ReinvestmentTabProps {
  settings: TradingSettings | null
  fundedAccounts: FundedAccount[]
}

function ReinvestmentTab({ settings, fundedAccounts }: ReinvestmentTabProps) {
  const reinvestRate = settings?.reinvestment_rate || 50
  const payoutSplit = settings?.payout_split || 80
  const startCapital = fundedAccounts.reduce((s, a) => s + a.account_size, 0) || 100000
  const targetCapital = settings?.total_capital_goal || 2000000
  const monthlyReturn = 0.1 // 10% assumed

  interface MilestoneRow {
    month: number
    capital: number
    monthlyProfit: number
    yourCut: number
    reinvested: number
    kept: number
    milestone: string | null
  }

  const plan: MilestoneRow[] = (() => {
    const rows: MilestoneRow[] = []
    let capital = startCapital
    const milestones = [250000, 500000, 750000, 1000000, 1500000, 2000000]
    let hitMilestones = new Set<number>()

    for (let month = 1; month <= 24 && capital < targetCapital * 1.1; month++) {
      const monthlyProfit = capital * monthlyReturn
      const yourCut = monthlyProfit * (payoutSplit / 100)
      const reinvested = yourCut * (reinvestRate / 100)
      const kept = yourCut - reinvested
      capital += reinvested

      const hitMilestone = milestones.find(m => capital >= m && !hitMilestones.has(m)) || null
      if (hitMilestone) hitMilestones.add(hitMilestone)

      rows.push({ month, capital, monthlyProfit, yourCut, reinvested, kept, milestone: hitMilestone ? fmt$(hitMilestone) : null })
    }
    return rows
  })()

  const finalCapital = plan[plan.length - 1]?.capital || 0
  const totalKept = plan.reduce((s, r) => s + r.kept, 0)
  const monthsToTarget = plan.findIndex(r => r.capital >= targetCapital) + 1

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div className="metric-card">
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Starting Capital</div>
          <div className="number-mono font-bold glow-text" style={{ fontSize: 22 }}>{fmt$(startCapital)}</div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Target Capital</div>
          <div className="number-mono font-bold gold-text" style={{ fontSize: 22 }}>{fmt$(targetCapital)}</div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Reinvestment Rate</div>
          <div className="number-mono font-bold" style={{ fontSize: 22, color: '#06b6d4' }}>{reinvestRate}%</div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Months to $2M</div>
          <div className="number-mono font-bold profit" style={{ fontSize: 22 }}>
            {monthsToTarget > 0 ? `~${monthsToTarget}` : '24+'}
          </div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Total Kept (You)</div>
          <div className="number-mono font-bold" style={{ fontSize: 22, color: '#00ff88' }}>{fmt$(totalKept)}</div>
        </div>
        <div className="metric-card">
          <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Final Capital</div>
          <div className="number-mono font-bold" style={{ fontSize: 22, color: '#fbbf24' }}>{fmt$(finalCapital)}</div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
            CAPITAL SCALING PATH — $100K → $2M
          </span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={plan} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="capitalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="keptGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => `M${v}`} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v: number) => fmt$(v)} labelFormatter={v => `Month ${v}`} />
            <Legend />
            <Area type="monotone" dataKey="capital" name="Total Capital"
              stroke="#fbbf24" fill="url(#capitalGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="kept" name="Monthly Kept"
              stroke="#00ff88" fill="url(#keptGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Capital</th>
              <th>Monthly Profit (10%)</th>
              <th>Your Cut ({payoutSplit}%)</th>
              <th>Reinvested ({reinvestRate}%)</th>
              <th>You Keep</th>
              <th>Milestone</th>
            </tr>
          </thead>
          <tbody>
            {plan.map(row => (
              <tr key={row.month}
                style={row.milestone ? {
                  background: 'rgba(251,191,36,0.05)',
                  borderTop: '1px solid rgba(251,191,36,0.15)',
                  borderBottom: '1px solid rgba(251,191,36,0.15)',
                } : {}}>
                <td className="number-mono" style={{ color: '#64748b' }}>Month {row.month}</td>
                <td className="number-mono" style={{ color: '#e2e8f0', fontWeight: 600 }}>{fmt$(row.capital)}</td>
                <td className="number-mono profit">{fmt$(row.monthlyProfit)}</td>
                <td className="number-mono" style={{ color: '#06b6d4' }}>{fmt$(row.yourCut)}</td>
                <td className="number-mono" style={{ color: '#a855f7' }}>{fmt$(row.reinvested)}</td>
                <td className="number-mono" style={{ color: '#00ff88', fontWeight: 700 }}>{fmt$(row.kept)}</td>
                <td>
                  {row.milestone && (
                    <span className="milestone">🏆 {row.milestone}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Activity size={13} /> },
  { id: 'funded', label: 'Funded Accounts', icon: <Building2 size={13} /> },
  { id: 'challenges', label: 'Challenges', icon: <Target size={13} /> },
  { id: 'growth', label: 'Growth Projector', icon: <TrendingUp size={13} /> },
  { id: 'firms', label: 'Prop Firms DB', icon: <BarChart2 size={13} /> },
  { id: 'reinvestment', label: 'Reinvestment Plan', icon: <Layers size={13} /> },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Data state
  const [propFirms, setPropFirms] = useState<PropFirm[]>([])
  const [fundedAccounts, setFundedAccounts] = useState<FundedAccount[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([])
  const [settings, setSettings] = useState<TradingSettings | null>(null)
  const [liveData, setLiveData] = useState<LiveAccountData[]>([])
  const [targetHit, setTargetHit] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [firmsRes, accountsRes, challengesRes, logsRes, settingsRes, liveRes] = await Promise.all([
        supabase.from('prop_firms').select('*'),
        supabase.from('funded_accounts').select('*, prop_firm:prop_firms(*)'),
        supabase.from('challenges').select('*, prop_firm:prop_firms(*)'),
        supabase.from('daily_logs').select('*').order('date', { ascending: false }).limit(200),
        supabase.from('trading_settings').select('*').single(),
        supabase.from('live_account_data').select('*'),
      ])

      if (firmsRes.error && firmsRes.error.code !== 'PGRST116') throw firmsRes.error
      if (accountsRes.error && accountsRes.error.code !== 'PGRST116') throw accountsRes.error
      if (challengesRes.error && challengesRes.error.code !== 'PGRST116') throw challengesRes.error
      if (logsRes.error && logsRes.error.code !== 'PGRST116') throw logsRes.error

      setPropFirms((firmsRes.data as PropFirm[]) || [])
      setFundedAccounts((accountsRes.data as FundedAccount[]) || [])
      setChallenges((challengesRes.data as Challenge[]) || [])
      setDailyLogs((logsRes.data as DailyLog[]) || [])
      setSettings((settingsRes.data as TradingSettings) || null)
      setLiveData((liveRes.data as LiveAccountData[]) || [])
      setLastRefresh(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      setError(msg)
      console.error('Supabase load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscription for live_account_data
  useEffect(() => {
    const channel = supabase
      .channel('live-account-feed')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_account_data',
      }, (payload) => {
        const newData = payload.new as LiveAccountData
        if (!newData) return
        setLiveData(prev => {
          const idx = prev.findIndex(l => l.funded_account_id === newData.funded_account_id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = newData
            return next
          }
          return [...prev, newData]
        })
        // Check daily target
        if (newData.daily_pnl >= 500) setTargetHit(true)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Clear target hit after 10s
  useEffect(() => {
    if (!targetHit) return
    const t = setTimeout(() => setTargetHit(false), 10000)
    return () => clearTimeout(t)
  }, [targetHit])

  const totalCapital = fundedAccounts.reduce((s, a) => s + a.account_size, 0) || 100000
  const totalDailyPnL = liveData.reduce((s, l) => s + (l.daily_pnl || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* HEADER */}
      <header className="header-bar">
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            {/* Left: Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className="live-badge"><div className="live-dot" />LIVE</div>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', color: '#e2e8f0' }}>
                PROP FIRM EMPIRE
              </div>
            </div>

            {/* Center: Key Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 12 }}>
              <div title="הון כולל" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={13} style={{ color: '#00d4ff' }} />
                <span style={{ color: '#64748b' }}>Capital:</span>
                <span className="number-mono glow-text-sm" style={{ fontWeight: 700 }}>{fmt$(totalCapital)}</span>
              </div>
              <div title="רווח יומי" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {totalDailyPnL >= 0
                  ? <ArrowUpRight size={13} style={{ color: '#00ff88' }} />
                  : <ArrowDownRight size={13} style={{ color: '#ef4444' }} />}
                <span style={{ color: '#64748b' }}>Today:</span>
                <span className={`number-mono font-bold ${pnlClass(totalDailyPnL)}`}>
                  {totalDailyPnL >= 0 ? '+' : ''}{fmt$(totalDailyPnL)}
                </span>
              </div>
              {settings?.monthly_target && (
                <div title="יעד חודשי" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={13} style={{ color: '#06b6d4' }} />
                  <span style={{ color: '#64748b' }}>Target:</span>
                  <span className="number-mono" style={{ color: '#06b6d4' }}>{fmt$(settings.monthly_target)}/mo</span>
                </div>
              )}
            </div>

            {/* Right: Time + Refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LiveTime />
              <button
                onClick={loadData}
                style={{
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: '#00d4ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                }}
                title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                <span>REFRESH</span>
              </button>
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', gap: 4, paddingBottom: 12, overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ maxWidth: 1600, margin: '0 auto', padding: '24px 20px' }}>
        {/* Error Banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444', fontSize: 13,
          }}>
            <AlertCircle size={16} />
            <div>
              <span style={{ fontWeight: 600 }}>Supabase Connection Error:</span> {error}
              <button onClick={loadData} style={{
                marginLeft: 12, background: 'none', border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: '#ef4444', fontSize: 11,
              }}>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* TAB CONTENT */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            fundedAccounts={fundedAccounts}
            challenges={challenges}
            dailyLogs={dailyLogs}
            settings={settings}
            liveData={liveData}
            loading={loading}
            targetHit={targetHit}
          />
        )}
        {activeTab === 'funded' && (
          <FundedTab
            accounts={fundedAccounts}
            liveData={liveData}
            dailyLogs={dailyLogs}
            settings={settings}
            loading={loading}
          />
        )}
        {activeTab === 'challenges' && (
          <ChallengesTab
            challenges={challenges}
            loading={loading}
          />
        )}
        {activeTab === 'growth' && (
          <GrowthProjectorTab settings={settings} />
        )}
        {activeTab === 'firms' && (
          <PropFirmsTab firms={propFirms} loading={loading} />
        )}
        {activeTab === 'reinvestment' && (
          <ReinvestmentTab settings={settings} fundedAccounts={fundedAccounts} />
        )}
      </main>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid rgba(0,212,255,0.06)',
        padding: '12px 20px',
        marginTop: 40,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
        color: '#1e293b',
      }}>
        <div>PROP FIRM EMPIRE · Ayman Dakwar Trading HQ</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span>FTMO · TopTier · Top One · Maven · E8 · Apex</span>
          <span style={{ color: '#475569' }}>
            Built with LuxAlgo + TradingView + Bookmap
          </span>
        </div>
      </footer>
    </div>
  )
}
