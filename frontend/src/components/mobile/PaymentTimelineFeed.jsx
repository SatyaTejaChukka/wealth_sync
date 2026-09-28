import React, { useState } from 'react';
import { CheckCircle2, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function PaymentTimelineFeed({
  items = [],
  type = 'loan', // 'loan' or 'lent'
  paidMonthsCount = 0,
  initialVisible = 12
}) {
  const [showAll, setShowAll] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl border border-white/5 bg-white/[0.02] text-zinc-500 text-xs">
        No payment records found.
      </div>
    );
  }

  const visibleItems = showAll ? items : items.slice(0, initialVisible);

  if (type === 'loan') {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-500">
            Payment Schedule ({items.length} Months)
          </span>
          <span className="text-[11px] text-violet-400 font-medium">
            {paidMonthsCount} of {items.length} Paid
          </span>
        </div>

        <div className="space-y-2.5">
          {visibleItems.map((row) => {
            const isPaid = row.month <= paidMonthsCount;
            const isCurrent = row.month === paidMonthsCount + 1;

            return (
              <div
                key={row.month}
                className={cn(
                  "p-3 rounded-xl border transition-all text-xs flex flex-col gap-2",
                  isPaid
                    ? "bg-emerald-500/[0.03] border-emerald-500/20 text-zinc-300"
                    : isCurrent
                    ? "bg-violet-500/[0.07] border-violet-500/40 text-white ring-1 ring-violet-500/30"
                    : "bg-white/[0.02] border-white/5 text-zinc-400"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 size={13} />
                        Month {row.month}
                      </span>
                    ) : isCurrent ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-violet-300">
                        <Clock size={13} className="animate-pulse" />
                        Month {row.month} (Next Due)
                      </span>
                    ) : (
                      <span className="font-semibold text-zinc-400 text-[11px]">
                        Month {row.month}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-zinc-500 text-[11px]">Remaining: </span>
                    <span className="font-bold text-white text-xs">
                      ₹{Math.round(parseFloat(row.remaining_principal)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5 text-[11px]">
                  <div>
                    <span className="text-zinc-500">Principal: </span>
                    <span className="font-semibold text-zinc-300">
                      ₹{Math.round(parseFloat(row.principal_paid)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500">Interest: </span>
                    <span className="font-semibold text-zinc-400">
                      ₹{Math.round(parseFloat(row.interest_paid)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > initialVisible && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2.5 mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition-all"
          >
            {showAll ? (
              <>
                Show Less <ChevronUp size={14} />
              </>
            ) : (
              <>
                Show All {items.length} Installments <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Type === 'lent' (Repayments History)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-500">
          Repayment Timeline ({items.length})
        </span>
      </div>

      <div className="space-y-2.5">
        {visibleItems.map((rep, idx) => (
          <div
            key={rep.id || idx}
            className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] flex items-center justify-between text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                <Calendar size={12} className="text-emerald-400" />
                <span>{new Date(rep.repaid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <p className="text-zinc-300 font-medium text-xs">
                {rep.notes ? rep.notes : 'Partial Repayment'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Received</span>
              <span className="text-sm font-bold text-emerald-400">
                +₹{parseFloat(rep.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
