import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function FinancialHealthScore({ score = 0, message, color }) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score || 0)));

  // Fallback logic if props aren't provided (for safety)
  let displayColor = color;
  if (!displayColor) {
     if (normalizedScore >= 80) displayColor = '#10b981';
     else if (normalizedScore >= 60) displayColor = '#3b82f6';
     else if (normalizedScore >= 40) displayColor = '#eab308';
     else displayColor = '#ef4444'; 
  }

  // Simple data for the gauge
  const data = [
    { name: 'Score', value: normalizedScore },
    { name: 'Remaining', value: 100 - normalizedScore },
  ];

  return (
    <Card className="h-full bg-zinc-900/40 border-white/5">
      <CardHeader>
        <CardTitle>Financial Health</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center relative">
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="70%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
                stroke="none"
              >
                <Cell key="cell-0" fill={displayColor} />
                <Cell key="cell-1" fill="#27272a" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[20%] text-center">
            <span className="text-2xl sm:text-3xl font-black text-white block font-display tracking-tight tabular-nums">{normalizedScore}</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">OUT OF 100</span>
        </div>

        <div className="text-center mt-[-20px] pb-4 px-4">
             <p className="text-zinc-300 text-sm">
                {message || 'No health score data yet.'}
             </p>
        </div>
      </CardContent>
    </Card>
  );
}
