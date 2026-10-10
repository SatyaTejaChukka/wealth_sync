import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { formatCurrency } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

export function SpendingChart({ data = [], range = 'week', onRangeChange }) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const normalizedData = (Array.isArray(data) ? data : []).map((item, index) => ({
    name: item?.name ?? item?.label ?? item?.date ?? `Point ${index + 1}`,
    amount: Number(item?.amount ?? item?.value ?? 0),
  }));

  const hasPlottableData = normalizedData.some((item) => Number.isFinite(item.amount));
  const chartHeight = isMobile ? 210 : isTablet ? 260 : 300;
  const tickFontSize = isMobile ? 10 : 11;

  // Format tick labels cleanly: on month view, avoid repeating month name and colliding 30 days
  const formatXAxisTick = (val) => {
    if (range === 'week') return val;
    if (typeof val === 'string') {
      const parts = val.trim().split(' ');
      if (parts.length === 2) {
        const dayNum = parseInt(parts[1], 10);
        if (dayNum === 1) return isMobile ? `${parts[0]} 1` : `${parts[0]} 1`;
        return `${dayNum}`;
      }
    }
    return val;
  };

  return (
    <Card className="relative z-0 isolate flex h-full min-h-[300px] flex-col border-white/5 bg-zinc-900/40 md:min-h-[340px] xl:min-h-[380px] card-specular">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 pb-2 pt-4 px-4 sm:p-6 sm:pb-3">
        <div>
          <CardTitle className="text-base sm:text-lg font-bold text-white">Spending Overview</CardTitle>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
            {range === 'week' ? 'Past 7 days trajectory' : 'Monthly expense distribution'}
          </p>
        </div>
        
        {/* Sleek Segmented Control */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-black/40 border border-white/[0.08] shadow-inner shrink-0">
          <button
            type="button"
            onClick={() => onRangeChange?.('week')}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200",
              range === 'week'
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/40"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onRangeChange?.('month')}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-200",
              range === 'month'
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/40"
                : "text-zinc-400 hover:text-white"
            )}
          >
            Month
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-2 sm:px-6 pb-4">
        <div className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            {hasPlottableData ? (
              <AreaChart
                data={normalizedData}
                margin={{
                  top: 10,
                  right: isMobile ? 8 : 16,
                  left: isMobile ? -14 : 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" strokeOpacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  interval={range === 'week' ? 0 : (isMobile ? 5 : 2)}
                  minTickGap={isMobile ? 24 : 16}
                  tickFormatter={formatXAxisTick}
                  tick={{ fill: '#71717a', fontSize: tickFontSize }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  width={isMobile ? 38 : 52}
                  tick={{ fill: '#71717a', fontSize: tickFontSize }} 
                  tickFormatter={(value) => formatCurrency(value, { compact: true })}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.7)',
                    padding: '8px 12px',
                  }}
                  itemStyle={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}
                  formatter={(value) => [formatCurrency(value), 'Spend']}
                  labelStyle={{ color: '#a1a1aa', fontSize: '11px', marginBottom: '2px', fontWeight: 500 }}
                  cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fill="url(#colorAmount)" 
                  animationDuration={800}
                />
              </AreaChart>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-zinc-500">
                No spending data to plot yet.
              </div>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
