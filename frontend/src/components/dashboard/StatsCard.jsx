import React from 'react';
import { Card, CardContent } from '../ui/Card.jsx';
import { cn } from '../../lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { splitCurrency } from '../../lib/format';


export function StatsCard({ title, value, trend, trendValue, icon, color = "violet" }) {
  const colors = {
    violet: "from-violet-600 to-indigo-600 shadow-violet-500/20",
    emerald: "from-emerald-500 to-teal-500 shadow-emerald-500/20",
    rose: "from-rose-500 to-pink-500 shadow-rose-500/20",
    amber: "from-amber-500 to-orange-500 shadow-amber-500/20",
    blue: "from-blue-500 to-cyan-500 shadow-blue-500/20",
  };
  
  const { symbol, amount } = splitCurrency(value);



  return (
    <Card className="hover:scale-[1.02] transition-all duration-300 border-white/5 bg-zinc-900/30 backdrop-blur-xl">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500">{title}</p>
          <div className={cn(
            "p-1.5 rounded-[10px] bg-linear-to-br shadow-lg flex items-center justify-center shrink-0 border border-white/5",
            colors[color]
          )}>
            {icon ? React.createElement(icon, { size: 14, className: "text-white/90" }) : null}
          </div>
        </div>

        <h3 className="text-[1.4rem] sm:text-2xl xl:text-3xl font-extrabold text-white tracking-tight leading-none font-display whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="text-[0.6em] font-medium text-white/30 mr-1 select-none">{symbol}</span>
          {amount}
        </h3>


        
        {trendValue && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-[6px] border",
              trend === 'up' && color !== 'rose' || trend === 'down' && color === 'rose'
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                : "text-rose-400 bg-rose-500/10 border-rose-500/20"
            )}>
              {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              <span>{trendValue}</span>
            </div>
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>

  );
}
