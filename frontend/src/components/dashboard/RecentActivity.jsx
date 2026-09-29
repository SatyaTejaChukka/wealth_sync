import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { MoneyValue } from '../ui/MoneyValue.jsx';

export function RecentActivity({ transactions = [], maxItems }) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const visibleTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) {
      return [];
    }
    if (typeof maxItems === 'number') {
      return transactions.slice(0, maxItems);
    }
    return transactions;
  }, [maxItems, transactions]);

  const maxMagnitude = useMemo(() => {
    if (!visibleTransactions.length) {
      return 1;
    }
    return Math.max(...visibleTransactions.map((item) => Math.abs(Number(item.amount || 0))), 1);
  }, [visibleTransactions]);

  return (
    <Card className="col-span-1 h-full bg-zinc-900/40 border-white/5 card-specular">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className={cn(isMobile ? 'p-3 pt-0' : 'max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar')}>
        {visibleTransactions.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-6">No recent activity</p>
        ) : (
          <div className="segmented-deck divide-y divide-white/[0.04] overflow-hidden">
            {visibleTransactions.map((t) => {
              const momentum = Math.max(
                6,
                Math.min(100, (Math.abs(Number(t.amount || 0)) / maxMagnitude) * 100)
              );
              const isIncome = t.type === 'income';

              return (
                <div
                  key={t.id}
                  className="relative flex items-center justify-between group cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.06] p-3 sm:p-3.5 transition-colors"
                >
                  <div className="transaction-momentum-track">
                    <div
                      className={cn(
                        'transaction-momentum-fill',
                        isIncome ? 'from-emerald-400/25 to-emerald-300/5' : 'from-rose-400/25 to-rose-300/5'
                      )}
                      style={{ width: `${momentum}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                      isIncome 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/20"
                    )}>
                      {isIncome ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        {t.category ? `${t.category} • ` : ''}{t.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-baseline justify-end">
                    <span className={cn(
                      "text-xs font-bold mr-0.5 select-none",
                      isIncome ? "text-emerald-400" : "text-zinc-400"
                    )}>
                      {isIncome ? '+' : '-'}
                    </span>
                    <MoneyValue
                      value={Math.abs(t.amount)}
                      className={cn(
                        "text-xs sm:text-sm font-bold font-display tabular-nums",
                        isIncome ? "text-emerald-400" : "text-white"
                      )}
                      symbolClassName={cn(
                        "text-[0.65em] font-medium mr-0.5 select-none",
                        isIncome ? "text-emerald-400/70" : "text-white/40"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

