import React, { useEffect, useState } from 'react';
import { SpendingChart } from '../../components/dashboard/SpendingChart.jsx';
import { SalaryRuleEnginePanel } from '../../components/dashboard/SalaryRuleEnginePanel.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardService } from '../../services/dashboard.js';

export default function Analytics() {
  const [data, setData] = useState({ spending_chart: [], category_chart: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [chartRange, setChartRange] = useState('week');

  useEffect(() => {
     const fetchData = async () => {
         try {
             setIsLoading(true);
             const res = await dashboardService.getSummary(chartRange);
             setData(res);
         } catch (e) {
             console.error("Failed to fetch analytics", e);
         } finally {
             setIsLoading(false);
         }
     };
     fetchData();
  }, [chartRange]);

  // ... (loading state) ...

  // ... (return) ...
  


  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[50vh]">
             <div className="flex items-center gap-3 text-zinc-400">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
                <span className="text-sm font-medium">Loading Analytics...</span>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-slide-up">
       <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-zinc-400 mt-1">Deep dive into your financial habits with real-time data.</p>
      </div>

      <div className="grid gap-6">
        <SpendingChart 
            data={data.spending_chart} 
            range={chartRange}
            onRangeChange={setChartRange}
        />

        <SalaryRuleEnginePanel engine={data.safe_to_spend_stats?.salary_rule_engine} />

        <Card className="h-[350px] sm:h-[400px] bg-zinc-900/40 border-white/5">
            <CardHeader>
                <CardTitle>Spending by Category (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[240px] sm:h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={data.category_chart}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#71717a' }} 
                                tickFormatter={(val) => val === 'Uncategorized' ? 'Other' : val}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} />
                            <Tooltip 
                                cursor={{ fill: '#27272a' }}
                                contentStyle={{ 
                                  backgroundColor: '#18181b', 
                                  border: '1px solid #27272a',
                                  borderRadius: '12px'
                                }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    {data.category_chart.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
                            No expenses recorded this month.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
