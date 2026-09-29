import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  HeartPulse,
  Plus,
  TrendingUp,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  GitFork
} from 'lucide-react';

import { ActionCenter } from '../../components/dashboard/ActionCenter.jsx';
import { MoneyWeatherBackdrop } from '../../components/dashboard/MoneyWeatherBackdrop.jsx';
import { RecentActivity } from '../../components/dashboard/RecentActivity.jsx';
import { SafeToSpendCard } from '../../components/dashboard/SafeToSpendCard.jsx';
import { SpendingChart } from '../../components/dashboard/SpendingChart.jsx';
import SankeyFlow from '../../components/dashboard/SankeyFlow.jsx';
import { StatsCard } from '../../components/dashboard/StatsCard.jsx';
import { CommitmentVault } from '../../components/dashboard/CommitmentVault.jsx';
import { UpcomingCommitmentsCard } from '../../components/dashboard/UpcomingCommitmentsCard.jsx';
import { FinancialHealthScore } from '../../components/dashboard/FinancialHealthScore.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { NotificationBell } from '../../components/notifications/NotificationBell.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useAuth } from '../../lib/auth.jsx';
import { formatCurrency, MoneyValue } from '../../lib/format.js';
import { calculateSafeBudgetSignal } from '../../lib/safeBudgetSignal.js';
import { cn } from '../../lib/utils.js';
import { dashboardService } from '../../services/dashboard.js';

/* ── Constants & Helpers ───────────────────────────────────── */

const EMPTY_SUMMARY = {
  total_balance: 0,
  balance_change: 0,
  monthly_income: 0,
  monthly_expenses: 0,
  income_change: 0,
  expenses_change: 0,
  total_savings: 0,
  health_score: { score: 0, message: 'No data', color: 'blue' },
  recent_transactions: [],
  spending_chart: [],
  category_chart: [],
  safe_to_spend_stats: null,
  commitment_vault: null,
};

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Category Breakdown Subcomponent ───────────────────────── */

function CategoryBreakdown({ categories = [], totalExpenses = 0 }) {
  if (!categories || categories.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center">
        <PieChartIcon size={24} className="mx-auto text-zinc-500 mb-2" />
        <p className="text-sm font-medium text-white">No category spending recorded</p>
        <p className="text-xs text-zinc-500 mt-1">Expenses will appear categorized here as transactions occur.</p>
      </div>
    );
  }

  const validTotal = totalExpenses > 0 
    ? totalExpenses 
    : categories.reduce((acc, c) => acc + Number(c.value || 0), 0);

  const colors = [
    'from-violet-500 to-indigo-500',
    'from-cyan-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-purple-500 to-violet-500',
  ];

  return (
    <div className="space-y-3.5 py-1">
      {categories.slice(0, 6).map((cat, idx) => {
        const val = Number(cat.value || 0);
        const pct = validTotal > 0 ? Math.min(100, Math.round((val / validTotal) * 100)) : 0;
        const colorGradient = colors[idx % colors.length];

        return (
          <div key={cat.name || idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-200 truncate">{cat.name}</span>
              <div className="flex items-center gap-2">
                <MoneyValue value={val} className="font-bold text-white font-display tabular-nums" />
                <span className="text-[11px] text-zinc-500 w-9 text-right font-medium">{pct}%</span>
              </div>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className={cn('h-full rounded-full bg-linear-to-r transition-all duration-500', colorGradient)}
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Dashboard Component ──────────────────────────────── */

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [chartRange, setChartRange] = useState('week');
  const [data, setData] = useState(null);
  const [triage, setTriage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('sankey'); // 'sankey' | 'trend' | 'categories'

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const [stats, triageData] = await Promise.all([
          dashboardService.getSummary(chartRange),
          dashboardService.getTriage(),
        ]);
        setData(stats);
        setTriage(triageData);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();

    const onSyncChanged = () => {
      fetchDashboard();
    };
    window.addEventListener('transactions:changed', onSyncChanged);
    window.addEventListener('bills:changed', onSyncChanged);
    window.addEventListener('loans:changed', onSyncChanged);
    window.addEventListener('subscriptions:changed', onSyncChanged);
    return () => {
      window.removeEventListener('transactions:changed', onSyncChanged);
      window.removeEventListener('bills:changed', onSyncChanged);
      window.removeEventListener('loans:changed', onSyncChanged);
      window.removeEventListener('subscriptions:changed', onSyncChanged);
    };
  }, [chartRange]);

  const summary = useMemo(() => data || EMPTY_SUMMARY, [data]);

  const autopilotReady =
    Number(summary.monthly_income || 0) > 0 ||
    Number(summary.safe_to_spend_stats?.total_committed || 0) > 0;

  const autopilotStatusText = autopilotReady
    ? 'Autopilot is dynamically protecting commitments and projecting discretionary runway.'
    : 'Add income sources, bills, or loan EMIs to enable automated commitments protection.';

  const weatherState = useMemo(() => {
    if (!summary.safe_to_spend_stats) return null;
    return calculateSafeBudgetSignal(summary.safe_to_spend_stats).weatherState;
  }, [summary.safe_to_spend_stats]);

  const handleActionClick = useCallback(
    (action) => {
      if (action?.action_route) {
        navigate(action.action_route);
      }
    },
    [navigate]
  );

  const healthScoreVal = summary.health_score?.score ?? 0;
  const healthScoreLabel = useMemo(() => {
    if (healthScoreVal >= 80) return 'Optimal';
    if (healthScoreVal >= 60) return 'Healthy';
    if (healthScoreVal >= 40) return 'Fair';
    return 'Attention Needed';
  }, [healthScoreVal]);

  /* ── Loading State ────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex h-[55vh] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-violet-500 animate-spin" />
          <span className="text-sm font-medium">Synchronizing Financial Dashboard...</span>
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="relative isolate space-y-6 md:space-y-8 animate-fade-in pb-16 overflow-x-hidden">
      {/* Ambient Financial Climate Backdrop */}
      <MoneyWeatherBackdrop stats={summary.safe_to_spend_stats} />

      {/* ── Executive Mobile-Native Header ── */}
      <header className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* User Avatar Initial Capsule */}
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600/30 via-indigo-600/20 to-cyan-500/20 border border-violet-500/30 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-violet-500/10 shrink-0">
                {(user?.full_name || user?.email || 'User')[0].toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {getTimeGreeting()}
                </p>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white truncate font-display">
                  <span className="bg-linear-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                    {user?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </h1>
              </div>
            </div>

            {/* Mobile Top-Right Actions */}
            <div className="flex items-center gap-2 shrink-0 md:hidden">
              <Button
                onClick={() => navigate('/dashboard/calendar')}
                variant="outline"
                className="h-9 w-9 p-0 rounded-xl border-white/10 bg-zinc-900/60 hover:bg-white/10 text-zinc-300"
                aria-label="Open Calendar"
              >
                <CalendarDays size={16} />
              </Button>
              <NotificationBell />
            </div>
          </div>

          {/* Climate & Autopilot Status Capsule */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {weatherState && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1 text-xs font-semibold text-zinc-300 backdrop-blur-md self-start shrink-0">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full animate-pulse',
                    weatherState === 'calm'
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                      : weatherState === 'balanced'
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                      : 'bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                  )}
                />
                Climate: <span className="capitalize font-bold text-white">{weatherState}</span>
              </span>
            )}
            <p className="text-xs sm:text-sm font-medium text-zinc-400 leading-relaxed truncate">
              {autopilotStatusText}
            </p>
          </div>
        </div>

        {/* Desktop Header Action Buttons */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0 self-end">
          <Button
            onClick={() => navigate('/dashboard/calendar')}
            variant="outline"
            icon={<CalendarDays size={15} />}
            className="h-9 px-3.5 text-xs font-semibold border-white/10 hover:border-white/20 bg-zinc-900/60"
          >
            Calendar
          </Button>

          <Button
            onClick={() => navigate('/dashboard/transactions')}
            variant="light"
            icon={<Plus size={16} />}
            className="h-9 px-4 text-xs font-bold shadow-lg shadow-violet-500/15"
          >
            Add Transaction
          </Button>

          <NotificationBell />
        </div>

        {/* Mobile Quick Action Pill Bar */}
        <div className="flex md:hidden items-center gap-2.5 pt-1">
          <Button
            onClick={() => navigate('/dashboard/transactions')}
            variant="gradient"
            icon={<Plus size={16} />}
            className="flex-1 h-10 text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-98 transition-all"
          >
            Add Transaction
          </Button>
          <Button
            onClick={() => navigate('/dashboard/calendar')}
            variant="outline"
            icon={<CalendarDays size={15} />}
            className="h-10 px-3.5 text-xs font-semibold border-white/10 bg-zinc-900/60 active:scale-98 transition-all"
          >
            Calendar
          </Button>
        </div>
      </header>

      {/* ── Commitment Vault (Centerpiece Ledger Interpretation) ── */}
      <section className="relative z-10">
        <CommitmentVault snapshot={summary.commitment_vault} isLoading={isLoading} />
      </section>

      {/* ── 4-Metric Key Performance Indicators Grid ── */}
      <section className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Total Balance"
          value={formatCurrency(summary.total_balance)}
          trend={summary.balance_change >= 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(summary.balance_change).toFixed(1)}%`}
          icon={Wallet}
          color="violet"
          className="col-span-2 sm:col-span-1 shadow-lg shadow-violet-500/5 hover-glow-violet"
          isHero
        />

        <StatsCard
          title="Monthly Income"
          value={formatCurrency(summary.monthly_income)}
          trend={summary.income_change >= 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(summary.income_change).toFixed(1)}%`}
          icon={TrendingUp}
          color="emerald"
          className="col-span-1 shadow-lg shadow-emerald-500/5 hover-glow-emerald"
        />

        <StatsCard
          title="Monthly Expenses"
          value={formatCurrency(summary.monthly_expenses)}
          trend={summary.expenses_change >= 0 ? 'up' : 'down'}
          trendValue={`${Math.abs(summary.expenses_change).toFixed(1)}%`}
          icon={ArrowUpRight}
          color="rose"
          className="col-span-1 shadow-lg shadow-rose-500/5 hover-glow-rose"
        />

        <Card className="col-span-2 lg:col-span-1 border-white/5 bg-zinc-900/30 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between p-4 sm:p-5 hover:scale-[1.01] transition-all duration-300 card-specular">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="font-bold uppercase tracking-[0.08em] text-[9px] sm:text-[11px] text-zinc-400">
                Health Score
              </p>
              <div className="p-1.5 rounded-[10px] bg-linear-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-cyan-500/20 text-white border border-white/5">
                <HeartPulse size={14} />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl xl:text-3xl font-black text-white tracking-tight font-display tabular-nums">
                {healthScoreVal}
              </span>
              <span className="text-xs text-zinc-500 font-semibold">/ 100</span>
              <span className="ml-auto inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border bg-violet-500/10 text-violet-300 border-violet-500/20">
                {healthScoreLabel}
              </span>
            </div>
          </div>

          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5 mt-3">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                healthScoreVal >= 80 ? 'bg-emerald-400' :
                healthScoreVal >= 60 ? 'bg-cyan-400' :
                healthScoreVal >= 40 ? 'bg-amber-400' : 'bg-rose-400'
              )}
              style={{ width: `${Math.max(5, healthScoreVal)}%` }}
            />
          </div>
        </Card>
      </section>

      {/* ── Main Workspace: Strategic 2-Column Grid ── */}
      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* ── Left Main Stream (8 cols) ── */}
        <div className="xl:col-span-8 space-y-6">

          {/* Priority Action Center (Surfaced if actions exist) */}
          {triage?.actions?.length > 0 && (
            <section id="priority-action-center" className="animate-fade-in">
              <ActionCenter actions={triage.actions} onAction={handleActionClick} />
            </section>
          )}

          {/* Visual Intelligence Hub (Sankey Flow / Spending Trend / Category Breakdown) */}
          <Card className="p-0 border-white/5 bg-zinc-900/30 backdrop-blur-xl overflow-hidden relative shadow-xl card-specular">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 pt-5 pb-3 gap-3 border-b border-white/5">
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={16} className="text-violet-400" />
                  Financial Flow & Analytics
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Interactive visibility into how money moves</p>
              </div>

              {/* Segmented View Control */}
              <div className="flex items-center rounded-xl bg-black/40 p-1 border border-white/5 self-stretch sm:self-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveChart('sankey')}
                  className={cn(
                    'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                    activeChart === 'sankey'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <GitFork size={13} />
                  <span>Cash Flow</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChart('trend')}
                  className={cn(
                    'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                    activeChart === 'trend'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <TrendingUp size={13} />
                  <span>Spending Trend</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveChart('categories')}
                  className={cn(
                    'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                    activeChart === 'categories'
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  <PieChartIcon size={13} />
                  <span>Categories</span>
                </button>
              </div>
            </div>

            {/* Hub Body */}
            <div className="p-4 sm:p-6">
              {activeChart === 'sankey' && (
                <div className="animate-fade-in">
                  <SankeyFlow summary={summary} />
                </div>
              )}

              {activeChart === 'trend' && (
                <div className="animate-fade-in">
                  <SpendingChart
                    data={summary.spending_chart}
                    range={chartRange}
                    onRangeChange={setChartRange}
                  />
                </div>
              )}

              {activeChart === 'categories' && (
                <div className="animate-fade-in">
                  <CategoryBreakdown
                    categories={summary.category_chart}
                    totalExpenses={Number(summary.monthly_expenses || 0)}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Recent Ledger Activity */}
          <section id="recent-activity">
            <RecentActivity transactions={summary.recent_transactions} maxItems={isMobile ? 5 : 8} />
          </section>
        </div>

        {/* ── Right Intelligence Sidebar (4 cols) ── */}
        <aside className="xl:col-span-4 space-y-6">

          {/* Safe-to-Spend Runway Analysis */}
          <SafeToSpendCard stats={summary.safe_to_spend_stats} />

          {/* Smart Calendar Bridge: Upcoming Commitments */}
          <UpcomingCommitmentsCard maxItems={4} />

          {/* Financial Health Score & Diagnosis */}
          <FinancialHealthScore
            score={summary.health_score?.score}
            message={summary.health_score?.message}
            color={summary.health_score?.color}
          />
        </aside>

      </div>
    </div>
  );
}
