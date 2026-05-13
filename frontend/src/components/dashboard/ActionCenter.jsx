import React from 'react';
import { ArrowRight, CalendarDays, CircleCheckBig, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { formatCurrency, formatDate } from '../../lib/format.js';

const severityStyles = {
  critical: {
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    label: 'Critical',
  },
  high: {
    badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    label: 'High',
  },
  medium: {
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    label: 'Medium',
  },
  low: {
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    label: 'Low',
  },
};

export function ActionCenter({ actions = [], onAction }) {
  const hasActions = actions.length > 0;

  return (
    <Card className="bg-zinc-900/40 border-white/5 h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <TriangleAlert size={18} className="text-violet-300" />
          Priority Action Center
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 p-4 sm:p-6">
        {!hasActions ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-8 text-center">
            <CircleCheckBig size={28} className="mx-auto text-emerald-400 mb-2" />
            <p className="text-white font-medium">No urgent actions</p>
            <p className="text-sm text-zinc-500 mt-1">Keep logging transactions to keep this view accurate.</p>
          </div>
        ) : (
          actions.slice(0, 6).map((action) => {
            const style = severityStyles[action.severity] || severityStyles.medium;
            return (
              <div
                key={action.id}
                className="rounded-xl border border-white/5 bg-black/20 p-3 sm:p-4 hover:border-white/15 transition-colors"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full border ${style.badge}`}>
                        {style.label}
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-zinc-500">{action.area}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white">{action.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{action.detail}</p>
                  </div>
                  {action.impact_amount && (
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-xs text-zinc-500">Impact</p>
                      <p className="text-sm font-semibold text-white">{formatCurrency(action.impact_amount)}</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <CalendarDays size={12} />
                    {action.due_date ? formatDate(action.due_date) : 'No fixed due date'}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-full sm:w-auto text-xs border-zinc-700 hover:border-zinc-500"
                    icon={<ArrowRight size={13} />}
                    iconPosition="right"
                    onClick={() => onAction?.(action)}
                  >
                    {action.action_label}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
