import { useEffect, useState } from 'react';
import { healthService } from '../services/health.js';

export default function HealthScoreGauge() {
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchHealthScore();
  }, []);

  const fetchHealthScore = async () => {
    try {
      const payload = await healthService.getScore();
      setScoreData(payload);
    } catch (error) {
      console.error('Failed to fetch health score:', error);
      setScoreData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-1/3 mb-4" />
          <div className="h-32 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!scoreData) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Financial Health Score</h3>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-6xl mb-4">-</div>
          <p className="text-zinc-300 text-center mb-2">Start tracking your finances</p>
          <p className="text-zinc-500 text-sm text-center">
            Add income, expenses, and bills to generate your health score.
          </p>
        </div>
      </div>
    );
  }

  const { score, grade, message, savings_score, budget_adherence_score, bill_punctuality_score } = scoreData;

  if (score === 0 && grade === '-') {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Financial Health Score</h3>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48">
              <circle
                cx="96"
                cy="96"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-zinc-800"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-zinc-500">-</span>
            </div>
          </div>
          <p className="text-center text-zinc-400 mt-4 font-medium">{message}</p>
          <p className="text-zinc-500 text-sm text-center mt-2">
            Record your first transaction to begin.
          </p>
        </div>
      </div>
    );
  }

  const getScoreColor = (value) => {
    if (value >= 90) return { text: 'text-emerald-400', ring: 'stroke-emerald-500' };
    if (value >= 80) return { text: 'text-blue-400', ring: 'stroke-blue-500' };
    if (value >= 70) return { text: 'text-amber-400', ring: 'stroke-amber-500' };
    if (value >= 60) return { text: 'text-orange-400', ring: 'stroke-orange-500' };
    return { text: 'text-rose-400', ring: 'stroke-rose-500' };
  };

  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Financial Health Score</h3>

      <div className="flex flex-col items-center mb-6">
        <div className="relative w-48 h-48">
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-zinc-800"
            />
            <circle
              cx="96"
              cy="96"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`${colors.ring} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-bold ${colors.text}`}>{score}</span>
            <span className={`text-2xl font-semibold ${colors.text}`}>{grade}</span>
          </div>
        </div>

        <p className="text-center text-zinc-300 mt-4 font-medium">{message}</p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-zinc-400">Savings Rate</span>
            <span className="font-medium text-zinc-200">{savings_score}/35</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(savings_score / 35) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-zinc-400">Budget Adherence</span>
            <span className="font-medium text-zinc-200">{budget_adherence_score}/35</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(budget_adherence_score / 35) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-zinc-400">Bill Punctuality</span>
            <span className="font-medium text-zinc-200">{bill_punctuality_score}/30</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div
              className="bg-violet-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(bill_punctuality_score / 30) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => void fetchHealthScore()}
        className="mt-4 w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors duration-200 text-sm font-medium"
      >
        Refresh Score
      </button>
    </div>
  );
}

