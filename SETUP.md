# Prop Firm Empire — Setup Guide

> Trading Dashboard built for Ayman Dakwar | Bloomberg Terminal × Hollywood HUD aesthetic
> Stack: Vite + React 18 + TypeScript + Tailwind CSS + Supabase + Recharts

---

## Quick Start (Local Dev)

```bash
cd prop-firm-empire
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## 1. Create GitHub Repository

```bash
# Initialize and push
cd prop-firm-empire
git init
git add .
git commit -m "feat: initial Prop Firm Empire dashboard"

# On GitHub: Create new repo "prop-firm-empire" (public or private)
git remote add origin https://github.com/YOUR_USERNAME/prop-firm-empire.git
git push -u origin main
```

---

## 2. Deploy to Lovable

1. Go to [lovable.dev](https://lovable.dev) and open your project
2. Click **Settings** in the top-right
3. Go to **GitHub** tab → **Connect Repository**
4. Select your `prop-firm-empire` repo and click **Import**

### Set Environment Variables in Lovable

In Lovable → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://yuadrxbvyhbbtbmodsve.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1YWRyeGJ2eWhiYnRibW9kc3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODY3MjMsImV4cCI6MjA4ODY2MjcyM30.J6E2hVdBftaz5wUiKzPDMZAc53XQuycAW7CKtnkIuL4` |

> **Note:** The keys are currently hardcoded in `src/lib/supabase.ts` for direct use. If you want to use env vars, update that file to:
> ```ts
> const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
> const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
> ```

---

## 3. Supabase Database Tables

Your Supabase project already has these tables. Here's what each does in the dashboard:

| Table | Dashboard Usage |
|---|---|
| `prop_firms` | Prop Firms DB tab — compare all 6 firms |
| `funded_accounts` | Funded Accounts tab — live P&L cards |
| `challenges` | Challenges tab — progress bars, countdowns |
| `daily_logs` | Dashboard — equity chart, P&L history |
| `trading_settings` | All tabs — monthly target, reinvestment rate |
| `live_account_data` | REALTIME — live P&L overlay, equity feed |

### Add Sample Data (Optional)

```sql
-- Add a funded account
INSERT INTO funded_accounts (prop_firm_id, account_size, start_date, current_month_profit, status, phase)
VALUES ('your-firm-id', 100000, CURRENT_DATE, 2500, 'active', 'funded');

-- Add trading settings
INSERT INTO trading_settings (daily_target, monthly_target, total_capital_goal, payout_split, reinvestment_rate, pass_rate)
VALUES (500, 8000, 2000000, 80, 50, 80);

-- Push live data (triggers realtime UI update)
INSERT INTO live_account_data (funded_account_id, equity, balance, daily_pnl, open_positions, floating_pnl, last_update)
VALUES ('your-account-id', 101500, 100000, 1500, 2, 300, NOW());
```

---

## 4. cTrader cBot Integration

The `PropFirmBot_cTrader.cs` cBot can auto-push live data to Supabase so the dashboard updates in real time.

**Setup steps:**
1. Open cTrader → Automate → Open Editor
2. Create new cBot → paste contents of `PropFirmBot_cTrader.cs`
3. Configure the bot parameters:
   - `SupabaseUrl` → `https://yuadrxbvyhbbtbmodsve.supabase.co`
   - `SupabaseKey` → (anon key above)
   - `FundedAccountId` → the UUID from your `funded_accounts` table
4. Build and attach to your live/funded chart
5. The bot will push equity, balance, daily P&L, and open positions every tick

**The dashboard will update in real time** — the `live_account_data` table has REPLICA IDENTITY FULL enabled for Supabase Realtime.

---

## 5. Dashboard Features Summary

| Tab | What It Shows |
|---|---|
| **Dashboard** | Total capital, daily P&L, monthly progress, equity chart, live feed |
| **Funded Accounts** | Per-account cards with live P&L overlay, equity sparklines |
| **Challenges** | Active evaluations with progress bars and deadline countdowns |
| **Growth Projector** | Interactive 18-month compound calculator with sliders |
| **Prop Firms DB** | Sortable comparison table + ROI bar chart for all 6 firms |
| **Reinvestment Plan** | Month-by-month $100K → $2M scaling with milestones |

---

## 6. Live Features

- **Realtime P&L**: Supabase Realtime subscription on `live_account_data`
- **Target Banner**: Auto-pops when any account's `daily_pnl >= $500`
- **Animated Numbers**: Values animate on change
- **Hebrew Tooltips**: Hover over Daily P&L, Equity, Monthly Target, Total Capital
- **LIVE Badge**: Pulses in header and chart panels
- **Dark Glass UI**: Bloomberg Terminal × Hollywood HUD aesthetic

---

## Tech Stack

- **Frontend**: Vite 5 + React 18 + TypeScript
- **Styling**: Tailwind CSS + custom glass morphism CSS
- **Charts**: Recharts (Area, Line, Bar)
- **Database**: Supabase (PostgreSQL + Realtime)
- **Icons**: Lucide React
- **Font**: JetBrains Mono (Google Fonts)

---

*Built overnight by Claude — Wake up to your Empire, Ayman! 📈*
