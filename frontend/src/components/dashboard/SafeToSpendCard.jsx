import React from 'react';
import { formatCurrency, splitCurrency } from '../../lib/format';

import { ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export const SafeToSpendCard = ({ stats }) => {
  if (!stats) return null;

  const { safe_to_spend, total_income, monthly_free_budget } = stats;
  const referenceBudget = monthly_free_budget > 0 ? monthly_free_budget : total_income;
  const percentage = referenceBudget > 0 ? (safe_to_spend / referenceBudget) * 100 : 0;
  
  let statusColor = "bg-emerald-500";
  let statusText = "Protected runway intact";
  
  if (percentage < 20) {
    statusColor = "bg-rose-500";
    statusText = "Runway almost used";
  } else if (percentage < 40) {
    statusColor = "bg-amber-500";
    statusText = "Free money getting tight";
  }

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 ${statusColor} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-zinc-400 font-bold uppercase tracking-wider text-[11px] sm:text-xs">Stress-Free Balance</h3>
              <p className="text-[12px] text-zinc-500 font-medium mt-1 leading-snug sm:text-sm">
                Money left after all commitments
              </p>
            </div>
            <div className={cn("p-1.5 rounded-xl border ml-3", percentage < 20 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400')}>
               <ShieldCheck size={16} />
            </div>
          </div>
          
          <div className="mt-2">
             <span className="text-[2rem] sm:text-[2.8rem] font-extrabold text-white tracking-tight leading-none font-display">
                {(() => {
                  const { symbol, amount } = splitCurrency(formatCurrency(safe_to_spend));
                  return (
                    <>
                      <span className="text-[0.55em] font-medium text-white/30 mr-1 select-none">{symbol}</span>
                      {amount}
                    </>
                  );
                })()}
             </span>


          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
             <div 
               className={`h-full ${statusColor} transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
               style={{ width: `${Math.min(percentage, 100)}%` }}
             />
          </div>
          
          <div className="flex items-center justify-between text-[11px] font-bold tracking-tight sm:text-xs">
             <span className="text-zinc-500">{Math.round(percentage)}% AVAILABLE</span>
             <span className={percentage < 20 ? 'text-rose-400' : 'text-emerald-400'}>{statusText.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
