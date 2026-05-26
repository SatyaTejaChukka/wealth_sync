import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDailySafeToSpend } from '../../hooks/useDailySafeToSpend.js';
import { useDeviceShake } from '../../hooks/useDeviceShake.js';
import { useFinanceFeedback } from '../../hooks/useFinanceFeedback.js';
import { formatCurrency, splitCurrency } from '../../lib/format.js';
import {
  calculateMiniOrbScale,
  calculateOrbSize,
  calculateSafeBudgetSignal,
  clampNumber,
} from '../../lib/safeBudgetSignal.js';
import { cn } from '../../lib/utils.js';
import { Card } from '../ui/Card.jsx';
import { Modal } from '../ui/Modal.jsx';
import { OrbGlow } from './OrbGlow.jsx';

const SWIPE_THRESHOLD = 36;

const ORB_COLORS = {
  carefree: {
    glow: '#10b981',
    gradient: 'linear-gradient(145deg, rgba(16,185,129,0.22), rgba(16,185,129,0.08))',
    ring: 'ring-emerald-400/35',
    status: 'Spend freely - you are ahead.',
  },
  mindful: {
    glow: '#f59e0b',
    gradient: 'linear-gradient(145deg, rgba(245,158,11,0.24), rgba(245,158,11,0.08))',
    ring: 'ring-amber-400/35',
    status: 'Stay mindful and keep pace.',
  },
  careful: {
    glow: '#ef4444',
    gradient: 'linear-gradient(145deg, rgba(239,68,68,0.2), rgba(239,68,68,0.07))',
    ring: 'ring-rose-400/35',
    status: 'Ease spending and protect runway.',
  },
};

const ORBIT_POSITIONS = [
  { left: '16%', top: '22%' },
  { left: '83%', top: '20%' },
  { left: '22%', top: '78%' },
];

export function SafeToSpendOrb() {
  const { data, loading, error, refetch } = useDailySafeToSpend();
  const { feedback } = useFinanceFeedback();
  const [viewMode, setViewMode] = useState('daily');
  const [displayAmount, setDisplayAmount] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartYRef = useRef(null);

  const breakdown = data?.breakdown || {};
  const safeSignal = useMemo(() => calculateSafeBudgetSignal(data || {}), [data]);
  const orbState = safeSignal.orbState || data?.color_state || 'mindful';
  const colorConfig = ORB_COLORS[orbState] || ORB_COLORS.mindful;

  const percentage = safeSignal.runwayPercentage;
  const maxOrbSize = isMobile ? 140 : 200;
  const orbSize = calculateOrbSize(safeSignal.score, { min: 120, max: maxOrbSize });

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const primaryAmount = useMemo(() => {
    if (!data) {
      return 0;
    }
    return viewMode === 'monthly' ? Number(data.monthly_safe_total || 0) : Number(data.daily_limit || 0);
  }, [data, viewMode]);

  const miniOrbs = useMemo(() => {
    const committed = Number(breakdown.monthly_committed || 0);
    const spent = Number(breakdown.spent_this_month || 0);
    const free = Number(breakdown.remaining_budget || data?.monthly_safe_total || 0);
    const totalValue = Math.max(0, committed) + Math.max(0, spent) + Math.max(0, free);
    const reference = Number(safeSignal.values.monthlySafeTotal || data?.monthly_safe_total || 0);

    return [
      {
        id: 'committed',
        label: 'Committed',
        value: committed,
        tone: 'bg-blue-400/20 border-blue-300/40 text-blue-200',
        dot: 'bg-blue-300',
      },
      {
        id: 'spent',
        label: 'Spent',
        value: spent,
        tone: 'bg-amber-400/20 border-amber-300/40 text-amber-200',
        dot: 'bg-amber-300',
      },
      {
        id: 'free',
        label: 'Free',
        value: free,
        tone: 'bg-emerald-400/20 border-emerald-300/40 text-emerald-200',
        dot: 'bg-emerald-300',
      },
    ].map((item, index) => ({
      ...item,
      index,
      sizeScale: calculateMiniOrbScale(item.value, {
        total: totalValue,
        reference,
        min: 0.74,
        max: 1.16,
      }),
    }));
  }, [
    breakdown.monthly_committed,
    breakdown.remaining_budget,
    breakdown.spent_this_month,
    data?.monthly_safe_total,
    safeSignal.values.monthlySafeTotal,
  ]);

  useEffect(() => {
    let animationFrame;
    const duration = 450;
    const start = performance.now();
    const from = displayAmount;
    const delta = primaryAmount - from;

    const animate = (timestamp) => {
      const progress = clampNumber((timestamp - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(from + delta * eased);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryAmount]);

  const handleShake = useCallback(() => {
    setIsShaking(true);
    setRippleKey((prev) => prev + 1);
    feedback('refresh');
    refetch().catch(() => undefined);
    window.setTimeout(() => setIsShaking(false), 500);
  }, [feedback, refetch]);

  useDeviceShake(handleShake, { threshold: 15, cooldownMs: 1200 });

  const onTouchStart = (event) => {
    touchStartYRef.current = event.touches?.[0]?.clientY ?? null;
  };

  const onTouchEnd = (event) => {
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (startY == null) {
      return;
    }
    const endY = event.changedTouches?.[0]?.clientY ?? startY;
    const deltaY = endY - startY;

    if (deltaY <= -SWIPE_THRESHOLD) {
      setViewMode('daily');
      feedback('scrub');
    } else if (deltaY >= SWIPE_THRESHOLD) {
      setViewMode('monthly');
      feedback('scrub');
    }
  };

  const statusText = useMemo(() => {
    if (safeSignal.ratios.dailySpend > 1.1) {
      return 'Today is running hot. Slow spending to protect your runway.';
    }
    if (safeSignal.ratios.pacing >= 1.1 && safeSignal.score >= 0.67) {
      return 'You are ahead of pace. Spend with confidence.';
    }
    return data?.status_message || colorConfig.status;
  }, [colorConfig.status, data?.status_message, safeSignal.ratios.dailySpend, safeSignal.ratios.pacing, safeSignal.score]);

  if (loading && !data) {
    return (
      <Card className="bg-zinc-900/40 border-white/5 min-h-90 sm:min-h-105 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-emerald-400 animate-spin" />
          <p className="text-zinc-400 text-sm">Preparing your safe-to-spend orb...</p>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-zinc-900/40 border-white/5 min-h-90 sm:min-h-105 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-sm mb-3">Could not load safe-to-spend data.</p>
          <button
            type="button"
            onClick={() => refetch().catch(() => undefined)}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-colors"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-zinc-900/40 border-white/5 min-h-90 sm:min-h-105 overflow-hidden">
        <div className="p-4 sm:p-6 h-full flex flex-col items-center justify-between gap-4">
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
            <span>Safe-to-Spend Orb</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('daily');
                  feedback('tap');
                }}
                className={cn(
                  'px-2.5 py-1 rounded-md border transition-colors',
                  viewMode === 'daily' ? 'border-white/20 text-white bg-white/10' : 'border-white/10 hover:bg-white/5'
                )}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('monthly');
                  feedback('tap');
                }}
                className={cn(
                  'px-2.5 py-1 rounded-md border transition-colors',
                  viewMode === 'monthly' ? 'border-white/20 text-white bg-white/10' : 'border-white/10 hover:bg-white/5'
                )}
              >
                Monthly
              </button>
            </div>
          </div>

          <div
            className="relative flex items-center justify-center select-none"
            style={{ width: orbSize + 72, height: orbSize + 72 }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <OrbGlow
              size={orbSize}
              glowColor={colorConfig.glow}
              rippleKey={rippleKey}
              state={orbState}
            />

            {miniOrbs.map((miniOrb, idx) => {
              const position = ORBIT_POSITIONS[idx];
              const bubbleSize = clampNumber(42 * miniOrb.sizeScale, 34, 58);
              return (
                <button
                  key={miniOrb.id}
                  type="button"
                  onClick={() => {
                    setDetailsOpen(true);
                    feedback('tap');
                  }}
                  title={`${miniOrb.label}: ${formatCurrency(miniOrb.value)}`}
                  className={cn(
                    'absolute rounded-full border backdrop-blur-lg transition-transform duration-300',
                    'animate-mini-orb-float hover:scale-110 focus:scale-110',
                    miniOrb.tone
                  )}
                  style={{
                    left: position.left,
                    top: position.top,
                    width: bubbleSize,
                    height: bubbleSize,
                    animationDelay: `${miniOrb.index * 0.5}s`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  aria-label={`${miniOrb.label}: ${formatCurrency(miniOrb.value)}`}
                >
                  <span className="sr-only">{miniOrb.label}</span>
                  <span className={cn('mx-auto block h-2 w-2 rounded-full', miniOrb.dot)} />
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setDetailsOpen(true);
                feedback('tap');
              }}
              className={cn(
                'relative rounded-full border border-white/20 backdrop-blur-2xl',
                'flex flex-col items-center justify-center text-center px-4 transition-transform duration-300',
                'ring-2 hover:scale-[1.02] active:scale-[0.98] will-change-transform',
                colorConfig.ring,
                'animate-orb-pulse',
                isShaking && 'animate-orb-shake'
              )}
              style={{
                width: orbSize,
                height: orbSize,
                background: colorConfig.gradient,
                boxShadow: `0 0 60px ${colorConfig.glow}66`,
              }}
              role="status"
              aria-live="polite"
              aria-label={`Safe to spend ${viewMode}: ${formatCurrency(primaryAmount)}. ${statusText}`}
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">{viewMode === 'daily' ? 'Today' : 'This month'}</p>
              <p className="text-4xl leading-none font-bold text-white mt-2 tabular-nums">
                {(() => {
                  const { symbol, amount } = splitCurrency(formatCurrency(displayAmount).replace('.00', ''));
                  return (
                    <>
                      <span className="text-[0.55em] font-medium text-white/30 mr-0.5 select-none">{symbol}</span>
                      {amount}
                    </>
                  );
                })()}
              </p>

              <p className="mt-2 text-[10px] text-zinc-300">Tap for details</p>
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: colorConfig.glow }}>
              {statusText}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{Math.round(percentage)}% of safe budget remains</p>
            <p className="text-[11px] text-zinc-500 mt-1">Swipe up for daily view, swipe down for monthly view.</p>
          </div>
        </div>
      </Card>

      <Modal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} title="Safe-to-Spend Details">
        <div className="space-y-3">
          <DetailRow label="Daily limit" value={data.daily_limit} />
          <DetailRow label="Monthly safe total" value={data.monthly_safe_total} />
          <DetailRow label="Days left in month" value={data.days_left_in_month} raw />
          <DetailRow label="Income today" value={breakdown.income_today} />
          <DetailRow label="Committed today" value={breakdown.committed_today} />
          <DetailRow label="Spent today" value={breakdown.spent_today} />
          <DetailRow label="Remaining today" value={breakdown.remaining_today} />
          <DetailRow label="Spent this month" value={breakdown.spent_this_month} />
          <DetailRow label="Remaining budget" value={breakdown.remaining_budget} />
        </div>
      </Modal>
    </>
  );
}

function DetailRow({ label, value, raw = false }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white tabular-nums">
        {raw ? String(value ?? 0) : formatCurrency(Number(value || 0))}
      </span>
    </div>
  );
}

