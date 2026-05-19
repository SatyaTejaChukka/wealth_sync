import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select } from '../ui/Select.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { formatCurrency } from '../../lib/format.js';

export function SpendingChart({ data = [], range, onRangeChange }) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const normalizedData = (Array.isArray(data) ? data : []).map((item, index) => ({
    name: item?.name ?? item?.label ?? item?.date ?? `Point ${index + 1}`,
    amount: Number(item?.amount ?? item?.value ?? 0),
  }));

  const hasPlottableData = normalizedData.some((item) => Number.isFinite(item.amount));
  const chartHeight = isMobile ? 220 : isTablet ? 280 : 320;
  const tickFontSize = isMobile ? 10 : 12;

  return (
    <Card className="relative z-0 isolate flex h-full min-h-[320px] flex-col border-white/5 bg-zinc-900/40 md:min-h-[360px] xl:min-h-[420px]">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 pb-2">
        <CardTitle>Spending Overview</CardTitle>
        <div className="w-28 sm:w-32">
            <Select 
                size="sm"
                options={[{ value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }]} 
                value={range} 
                onChange={onRangeChange} 
            />
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            {hasPlottableData ? (
              <AreaChart
                data={normalizedData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  interval={0}
                  minTickGap={isMobile ? 22 : 12}
                  tick={{ fill: '#71717a', fontSize: tickFontSize }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  width={isMobile ? 42 : 56}
                  tick={{ fill: '#71717a', fontSize: tickFontSize }} 
                  tickFormatter={(value) => formatCurrency(value, { compact: true })}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    border: '1px solid #27272a',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value) => [formatCurrency(value), isMobile ? 'Spend' : 'Amount']}
                  labelStyle={{ color: '#d4d4d8', fontSize: isMobile ? 11 : 12 }}
                  cursor={{ stroke: '#52525b', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fill="url(#colorAmount)" 
                  animationDuration={1200}
                />
              </AreaChart>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-zinc-500">
                No spending data to plot yet.
              </div>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
