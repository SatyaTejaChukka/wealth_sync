import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  ArrowRight, 
  FileText, 
  Landmark, 
  Repeat, 
  Zap, 
  HandCoins,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { calendarService } from '../../services/calendar.js';
import { formatCurrency, formatDate } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

const TYPE_CONFIG = {
  bill: {
    icon: FileText,
    label: 'Bill',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  loan: {
    icon: Landmark,
    label: 'Loan EMI',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
  },
  subscription: {
    icon: Repeat,
    label: 'Subscription',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  electricity: {
    icon: Zap,
    label: 'Electricity',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },
  lent: {
    icon: HandCoins,
    label: 'Expected Return',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
};

export function UpcomingCommitmentsCard({ maxItems = 4, className }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadUpcoming = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Fetch this month
        const thisMonthEvents = await calendarService.getEvents(year, month);
        let allEvents = Array.isArray(thisMonthEvents) ? [...thisMonthEvents] : [];

        // If in the second half of the month, also fetch next month to show upcoming 14 days
        if (now.getDate() >= 18) {
          const nextMonthDate = new Date(year, month, 1);
          const nextYear = nextMonthDate.getFullYear();
          const nextMonth = nextMonthDate.getMonth() + 1;
          const nextMonthEvents = await calendarService.getEvents(nextYear, nextMonth);
          if (Array.isArray(nextMonthEvents)) {
            allEvents = [...allEvents, ...nextMonthEvents];
          }
        }

        if (!isMounted) return;

        // Filter events due from today onwards (or recent unpaid), sorted by due date
        const todayStr = now.toISOString().split('T')[0];
        const upcoming = allEvents
          .filter((ev) => ev.due_date >= todayStr)
          .sort((a, b) => a.due_date.localeCompare(b.due_date));

        setEvents(upcoming);
      } catch (err) {
        console.error('Failed to load upcoming commitments:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUpcoming();
    return () => {
      isMounted = false;
    };
  }, []);

  const getRelativeDayLabel = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    return formatDate(dateStr);
  };

  const displayedEvents = events.slice(0, maxItems);

  return (
    <Card className={cn("bg-zinc-900/40 border-white/5 backdrop-blur-xl relative overflow-hidden", className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
          <CalendarDays size={16} className="text-violet-400" />
          Upcoming Commitments
        </CardTitle>
        <span className="text-[11px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
          Next 14 Days
        </span>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-black/20 p-5 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-1.5" />
            <p className="text-sm font-medium text-white">No upcoming payments</p>
            <p className="text-xs text-zinc-500 mt-0.5">You have no scheduled bills due in the near future.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedEvents.map((item, idx) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.bill;
              const Icon = cfg.icon;
              const isPaid = item.status === 'paid';
              const relLabel = getRelativeDayLabel(item.due_date);
              const isToday = relLabel === 'Today';

              return (
                <div
                  key={`${item.linked_id || item.title}-${idx}`}
                  className="group flex items-center justify-between gap-3 p-2.5 rounded-xl border border-white/5 bg-black/20 hover:border-white/15 hover:bg-white/[0.02] transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0", cfg.bg)}>
                      <Icon size={14} className={cfg.color} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                          {item.title}
                        </p>
                        {isPaid && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded font-medium">
                            Paid
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                        <Clock size={11} className={isToday ? "text-amber-400" : "text-zinc-500"} />
                        <span className={cn(isToday ? "text-amber-400 font-semibold" : "")}>
                          {relLabel}
                        </span>
                        <span>•</span>
                        <span>{cfg.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-white">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-2 border-t border-white/5">
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-1.5"
            onClick={() => navigate('/dashboard/calendar')}
          >
            <span>Open Financial Calendar</span>
            <ArrowRight size={13} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
