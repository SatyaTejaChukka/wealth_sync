import React from 'react';
import { CheckCircle2, TriangleAlert } from 'lucide-react';

import { formatCurrency } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';

function RuleProgressBar({ label, amount, percent, tone }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="tabular-nums text-zinc-300">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tone)}
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function SalaryRuleEnginePanel({ engine }) {
  if (!engine) {
    return null;
  }

  const allocation = engine.allocation || {};
  const actuals = engine.actuals || {};
  const confidence = engine.confidence || {};
  const status = engine.status || {};
  const warningDetails = Array.isArray(engine.warning_details) ? engine.warning_details : [];
  const goals = Array.isArray(engine.buckets?.goals) ? engine.buckets.goals : [];
  const plannedExpenses = Array.isArray(engine.buckets?.planned_expenses)
    ? engine.buckets.planned_expenses
    : [];
  const topGoalAllocations = goals.slice(0, 3);
  const topPlannedExpenses = plannedExpenses.slice(0, 3);
  const salaryBasis = Number(engine.salary_considered || 0);

  const splitPercentages =
    salaryBasis <= 0
      ? { commitments: 0, plannedExpenses: 0, goals: 0, freeMoney: 0 }
      : {
          commitments: (Number(allocation.commitments || 0) / salaryBasis) * 100,
          plannedExpenses: (Number(allocation.planned_expenses || 0) / salaryBasis) * 100,
          goals: (Number(allocation.goals || 0) / salaryBasis) * 100,
          freeMoney: (Number(allocation.free_money || 0) / salaryBasis) * 100,
        };

  const salarySourceLabel =
    engine.salary_source === 'income_transactions'
      ? 'This month income transactions'
      : engine.salary_source === 'income_sources'
        ? 'Income source settings'
        : 'Manual override';

  return (
    <Card className="border-white/5 bg-zinc-900/40">
      <CardHeader className="pb-3">
        <CardTitle>Salary Rule Engine</CardTitle>
        <p className="text-sm text-zinc-400">
          Detailed breakdown of how salary is being split across commitments, plans, goals, and
          free money.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Current Basis</p>
              <p className="mt-1 text-sm text-zinc-300">{engine.status_message}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Source: {salarySourceLabel}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Salary considered</p>
              <p className="text-sm font-semibold text-white tabular-nums">
                {formatCurrency(engine.salary_considered)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Confidence: {confidence.score ?? 0}/100 ({confidence.label || 'low'})
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-black/25 p-4">
          <RuleProgressBar
            label="Commitments First"
            amount={Number(allocation.commitments || 0)}
            percent={splitPercentages.commitments}
            tone="bg-blue-500"
          />
          <RuleProgressBar
            label="Planned Expenses"
            amount={Number(allocation.planned_expenses || 0)}
            percent={splitPercentages.plannedExpenses}
            tone="bg-amber-500"
          />
          <RuleProgressBar
            label="Goals by Priority"
            amount={Number(allocation.goals || 0)}
            percent={splitPercentages.goals}
            tone="bg-indigo-500"
          />
          <RuleProgressBar
            label="Free Money"
            amount={Number(allocation.free_money || 0)}
            percent={splitPercentages.freeMoney}
            tone="bg-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
              Top Planned Expenses
            </p>
            {topPlannedExpenses.length === 0 ? (
              <p className="text-xs text-zinc-500">No planned expense rules</p>
            ) : (
              <div className="space-y-2">
                {topPlannedExpenses.map((expense) => (
                  <div
                    key={expense.rule_id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-zinc-300">{expense.category_name}</span>
                    <span className="tabular-nums text-zinc-200">
                      {formatCurrency(expense.allocated || 0)} /{' '}
                      {formatCurrency(expense.requested || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
              Top Goal Allocations
            </p>
            {topGoalAllocations.length === 0 ? (
              <p className="text-xs text-zinc-500">No active goals</p>
            ) : (
              <div className="space-y-2">
                {topGoalAllocations.map((goal) => (
                  <div
                    key={goal.goal_id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="truncate text-zinc-300">
                      {goal.goal_name} (P{goal.priority})
                    </span>
                    <span className="tabular-nums text-zinc-200">
                      {formatCurrency(goal.allocated)} / {formatCurrency(goal.requested)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">Actual Spend</p>
            <div className="space-y-2 text-xs text-zinc-300">
              <div className="flex items-center justify-between gap-3">
                <span>Commitment spend</span>
                <span className="tabular-nums">{formatCurrency(actuals.commitment_spend || 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Planned spend</span>
                <span className="tabular-nums">{formatCurrency(actuals.planned_spend || 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Goal contributions</span>
                <span className="tabular-nums">{formatCurrency(actuals.goal_contributions || 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Flexible spend</span>
                <span className="tabular-nums">{formatCurrency(actuals.flexible_spend || 0)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-zinc-900/70 p-3 md:col-span-2">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-zinc-500">Rule Health</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                {allocation.free_money_floor_met ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <TriangleAlert size={14} className="text-amber-400" />
                )}
                <span>
                  Free floor target: {formatCurrency(allocation.free_money_floor_target || 0)}
                </span>
              </div>

              <p className="text-zinc-400">
                Primary blocker: <span className="text-zinc-200">{String(status.primary_constraint || 'healthy').replaceAll('_', ' ')}</span>
              </p>

              {confidence.reasons?.length ? (
                <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    Confidence notes
                  </p>
                  <div className="space-y-1 text-zinc-300">
                    {confidence.reasons.slice(0, 3).map((reason) => (
                      <p key={reason}>{reason}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {warningDetails.length === 0 ? (
                <p className="text-emerald-300">No rule warnings</p>
              ) : (
                warningDetails.slice(0, 4).map((warning) => (
                  <div key={`${warning.code}-${warning.message}`} className="rounded-lg border border-amber-500/20 bg-amber-500/8 p-3">
                    <p className="text-amber-200">{warning.message}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-amber-100/80">
                      {warning.severity}
                      {warning.amount > 0 ? ` • ${formatCurrency(warning.amount)}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
