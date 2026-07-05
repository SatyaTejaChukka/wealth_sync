import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { ActionCenter } from '../../components/dashboard/ActionCenter.jsx';
import { MoneyWeatherBackdrop } from '../../components/dashboard/MoneyWeatherBackdrop.jsx';
import { RecentActivity } from '../../components/dashboard/RecentActivity.jsx';
import { SafeToSpendCard } from '../../components/dashboard/SafeToSpendCard.jsx';
import { SpendingChart } from '../../components/dashboard/SpendingChart.jsx';
import SankeyFlow from '../../components/dashboard/SankeyFlow.jsx';
import { StatsCard } from '../../components/dashboard/StatsCard.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { NotificationBell } from '../../components/notifications/NotificationBell.jsx';
import { TimelineView } from '../../components/timeline/TimelineView.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { useAuth } from '../../lib/auth.jsx';
import { formatCurrency } from '../../lib/format.js';
import { calculateSafeBudgetSignal } from '../../lib/safeBudgetSignal.js';
import { cn } from '../../lib/utils.js';
import { dashboardService } from '../../services/dashboard.js';

/* ── Constants ─────────────────────────────────────────────── */

const MOBILE_TAB_IDS = ['overview', 'timeline'];
const DESKTOP_TAB_IDS = ['overview', 'timeline'];

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
  safe_to_spend_stats: null,
};

/* ── Tab Button ────────────────────────────────────────────── */

function TabButton({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
        isActive
          ? 'border-violet-400/50 bg-violet-500/15 text-violet-200'
          : 'border-white/10 bg-zinc-900/70 text-zinc-300 hover:bg-zinc-900'
      )}
    >
      {label}
    </button>
  );
}

/* ── Main Dashboard ────────────────────────────────────────── */

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const [chartRange, setChartRange] = useState('week');
  const [data, setData] = useState(null);
  const [triage, setTriage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tab state
  const [mobileTab, setMobileTab] = useState(MOBILE_TAB_IDS[0]);
  const [desktopTab, setDesktopTab] = useState(DESKTOP_TAB_IDS[0]);
  const [activeChart, setActiveChart] = useState('sankey');

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

    const onTransactionsChanged = () => {
      fetchDashboard();
    };
    window.addEventListener('transactions:changed', onTransactionsChanged);
    return () => window.removeEventListener('transactions:changed', onTransactionsChanged);
  }, [chartRange]);

  const summary = useMemo(() => data || EMPTY_SUMMARY, [data]);
  const autopilotReady =
    Number(summary.monthly_income || 0) > 0 ||
    Number(summary.safe_to_spend_stats?.total_committed || 0) > 0;
  const autopilotStatusText = autopilotReady
    ? 'Autopilot is calculating from your live income, commitments, and transactions.'
    : 'Add income, bills, subscriptions, or goals to start autopilot calculations.';

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

  const mobilePriorityActions = useMemo(
    () => (Array.isArray(triage?.actions) ? triage.actions.slice(0, 3) : []),
    [triage?.actions]
  );

  /* ── Loading ─────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
          <span className="text-sm font-medium">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="relative isolate space-y-4 animate-fade-in pb-12 md:space-y-8 md:pb-10 overflow-x-hidden">


      <MoneyWeatherBackdrop stats={summary.safe_to_spend_stats} />

      {isMobile ? (
        /* ═══════════════════════════════════════════════════
           MOBILE LAYOUT
           ═══════════════════════════════════════════════════ */
        <>
          {/* ── Mobile Header & Hero Cards ── */}
          <section id="mobile-hero" className="relative z-10 space-y-5 px-1">
            <div className="space-y-3 animate-slide-up">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1" />

                <div className="flex shrink-0 items-center gap-3">
                  <NotificationBell />
                  <Button
                    onClick={() => navigate('/dashboard/transactions')}
                    variant="light"
                    icon={<Plus size={16} />}
                    className="shrink-0 rounded-2xl px-4 h-9 text-xs font-bold shadow-lg shadow-violet-500/10"
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="min-w-0 space-y-1.5">
                <h1 className="text-[1.85rem] font-extrabold tracking-tight leading-[1.05] text-white sm:text-[2.2rem]">
                  Welcome back,{' '}
                  <span className="bg-linear-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent animate-pulse-slow">
                    {user?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                </h1>
                <p className="max-w-[20rem] text-[14px] font-medium leading-relaxed text-zinc-400/90 sm:max-w-md">
                  {autopilotStatusText}
                </p>
              </div>
            </div>


            {/* Stats grid - PRIMARY DATA TOP */}
            <div className="grid grid-cols-3 gap-2 opacity-0 animate-stagger-1">
              <StatsCard
                title="Balance"
                value={formatCurrency(summary.total_balance)}
                trend={summary.balance_change >= 0 ? 'up' : 'down'}
                trendValue={`${Math.abs(summary.balance_change).toFixed(1)}%`}
                icon={Wallet}
                color="violet"
                className="shadow-xl shadow-violet-500/5 px-2 py-3"
              />
              <StatsCard
                title="Income"
                value={formatCurrency(summary.monthly_income)}
                trend={summary.income_change >= 0 ? 'up' : 'down'}
                trendValue={`${Math.abs(summary.income_change).toFixed(1)}%`}
                icon={TrendingUp}
                color="emerald"
                className="shadow-xl shadow-emerald-500/5 px-2 py-3"
              />
              <StatsCard
                title="Expenses"
                value={formatCurrency(summary.monthly_expenses)}
                trend={summary.expenses_change >= 0 ? 'up' : 'down'}
                trendValue={`${Math.abs(summary.expenses_change).toFixed(1)}%`}
                icon={ArrowUpRight}
                color="rose"
                className="shadow-xl shadow-rose-500/5 px-2 py-3"
              />
            </div>

            {/* Analysis Metrics - SECONDARY */}
            <div className="opacity-0 animate-stagger-2">
              <SafeToSpendCard stats={summary.safe_to_spend_stats} />
            </div>

            {/* Priority actions */}
            {mobilePriorityActions.length > 0 ? (
              <div className="opacity-0 animate-stagger-3">
                <ActionCenter actions={mobilePriorityActions} onAction={handleActionClick} />
              </div>
            ) : null}

          </section>

          {/* ── Mobile Tabbed Content ── */}
          <section id="mobile-tabs" className="relative z-10 space-y-5 px-1">
            <div className="sticky top-0 z-50 pt-3 pb-3 bg-[#09090b]/80 backdrop-blur-2xl -mx-1 px-1">
              <div className="flex gap-2 overflow-x-auto rounded-[20px] border border-white/10 bg-black/40 p-1.5 scrollbar-none shadow-2xl">
                <button
                  onClick={() => setMobileTab('overview')}
                  className={cn(
                    'flex-1 h-10 flex items-center justify-center rounded-[14px] text-xs font-bold transition-all duration-300 px-4 whitespace-nowrap',
                    mobileTab === 'overview'
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 scale-[1.02]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  Overview
                </button>
                <button
                  onClick={() => setMobileTab('timeline')}
                  className={cn(
                    'flex-1 h-10 flex items-center justify-center rounded-[14px] text-xs font-bold transition-all duration-300 px-4 whitespace-nowrap',
                    mobileTab === 'timeline'
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 scale-[1.02]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  Timeline
                </button>
              </div>
            </div>


            <div key={mobileTab} className="animate-fade-in">
              {mobileTab === 'overview' && (
                <div className="space-y-4">
                  {/* Unified Chart Card */}
                  <Card className="p-0 border-white/5 bg-zinc-900/30 backdrop-blur-md overflow-hidden relative">
                    <div className="flex justify-between items-center px-4 pt-4 pb-1">
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider">Visual Flow</h3>
                      <div className="flex rounded-lg bg-zinc-800/60 p-0.5 border border-white/5">
                        <button
                          onClick={() => setActiveChart('sankey')}
                          className={cn(
                            "px-2 py-1 text-[10px] font-semibold rounded-md transition-all",
                            activeChart === 'sankey' 
                              ? "bg-violet-600 text-white shadow-sm" 
                              : "text-zinc-400 hover:text-white"
                          )}
                        >
                          Flow
                        </button>
                        <button
                          onClick={() => setActiveChart('trend')}
                          className={cn(
                            "px-2 py-1 text-[10px] font-semibold rounded-md transition-all",
                            activeChart === 'trend' 
                              ? "bg-violet-600 text-white shadow-sm" 
                              : "text-zinc-400 hover:text-white"
                          )}
                        >
                          Trend
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-3">
                      {activeChart === 'sankey' ? (
                        <SankeyFlow summary={summary} />
                      ) : (
                        <SpendingChart
                          data={summary.spending_chart}
                          range={chartRange}
                          onRangeChange={setChartRange}
                        />
                      )}
                    </div>
                  </Card>

                  <RecentActivity transactions={summary.recent_transactions} maxItems={5} />
                </div>
              )}

              {mobileTab === 'timeline' && (
                <div className="w-full isolate max-h-[70vh] overflow-y-auto rounded-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700">
                  <TimelineView />
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        /* ═══════════════════════════════════════════════════
           DESKTOP LAYOUT
           ═══════════════════════════════════════════════════ */
        <>
          {/* ── Desktop Header ── */}
          <div id="desktop-header" className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex flex-wrap items-center gap-3">
                <span>Welcome back,{' '}</span>
                <span className="bg-linear-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  {user?.full_name || user?.email?.split('@')[0] || 'User'}
                </span>
                {weatherState && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-zinc-900/60 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      weatherState === 'calm' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      weatherState === 'balanced' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                      'bg-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    )} />
                    Weather: <span className="capitalize">{weatherState}</span>
                  </span>
                )}
              </h1>
              <p className="mt-1 max-w-2xl text-zinc-400">{autopilotStatusText}</p>
            </div>
            <div className="flex w-full items-center justify-start gap-3 overflow-x-auto pb-1 scrollbar-none sm:overflow-visible xl:w-auto xl:justify-end">
              <NotificationBell />
              <Button
                onClick={() => navigate('/dashboard/transactions')}
                variant="light"
                icon={<Plus size={18} />}
                className="shrink-0"
              >
                Add Transaction
              </Button>
            </div>
          </div>

          {/* ── Stats Row ── */}
          <div id="desktop-stats" className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatsCard
              title="Total Balance"
              value={formatCurrency(summary.total_balance)}
              trend={summary.balance_change >= 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(summary.balance_change).toFixed(1)}%`}
              icon={Wallet}
              color="violet"
              className="hover-glow-violet"
            />
            <StatsCard
              title="Monthly Income"
              value={formatCurrency(summary.monthly_income)}
              trend={summary.income_change >= 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(summary.income_change).toFixed(1)}%`}
              icon={TrendingUp}
              color="emerald"
              className="hover-glow-emerald"
            />
            <StatsCard
              title="Monthly Expenses"
              value={formatCurrency(summary.monthly_expenses)}
              trend={summary.expenses_change >= 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(summary.expenses_change).toFixed(1)}%`}
              icon={ArrowUpRight}
              color="rose"
              className="hover-glow-rose"
            />
          </div>

          {/* ── Main Content: 2-column grid ── */}
          <div id="desktop-main" className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* LEFT — Main Feed (2/3) */}
            <div className="xl:col-span-2 space-y-6">

              {/* Tab selector */}
              <div className="flex gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 backdrop-blur-lg">
                <TabButton
                  label="Overview"
                  isActive={desktopTab === 'overview'}
                  onClick={() => setDesktopTab('overview')}
                />
                <TabButton
                  label="Timeline"
                  isActive={desktopTab === 'timeline'}
                  onClick={() => setDesktopTab('timeline')}
                />
              </div>

              {/* Tab content */}
              <div key={desktopTab} className="animate-fade-in">
                {desktopTab === 'overview' && (
                  <div className="space-y-6">
                    {triage?.actions?.length > 0 ? (
                      <ActionCenter actions={triage.actions} onAction={handleActionClick} />
                    ) : null}

                    {/* Unified Chart Card */}
                    <Card className="p-0 border-white/5 bg-zinc-900/30 backdrop-blur-md overflow-hidden relative">
                      <div className="flex justify-between items-center px-5 pt-5 pb-2">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Visual Flow Analysis</h3>
                        <div className="flex rounded-xl bg-zinc-800/60 p-1 border border-white/5">
                          <button
                            onClick={() => setActiveChart('sankey')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                              activeChart === 'sankey' 
                                ? "bg-violet-600 text-white shadow-md shadow-violet-600/10" 
                                : "text-zinc-400 hover:text-white"
                            )}
                          >
                            Cash Flow
                          </button>
                          <button
                            onClick={() => setActiveChart('trend')}
                            className={cn(
                              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                              activeChart === 'trend' 
                                ? "bg-violet-600 text-white shadow-md shadow-violet-600/10" 
                                : "text-zinc-400 hover:text-white"
                            )}
                          >
                            Spending Trend
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-5 pt-2">
                        {activeChart === 'sankey' ? (
                          <SankeyFlow summary={summary} />
                        ) : (
                          <SpendingChart
                            data={summary.spending_chart}
                            range={chartRange}
                            onRangeChange={setChartRange}
                          />
                        )}
                      </div>
                    </Card>

                    <RecentActivity transactions={summary.recent_transactions} />
                  </div>
                )}

                {desktopTab === 'timeline' && (
                  <TimelineView />
                )}
              </div>
            </div>

            {/* RIGHT — Utility Sidebar (1/3) */}
            <div className="xl:col-span-1 space-y-6 sticky top-8 self-start">
              <SafeToSpendCard stats={summary.safe_to_spend_stats} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
