import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  FileText,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Telescope,
  Wallet,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card.jsx';
import { useTimelineEvents } from '../../hooks/useTimelineEvents.js';
import { useFinanceFeedback } from '../../hooks/useFinanceFeedback.js';
import { useToast } from '../ui/Toast.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { formatCurrency } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { autopilotService } from '../../services/autopilot.js';

const FAR_FUTURE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const CONFIDENCE_STYLES = {
  high: {
    label: 'High confidence',
    badge: 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300',
    halo: 'shadow-[0_0_36px_rgba(16,185,129,0.25)]',
  },
  medium: {
    label: 'Medium confidence',
    badge: 'bg-amber-500/15 border-amber-400/35 text-amber-300',
    halo: 'shadow-[0_0_30px_rgba(245,158,11,0.23)]',
  },
  low: {
    label: 'Low confidence',
    badge: 'bg-rose-500/15 border-rose-400/35 text-rose-300',
    halo: 'shadow-[0_0_26px_rgba(244,63,94,0.22)]',
  },
};

function getErrorMessage(error, fallback = 'Unable to load timeline right now.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail === 'object' && typeof detail.message === 'string' && detail.message.trim()) {
    return detail.message;
  }
  const message = error?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function groupEventsByDate(events) {
  const grouped = {};
  for (const event of events || []) {
    if (!grouped[event.date]) {
      grouped[event.date] = [];
    }
    grouped[event.date].push(event);
  }
  return grouped;
}

function formatTimelineDate(date) {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  return formatter.format(new Date(`${date}T00:00:00`));
}

function resolveConfidence(details) {
  const key = String(details?.confidence || 'medium').toLowerCase();
  if (CONFIDENCE_STYLES[key]) {
    return key;
  }
  return 'medium';
}

function getReplayNetDelta(eventsByDate, date) {
  const dateEvents = eventsByDate[date] || [];
  return dateEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(startDate, endDate) {
  const dates = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function TimelineView() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [daysPast, setDaysPast] = useState(7);
  const [daysFuture, setDaysFuture] = useState(30);
  const [replayIndexOverride, setReplayIndexOverride] = useState(null);
  const [approvingOrderIds, setApprovingOrderIds] = useState({});
  const { feedback } = useFinanceFeedback();
  const toast = useToast();

  useEffect(() => {
    if (isMobile) {
      setDaysPast((prev) => Math.min(prev, 7));
      setDaysFuture((prev) => (prev > 30 ? 30 : prev));
    }
  }, [isMobile]);

  const { data, loading, error, refetch } = useTimelineEvents(daysPast, daysFuture);

  const groupedEvents = useMemo(() => groupEventsByDate(data?.events), [data?.events]);
  const todayDate = useMemo(
    () => new Date(`${data?.today || new Date().toISOString().slice(0, 10)}T00:00:00`),
    [data?.today]
  );

  const timelineDates = useMemo(() => {
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - daysPast);

    const endDate = new Date(todayDate);
    endDate.setDate(endDate.getDate() + daysFuture);

    return buildDateRange(startDate, endDate);
  }, [daysFuture, daysPast, todayDate]);

  const replayIndex = useMemo(() => {
    if (!timelineDates.length) {
      return 0;
    }
    if (replayIndexOverride == null) {
      const todayIdx = timelineDates.indexOf(data?.today);
      return todayIdx >= 0 ? todayIdx : timelineDates.length - 1;
    }
    return clamp(replayIndexOverride, 0, timelineDates.length - 1);
  }, [data?.today, replayIndexOverride, timelineDates]);

  const replayDate = timelineDates.length ? timelineDates[replayIndex] : null;
  const replayNetDelta = replayDate ? getReplayNetDelta(groupedEvents, replayDate) : 0;

  const handleApproveOrder = async (paymentOrderId, eventTitle) => {
    if (!paymentOrderId || approvingOrderIds[paymentOrderId]) {
      return;
    }
    setApprovingOrderIds((prev) => ({ ...prev, [paymentOrderId]: true }));
    feedback('approve');
    try {
      await autopilotService.approvePayment(paymentOrderId, true);
      toast.success(`${eventTitle} approved and payment execution started.`, 'Payment Approval');
      await refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to approve payment right now.'), 'Approval Failed');
    } finally {
      setApprovingOrderIds((prev) => {
        const next = { ...prev };
        delete next[paymentOrderId];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="p-8 flex items-center justify-center min-h-100">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-violet-600 animate-spin" />
            <p className="text-zinc-400 text-sm">Loading your financial timeline...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-zinc-900/40 border-white/5">
        <CardContent className="p-8 flex items-center justify-center min-h-100">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <div className="rounded-full border border-rose-400/20 bg-rose-500/10 p-3 text-rose-300">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-100">Unable to load timeline</p>
              <p className="text-sm text-zinc-400">{getErrorMessage(error)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                feedback('tap');
                refetch();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 transition-colors hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" />
              Retry timeline
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="bg-zinc-900/40 border-white/5">
      <CardHeader>
        <CardTitle>Financial Timeline</CardTitle>
        <p className="text-sm text-zinc-400">Your money calendar - past, present, and future</p>
        {data.summary?.next_salary_date ? (
          <p className="text-xs text-violet-400 mt-2">
            Next salary in {data.summary.days_until_salary} day(s) - {formatCurrency(data.summary.upcoming_commitments)} upcoming commitments
          </p>
        ) : null}
      </CardHeader>

      <CardContent>
        <div className="mb-5 rounded-xl border border-white/10 bg-black/25 p-3.5 backdrop-blur-xl md:mb-6 md:p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Time-Scrub Money Replay</p>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setDaysPast(7);
                    setDaysFuture(30);
                    setReplayIndexOverride(null);
                    feedback('tap');
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-xs transition-colors',
                    daysFuture === 30 ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-zinc-300 hover:bg-white/5'
                  )}
                >
                  30D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDaysPast(14);
                    setDaysFuture(60);
                    setReplayIndexOverride(null);
                    feedback('tap');
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-xs transition-colors',
                    daysFuture === 60 ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-zinc-300 hover:bg-white/5'
                  )}
                >
                  60D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDaysPast(30);
                    setDaysFuture(90);
                    setReplayIndexOverride(null);
                    feedback('tap');
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-xs transition-colors',
                    daysFuture === 90 ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 text-zinc-300 hover:bg-white/5'
                  )}
                >
                  90D
                </button>
              </div>
            </div>

            {timelineDates.length > 0 ? (
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, timelineDates.length - 1)}
                  value={replayIndex}
                  onChange={(event) => {
                    setReplayIndexOverride(Number(event.target.value));
                    feedback('scrub');
                  }}
                  className="w-full accent-violet-500"
                />
                <div className="flex flex-col gap-1 text-[11px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>{formatTimelineDate(timelineDates[0])}</span>
                  <span className="text-zinc-300 sm:text-center">
                    Focus: {replayDate ? formatTimelineDate(replayDate) : '-'} ({replayNetDelta >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(replayNetDelta))})
                  </span>
                  <span>{formatTimelineDate(timelineDates[timelineDates.length - 1])}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No events available for replay in this horizon.</p>
            )}
          </div>
        </div>

        <div className={cn('relative', !isMobile && 'max-h-[600px] overflow-y-auto pr-1 custom-scrollbar')}>
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-linear-to-b from-zinc-700 via-violet-500/50 to-zinc-700" />

          <div className={cn('space-y-6 md:space-y-8', isMobile && 'pr-0.5')}>
            {timelineDates.map((date) => {
              const dateObj = new Date(`${date}T00:00:00`);
              const dayDiff = Math.round((dateObj - todayDate) / DAY_MS);
              const isToday = date === data.today;
              const isCompleted = dayDiff < 0;
              const isFutureFar = dayDiff > FAR_FUTURE_DAYS;
              const isReplayFocus = date === replayDate;

              return (
                <TimelineDate
                  key={date}
                  date={date}
                  events={groupedEvents[date] || []}
                  dayDiff={dayDiff}
                  isToday={isToday}
                  isCompleted={isCompleted}
                  isFutureFar={isFutureFar}
                  isReplayFocus={isReplayFocus}
                  approvingOrderIds={approvingOrderIds}
                  onApproveOrder={handleApproveOrder}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineDate({
  date,
  events,
  dayDiff,
  isToday,
  isCompleted,
  isFutureFar,
  isReplayFocus,
  approvingOrderIds,
  onApproveOrder,
}) {
  const depthOffset = clamp(dayDiff * 0.8, -8, 20);
  const depthScale = clamp(1 - Math.max(dayDiff, 0) * 0.0025, 0.95, 1);

  return (
    <div
      className={cn(
        'relative pl-12 sm:pl-16 transition-all duration-500',
        isCompleted && 'opacity-60',
        isFutureFar && 'opacity-80',
        isReplayFocus && 'timeline-date-focus'
      )}
      style={{
        transform: `translateX(${depthOffset}px) scale(${depthScale})`,
      }}
    >
      <div className="absolute left-2.5 sm:left-3 -translate-x-1/2 top-2">
        <div
          className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all',
            isToday
              ? 'bg-violet-500 ring-4 ring-violet-500/20 animate-pulse-slow shadow-lg shadow-violet-500/50'
              : 'bg-zinc-800 border-2 border-zinc-700'
          )}
        >
          {isToday ? <MapPin size={12} className="text-white" /> : null}
        </div>
      </div>

      <div className="mb-4">
        <p
          className={cn(
            'text-sm font-semibold uppercase tracking-wide',
            isToday ? 'text-violet-400' : 'text-zinc-300'
          )}
        >
          {formatTimelineDate(date)}
          {isToday ? ' - TODAY' : ''}
          {isReplayFocus ? ' - REPLAY FOCUS' : ''}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-3 text-xs text-zinc-500">
          No scheduled events
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, idx) => {
            const eventId = `${date}-${event.type}-${idx}`;
            return (
              <TimelineEvent
                key={eventId}
                event={event}
                dayDiff={dayDiff}
                isFutureFar={isFutureFar}
                isReplayFocus={isReplayFocus}
                isApproving={Boolean(
                  event.details?.payment_order_id &&
                    approvingOrderIds[event.details.payment_order_id]
                )}
                onApproveOrder={onApproveOrder}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimelineEvent({
  event,
  dayDiff,
  isFutureFar,
  isReplayFocus,
  isApproving,
  onApproveOrder,
}) {
  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.TRANSACTION;
  const Icon = config.icon;
  const confidence = resolveConfidence(event.details);
  const confidenceStyle = CONFIDENCE_STYLES[confidence];
  const autoPrepared = Array.isArray(event.details?.auto_prepared_payments)
    ? event.details.auto_prepared_payments
    : [];
  const paymentOrderId = event.details?.payment_order_id || null;
  const paymentStatus = String(event.details?.payment_status || '').toLowerCase();
  const canApprove =
    Boolean(paymentOrderId) && ['approval_required', 'failed'].includes(paymentStatus);

  const eventDepthScale = clamp(1 - Math.max(dayDiff, 0) * 0.0015, 0.97, 1);

  return (
    <div
      className={cn(
        'p-4 rounded-lg border transition-all group animate-fade-in',
        'bg-zinc-900/60 border-white/5',
        'hover:border-white/10 hover:bg-zinc-900/80',
        event.type === 'PROJECTION' && cn('border-dashed', confidenceStyle.halo),
        event.type === 'SALARY' && !event.is_completed && 'animate-salary-celebration',
        isFutureFar && event.type !== 'PROJECTION' && 'blur-[0.3px]',
        isReplayFocus && 'ring-1 ring-violet-400/35'
      )}
      style={{
        transform: `scale(${eventDepthScale})`,
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={cn('shrink-0 rounded-md p-2 border border-white/10', config.bg)}>
            <Icon size={16} className={config.textColor} />
          </span>

          <div className="flex-1 min-w-0">
            <p className={cn('font-semibold flex items-center gap-1', config.textColor)}>
              {event.title}
              {event.is_automatic ? <Sparkles size={14} className="text-violet-300" /> : null}
            </p>

            {event.details?.transaction_type ? (
              <p className="text-xs text-zinc-500 mt-1">{event.details.transaction_type}</p>
            ) : null}

            {event.type === 'PROJECTION' ? (
              <div className="mt-2">
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]', confidenceStyle.badge)}>
                  {confidenceStyle.label}
                </span>
              </div>
            ) : null}

            {event.type === 'GOAL_CONTRIBUTION' && Number.isFinite(event.details?.progress) ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, event.details.progress))}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">{event.details.progress}%</span>
                </div>
              </div>
            ) : null}

            {event.type === 'SALARY' && autoPrepared.length > 0 ? (
              <div className="mt-3 border-t border-white/5 pt-2 space-y-1">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide">Prepared commitments</p>
                {autoPrepared.slice(0, 4).map((payment, idx) => (
                  <div key={`${payment.name}-${idx}`} className="text-xs text-zinc-400 flex items-center justify-between gap-2">
                    <span className="truncate">- {payment.name}</span>
                    <span className="shrink-0">-{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
                {Number.isFinite(event.details?.remaining_after) ? (
                  <p className="text-xs text-emerald-300 pt-1">
                    Remaining after commitments: {formatCurrency(event.details.remaining_after)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {event.is_automatic && !event.is_completed && event.type !== 'PROJECTION' ? (
              <div className="mt-3 space-y-2">
                {canApprove ? (
                  <button
                    type="button"
                    onClick={() => onApproveOrder(paymentOrderId, event.title)}
                    disabled={isApproving}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all',
                      'border-violet-400/35 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20',
                      isApproving && 'opacity-70 cursor-wait'
                    )}
                  >
                    {isApproving ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {paymentStatus === 'failed'
                      ? (isApproving ? 'Retrying...' : 'Retry Payment')
                      : (isApproving ? 'Approving...' : 'Approve & Pay')}
                  </button>
                ) : null}

                {paymentStatus ? (
                  <p className="text-[11px] text-violet-300 capitalize">
                    Payment status: {paymentStatus.replace('_', ' ')}
                  </p>
                ) : (
                  <p className="text-[11px] text-violet-300">
                    Scheduled by your rules. Review in Bills, Subscriptions, or Goals as needed.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0 pl-11 sm:pl-0">
          <p
            className={cn(
              'font-bold tabular-nums text-lg',
              event.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {event.amount >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(event.amount))}
          </p>
          {event.is_completed ? (
            <span className="text-emerald-500 text-xs font-semibold">Done</span>
          ) : paymentStatus === 'approved' ? (
            <span className="text-violet-300 text-[10px] font-semibold">APPROVED</span>
          ) : paymentStatus === 'processing' ? (
            <span className="text-amber-300 text-[10px] font-semibold">PROCESSING</span>
          ) : paymentStatus === 'failed' ? (
            <span className="text-rose-300 text-[10px] font-semibold">FAILED</span>
          ) : event.is_automatic ? (
            <span className="text-violet-400 text-[10px] font-semibold">AUTO</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const EVENT_TYPE_CONFIG = {
  SALARY: {
    icon: Wallet,
    textColor: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  BILL_DUE: {
    icon: FileText,
    textColor: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  SUBSCRIPTION: {
    icon: RefreshCw,
    textColor: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
  GOAL_CONTRIBUTION: {
    icon: Target,
    textColor: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  TRANSACTION: {
    icon: CreditCard,
    textColor: 'text-zinc-300',
    bg: 'bg-zinc-500/10',
  },
  PROJECTION: {
    icon: Telescope,
    textColor: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
};
