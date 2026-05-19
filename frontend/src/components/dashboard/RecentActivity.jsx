import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { formatCurrency } from '../../lib/format.js';

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
    <Card className="col-span-1 h-full bg-zinc-900/40 border-white/5">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className={cn(isMobile ? 'p-4 pt-0' : 'max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar')}>
        <div className={cn(isMobile ? 'space-y-3' : 'space-y-6')}>
          {visibleTransactions.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">No recent activity</p>
          ) : (
            visibleTransactions.map((t) => {
              const momentum = Math.max(
                6,
                Math.min(100, (Math.abs(Number(t.amount || 0)) / maxMagnitude) * 100)
              );
              return (
                <div key={t.id} className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2">
                <div className="transaction-momentum-track">
                  <div
                    className={cn(
                      'transaction-momentum-fill',
                      t.type === 'income' ? 'from-emerald-400/30 to-emerald-300/5' : 'from-rose-400/30 to-rose-300/5'
                    )}
                    style={{ width: `${momentum}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    t.type === 'income' 
                        ? "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20"
                    )}>
                    {t.type === 'income' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                    {!isMobile ? <p className="text-xs text-zinc-500">{t.date}</p> : null}
                    </div>
                </div>
                  <div className="text-left sm:text-right pl-12 sm:pl-0">
                    <p className={cn(
                    "text-sm font-bold",
                    t.type === 'income' ? "text-emerald-400" : "text-white"
                    )}>
                    {t.type === 'income' ? '+' : ''}{formatCurrency(Math.abs(t.amount))}
                    </p>
                    {!isMobile ? <p className="text-xs text-zinc-500 truncate">{t.category}</p> : null}
                </div>
                </div>
                );
              })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
