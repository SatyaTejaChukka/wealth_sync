import React from 'react';
import { Gauge, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react';

import { formatCurrency } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

const allocationTones = {
  hard_commitments: {
    label: 'Hard Commitments',
    bar: 'bg-blue-500',
    panel: 'border-blue-500/20 bg-blue-500/8',
  },
  planned_expenses: {
    label: 'Planned Expenses',
    bar: 'bg-amber-500',
    panel: 'border-amber-500/20 bg-amber-500/8',
  },
  goals: {
    label: 'Goals',
    bar: 'bg-indigo-500',
    panel: 'border-indigo-500/20 bg-indigo-500/8',
  },
  free_money_budget: {
    label: 'Free Money',
    bar: 'bg-emerald-500',
    panel: 'border-emerald-500/20 bg-emerald-500/8',
  },
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentOf(value, total) {
  if (total <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function titleCase(value) {
  return String(value || 'healthy')
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function DetailTile({ label, value, toneClass, description }) {
  return (
    <div className={cn("rounded-xl border p-3", toneClass || 'border-white/10 bg-zinc-950/60')}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 font-bold">{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums text-white leading-tight">{value}</p>
      {description && <p className="mt-1 text-[10px] text-zinc-500 leading-tight">{description}</p>}
    </div>
  );
}


export const MoneyFlow = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const engine = stats.salary_rule_engine || {};
  const moneyFlow = stats.money_flow || engine.money_flow || {};
  const confidence = stats.confidence || engine.confidence || {};
  const planningStatus = stats.planning_status || engine.status || {};
  const warningDetails = Array.isArray(engine.warning_details) ? engine.warning_details : [];

  const income = toNumber(moneyFlow.income || stats.total_income);
  const hardCommitments = toNumber(moneyFlow.hard_commitments);
  const plannedExpenses = toNumber(moneyFlow.planned_expenses);
  const goals = toNumber(moneyFlow.goals);
  const freeMoneyBudget = toNumber(moneyFlow.free_money_budget || stats.monthly_free_budget);
  const flexibleSpend = toNumber(moneyFlow.flexible_spend || stats.actuals?.flexible_spend);
  const remainingSafe = toNumber(moneyFlow.remaining_safe_to_spend || stats.safe_to_spend);
  const overageTotal = toNumber(moneyFlow.total_overage);

  const allocationItems = [
    { key: 'hard_commitments', value: hardCommitments },
    { key: 'planned_expenses', value: plannedExpenses },
    { key: 'goals', value: goals },
    { key: 'free_money_budget', value: freeMoneyBudget },
  ];

  const salarySourceLabel =
    engine.salary_source === 'income_transactions'
      ? 'Posted income'
      : engine.salary_source === 'income_sources'
        ? 'Income settings'
        : 'Manual override';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-semibold text-zinc-100">
            <Sparkles size={16} className="text-violet-300" />
            Money Flow
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Automated allocation of your monthly income into protected buckets for bills, goals, and savings.
          </p>
        </div>

        <div className={cn(
          "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors",
          income > 0 ? "border-white/10 bg-black/25 text-zinc-400" : "border-amber-500/20 bg-amber-500/10 text-amber-300 shadow-lg shadow-amber-500/5"
        )}>
          <Gauge size={12} className={income > 0 ? "text-violet-300" : "text-amber-300"} />
          <span>{income > 0 ? `Priority: ${titleCase(planningStatus.primary_constraint || planningStatus.health_state)}` : "Missing Plan Basis"}</span>
        </div>

      </div>

      <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Monthly income basis</p>
            {income > 0 ? (
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">{formatCurrency(income)}</p>
            ) : (
              <button 
                onClick={() => window.location.hash = '#/income'} // Assuming there's an income section
                className="mt-1 text-sm font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                Add Income Source +
              </button>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Confidence</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {income > 0 ? (
                <>
                  {confidence.score ?? 0}/100
                  <span className="ml-1 text-zinc-400">({titleCase(confidence.label)})</span>
                </>
              ) : (
                <span className="text-zinc-500 italic">Waiting for data...</span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-800">
          {income > 0 ? (
            allocationItems.map((item) => {
              const tone = allocationTones[item.key];
              const width = percentOf(item.value, income);
              if (width <= 0) {
                return null;
              }
              return <div key={item.key} className={tone.bar} style={{ width: `${width}%` }} />;
            })
          ) : (
            <div className="w-full h-full bg-zinc-800/50 animate-pulse" />
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {allocationItems.map((item) => {
            const tone = allocationTones[item.key];
            const hasData = item.value > 0;
            const tooltips = {
              hard_commitments: "Fixed bills & subscriptions",
              planned_expenses: "Monthly category budgets",
              goals: "Savings goal targets",
              free_money_budget: "Remaining for any use"
            };
            return (
              <div 
                key={item.key}
                className={cn(
                  "relative rounded-xl border p-3 transition-all group overflow-hidden",
                  hasData ? (tone.panel || 'border-white/10 bg-zinc-950/60') : "border-white/5 bg-zinc-950/20 grayscale opacity-60"
                )}
              >
                <div className="flex items-center justify-between">
                   <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">{tone.label}</p>
                   <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors cursor-help" title={tooltips[item.key]}>?</span>
                </div>
                <p className={cn("mt-1 text-base font-bold tabular-nums tracking-tight", hasData ? "text-white" : "text-zinc-600")}>
                  {formatCurrency(item.value)}
                </p>
                {hasData && (
                   <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-20" style={{ width: `${percentOf(item.value, income)}%`, color: 'inherit' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <DetailTile 
          label="Flexible spend used" 
          value={formatCurrency(flexibleSpend)} 
          description={stats.breakdown?.pending_transaction_count > 0 
            ? `${stats.breakdown.pending_transaction_count} pending txns hidden` 
            : "Spending outside of your protected buckets"}
          toneClass={stats.breakdown?.pending_transaction_count > 0 ? 'border-amber-500/20' : null}
        />

        <DetailTile
          label="Budget overage"
          value={formatCurrency(overageTotal)}
          toneClass={overageTotal > 0 ? 'border-rose-500/20 bg-rose-500/8' : 'border-white/10 bg-zinc-950/60'}
          description="Excess spending in protected categories"
        />
        <DetailTile
          label="Safe to spend"
          value={formatCurrency(remainingSafe)}
          toneClass="border-emerald-500/20 bg-emerald-500/8 shadow-lg shadow-emerald-500/5"
          description="True remaining balance after all commitments"
        />
      </div>


      <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Rule Snapshot</p>
            <p className="mt-1 text-sm text-zinc-300">{engine.status_message}</p>
            <p className="mt-1 text-[11px] text-zinc-500">Source: {salarySourceLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:min-w-[18rem]">
            <DetailTile
              label="Primary blocker"
              value={titleCase(planningStatus.primary_constraint)}
            />
            <DetailTile
              label="Floor target"
              value={formatCurrency(engine.allocation?.free_money_floor_target || 0)}
            />
          </div>
        </div>

        {confidence.reasons?.length ? (
          <div className="mt-3 rounded-lg border border-white/10 bg-zinc-950/70 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Confidence notes</p>
            <div className="mt-2 space-y-1 text-xs text-zinc-300">
              {confidence.reasons.slice(0, 3).map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {warningDetails.length > 0 ? (
            warningDetails.slice(0, 3).map((warning) => (
              <div
                key={`${warning.code}-${warning.message}`}
                className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 p-3 text-xs"
              >
                <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-300" />
                <div className="min-w-0">
                  <p className="font-medium text-amber-100">{warning.message}</p>
                  <p className="mt-1 text-amber-200/80">
                    Severity: {titleCase(warning.severity)}
                    {warning.amount > 0 ? ` • ${formatCurrency(warning.amount)}` : ''}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-3 text-xs">
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-emerald-300" />
              <p className="text-emerald-100">
                No active planning warnings. Protected buckets and free-money runway are aligned.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
