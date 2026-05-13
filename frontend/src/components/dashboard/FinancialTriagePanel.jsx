import React from 'react';
import { AlertTriangle, CircleDollarSign, Gauge, ReceiptText, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import { CollapsibleCard } from '../mobile/CollapsibleCard.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { formatCurrency, formatPercent } from '../../lib/format.js';

const levelStyles = {
  low: {
    label: 'Low Stress',
    accent: 'text-emerald-400',
    meter: 'bg-emerald-500',
    panel: 'border-emerald-500/20',
  },
  moderate: {
    label: 'Moderate Stress',
    accent: 'text-amber-400',
    meter: 'bg-amber-500',
    panel: 'border-amber-500/20',
  },
  high: {
    label: 'High Stress',
    accent: 'text-orange-400',
    meter: 'bg-orange-500',
    panel: 'border-orange-500/20',
  },
  critical: {
    label: 'Critical Stress',
    accent: 'text-rose-400',
    meter: 'bg-rose-500',
    panel: 'border-rose-500/20',
  },
};

export function FinancialTriagePanel({ triage }) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (!triage) {
    return (
      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-zinc-800 rounded w-48" />
            <div className="h-9 bg-zinc-800 rounded w-28" />
            <div className="h-2 bg-zinc-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const style = levelStyles[triage.stress_level] || levelStyles.moderate;
  const score = Math.min(100, Math.max(0, Number(triage.stress_score || 0)));
  const detailGrid = (
    <div className={isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
      <div className="rounded-xl border border-white/5 bg-black/20 p-3">
        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
          <Gauge size={13} />
          Burn Rate
        </div>
        <p className="text-white font-semibold mt-1">{formatPercent(triage.burn_rate_pct, 1)}</p>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/20 p-3">
        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
          <CircleDollarSign size={13} />
          Fixed Costs
        </div>
        <p className="text-white font-semibold mt-1">{formatCurrency(triage.monthly_fixed_costs)}</p>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/20 p-3">
        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
          <AlertTriangle size={13} />
          Buffer
        </div>
        <p className="text-white font-semibold mt-1">{triage.liquidity_buffer_days} day(s)</p>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/20 p-3">
        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-wide">
          <ReceiptText size={13} />
          Data Cleanup
        </div>
        <p className="text-white font-semibold mt-1">
          {triage.pending_transaction_count + triage.uncategorized_expense_count} item(s)
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Card className={`bg-zinc-900/75 border ${style.panel}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert size={18} className={style.accent} />
            Financial Stress Radar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-zinc-500 text-sm">Current stress score</p>
              <p className={`text-3xl font-bold ${style.accent}`}>{score}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${style.panel} ${style.accent}`}>
              {style.label}
            </div>
          </div>

          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full ${style.meter} transition-all duration-500`}
              style={{ width: `${score}%` }}
            />
          </div>

          <CollapsibleCard
            title="More Details"
            description="Open burn rate, buffer, and cleanup signals."
            className="border-white/5 bg-black/10"
            headerClassName="px-0 py-0 hover:bg-transparent"
          >
            {detailGrid}
          </CollapsibleCard>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-zinc-900/75 border ${style.panel}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert size={18} className={style.accent} />
          Financial Stress Radar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-zinc-500 text-sm">Current stress score</p>
            <p className={`text-3xl font-bold ${style.accent}`}>{score}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${style.panel} ${style.accent}`}>
            {style.label}
          </div>
        </div>

        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full ${style.meter} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>

        {detailGrid}
      </CardContent>
    </Card>
  );
}
