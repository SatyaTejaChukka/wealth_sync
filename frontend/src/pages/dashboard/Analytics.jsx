import React, { useEffect, useState } from 'react';
import { SpendingChart } from '../../components/dashboard/SpendingChart.jsx';
import { SalaryRuleEnginePanel } from '../../components/dashboard/SalaryRuleEnginePanel.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { PieChart as PieChartIcon } from 'lucide-react';
import { MoneyValue } from '../../lib/format.js';
import { dashboardService } from '../../services/dashboard.js';

// Curated high-contrast radiant palette for category distribution
const CATEGORY_PALETTE = [
  { bg: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)', text: 'text-violet-400' },
  { bg: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', text: 'text-cyan-400' },
  { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-400' },
  { bg: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)', text: 'text-pink-400' },
  { bg: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: 'text-emerald-400' },
  { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)', text: 'text-blue-400' },
  { bg: '#f97316', glow: 'rgba(249, 115, 22, 0.4)', text: 'text-orange-400' },
  { bg: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', text: 'text-purple-400' },
  { bg: '#14b8a6', glow: 'rgba(20, 184, 166, 0.4)', text: 'text-teal-400' },
  { bg: '#e11d48', glow: 'rgba(225, 29, 72, 0.4)', text: 'text-rose-400' },
  { bg: '#84cc16', glow: 'rgba(132, 204, 22, 0.4)', text: 'text-lime-400' },
  { bg: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', text: 'text-indigo-400' },
];

export default function Analytics() {
  const [data, setData] = useState({ spending_chart: [], category_chart: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [chartRange, setChartRange] = useState('week');

  useEffect(() => {
     const fetchData = async () => {
         try {
             setIsLoading(true);
             const res = await dashboardService.getSummary(chartRange);
             setData(res);
         } catch (e) {
             console.error("Failed to fetch analytics", e);
         } finally {
             setIsLoading(false);
         }
     };
     fetchData();
  }, [chartRange]);

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[50vh]">
             <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
                <span className="text-sm font-medium">Loading Analytics...</span>
            </div>
        </div>
      );
  }

  const totalCategorySpend = (data.category_chart || []).reduce(
    (acc, curr) => acc + (Number(curr?.value) || 0),
    0
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-slide-up">
       <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight font-display">Analytics</h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">Deep dive into your financial habits with real-time data.</p>
      </div>

      <div className="grid gap-6">
        <SpendingChart 
            data={data.spending_chart} 
            range={chartRange}
            onRangeChange={setChartRange}
        />

        <SalaryRuleEnginePanel engine={data.safe_to_spend_stats?.salary_rule_engine} />

        {/* Revamped Top-Tier Spending by Category */}
        <Card className="border-white/5 bg-zinc-900/40 card-specular">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-bold text-white">
                  Spending by Category
                </CardTitle>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  This Month
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {data.category_chart?.length || 0} {(data.category_chart?.length === 1 ? 'category' : 'categories')} recorded this cycle
              </p>
            </div>
            
            {totalCategorySpend > 0 && (
              <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-2 pt-1 sm:pt-0 border-t border-white/5 sm:border-0">
                <span className="text-xs text-zinc-500 font-medium">Total Spent</span>
                <MoneyValue
                  value={totalCategorySpend}
                  className="text-base sm:text-lg font-bold text-white font-display tabular-nums"
                />
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {!data.category_chart || data.category_chart.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-500 mb-2.5">
                  <PieChartIcon size={20} />
                </div>
                <p className="text-sm font-medium text-white/80">No expenses recorded this month</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                  Expenses you log or sync will automatically sort and illuminate here by category.
                </p>
              </div>
            ) : (
              <>
                {/* Proportional Multi-Segmented Category Distribution Ribbon */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-black/40 border border-white/[0.06] p-0.5 gap-0.5">
                    {data.category_chart.map((cat, idx) => {
                      const val = Number(cat.value || 0);
                      const pct = totalCategorySpend > 0 ? (val / totalCategorySpend) * 100 : 0;
                      const theme = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={cat.name || idx}
                          className="h-full rounded-xs transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                          style={{
                            width: `${Math.max(pct, 1.5)}%`,
                            backgroundColor: theme.bg,
                          }}
                          title={`${cat.name}: ${pct.toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Ranked Category Rows inside Micro-Segmented Surface */}
                <div className="segmented-deck divide-y divide-white/[0.04] max-h-[420px] overflow-y-auto">
                  {data.category_chart.map((cat, idx) => {
                    const val = Number(cat.value || 0);
                    const pct = totalCategorySpend > 0 ? (val / totalCategorySpend) * 100 : 0;
                    const theme = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
                    const name = cat.name === 'Uncategorized' ? 'Other / General' : cat.name;

                    return (
                      <div
                        key={cat.name || idx}
                        className="p-3 sm:px-4 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: theme.bg,
                                boxShadow: `0 0 10px ${theme.glow}`,
                              }}
                            />
                            <span className="text-xs sm:text-sm font-semibold text-white/90 truncate max-w-[130px] sm:max-w-[240px]">
                              {name}
                            </span>
                            <span className="text-[10px] font-semibold font-mono text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded shrink-0">
                              {pct >= 1 ? `${pct.toFixed(0)}%` : `${pct.toFixed(1)}%`}
                            </span>
                          </div>

                          <div className="shrink-0 text-right">
                            <MoneyValue
                              value={val}
                              className="text-xs sm:text-sm font-semibold text-white font-display tabular-nums"
                            />
                          </div>
                        </div>

                        {/* Illuminated Progress Indicator */}
                        <div className="w-full bg-white/[0.03] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(0, Math.min(100, pct))}%`,
                              backgroundColor: theme.bg,
                              boxShadow: `0 0 8px ${theme.glow}`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
