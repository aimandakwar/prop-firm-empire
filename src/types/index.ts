export interface PropFirm {
  id: string
  name: string
  account_size: number
  challenge_cost: number
  payout_split: number
  pass_rate: number
  website: string
}

export interface FundedAccount {
  id: string
  prop_firm_id: string
  account_size: number
  start_date: string
  current_month_profit: number
  status: 'active' | 'breached' | 'paid_out' | 'pending'
  phase: 'phase1' | 'phase2' | 'funded'
  prop_firm?: PropFirm
  live_data?: LiveAccountData
}

export interface Challenge {
  id: string
  prop_firm_id: string
  phase: 'phase1' | 'phase2'
  cost: number
  target_profit: number
  current_profit: number
  status: 'active' | 'passed' | 'failed'
  start_date: string
  deadline: string
  prop_firm?: PropFirm
}

export interface DailyLog {
  id: string
  funded_account_id: string
  date: string
  profit: number
  equity: number
  notes: string
}

export interface TradingSettings {
  daily_target: number
  monthly_target: number
  total_capital_goal: number
  payout_split: number
  reinvestment_rate: number
  pass_rate: number
}

export interface LiveAccountData {
  funded_account_id: string
  equity: number
  balance: number
  daily_pnl: number
  open_positions: number
  floating_pnl: number
  last_update: string
}

export interface GrowthProjection {
  month: number
  accounts: number
  totalCapital: number
  monthlyPayout: number
  reinvested: number
  kept: number
  newAccountsPassed: number
}

export type TabId = 'dashboard' | 'funded' | 'challenges' | 'growth' | 'firms' | 'reinvestment'
