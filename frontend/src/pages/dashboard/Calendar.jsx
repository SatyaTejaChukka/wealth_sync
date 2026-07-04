import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Check, 
  Receipt,
  FileText,
  Repeat,
  Landmark,
  HandCoins,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { calendarService } from '../../services/calendar.js';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

export default function Calendar() {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedDateStr, setSelectedDateStr] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 0-indexed to 1-indexed

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
    setSelectedDayEvents(null);
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
    setSelectedDayEvents(null);
    setSelectedDateStr(null);
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await calendarService.getEvents(year, month);
      setEvents(data);
    } catch (e) {
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  // Calendar calculations
  const firstDayIndex = new Date(year, currentDate.getMonth(), 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, currentDate.getMonth(), 0).getDate();

  // Calendar dates grid representation
  const calendarCells = [];

  // Padding cells from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const dateObj = new Date(year, currentDate.getMonth() - 1, day);
    calendarCells.push({ day, isCurrentMonth: false, date: dateObj });
  }

  // Current month cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, currentDate.getMonth(), day);
    calendarCells.push({ day, isCurrentMonth: true, date: dateObj });
  }

  // Padding cells for next month to complete the grid (usually 42 cells total)
  const remainingCells = 42 - calendarCells.length;
  for (let day = 1; day <= remainingCells; day++) {
    const dateObj = new Date(year, currentDate.getMonth() + 1, day);
    calendarCells.push({ day, isCurrentMonth: false, date: dateObj });
  }

  // Month name helper
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Event category color indicator mapping
  const getEventBadgeClass = (type) => {
    switch (type) {
      case 'bill':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'loan':
        return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'subscription':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'lent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const getEventDotClass = (type) => {
    switch (type) {
      case 'bill':
        return 'bg-red-500';
      case 'loan':
        return 'bg-violet-500';
      case 'subscription':
        return 'bg-rose-500';
      case 'lent':
        return 'bg-emerald-500';
      default:
        return 'bg-zinc-500';
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'bill':
        return <FileText size={14} className="text-red-400" />;
      case 'loan':
        return <Landmark size={14} className="text-violet-400" />;
      case 'subscription':
        return <Repeat size={14} className="text-rose-400" />;
      case 'lent':
        return <HandCoins size={14} className="text-emerald-400" />;
      default:
        return <Receipt size={14} className="text-zinc-400" />;
    }
  };

  // Click handler for days in current month
  const handleDayClick = (cellDate, isCurrentMonth) => {
    if (!isCurrentMonth) return;
    const localDateStr = cellDate.toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const dayEvents = events.filter(e => e.due_date === localDateStr);
    setSelectedDayEvents(dayEvents);
    setSelectedDateStr(localDateStr);
  };

  // Quick Action Payments
  const handlePayBill = async (billId) => {
    try {
      await api.post(`/bills/${billId}/mark-paid`);
      toast.success('Bill successfully marked as paid!');
      
      // Update local events and drawer state
      const updatedEvents = await calendarService.getEvents(year, month);
      setEvents(updatedEvents);
      
      const dayEvents = updatedEvents.filter(e => e.due_date === selectedDateStr);
      setSelectedDayEvents(dayEvents);
    } catch (e) {
      toast.error('Failed to mark bill as paid');
    }
  };

  const handlePayLoan = async (loanId) => {
    try {
      await api.post(`/loans/${loanId}/pay`);
      toast.success('EMI Payment successfully recorded!');
      
      const updatedEvents = await calendarService.getEvents(year, month);
      setEvents(updatedEvents);
      
      const dayEvents = updatedEvents.filter(e => e.due_date === selectedDateStr);
      setSelectedDayEvents(dayEvents);
    } catch (e) {
      toast.error('Failed to pay EMI');
    }
  };

  const handleSettleLent = async (lentId, amount) => {
    try {
      await api.post(`/lent/${lentId}/repay`, null, {
        params: { amount, notes: 'Repayment recorded via Calendar Quick-Settle' }
      });
      toast.success('Lent amount settled successfully!');
      
      const updatedEvents = await calendarService.getEvents(year, month);
      setEvents(updatedEvents);
      
      const dayEvents = updatedEvents.filter(e => e.due_date === selectedDateStr);
      setSelectedDayEvents(dayEvents);
    } catch (e) {
      toast.error('Failed to settle lent money');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Financial Calendar</h1>
        <p className="text-zinc-400 text-sm">Visualize due dates, EMIs, and repayments to stay ahead of your timeline.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Grid Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md">
            {/* Header Navigation controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="text-violet-500" size={20} />
                <h2 className="text-lg font-bold text-white">Monthly Schedule</h2>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handlePrevMonth} 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm font-semibold text-white min-w-28 text-center uppercase tracking-wide">
                  {monthName} {year}
                </span>
                <Button 
                  onClick={handleNextMonth} 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5 border border-white/5"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>

            {/* Grid Header (Weekdays) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 bg-white/2 rounded-xl p-1 border border-white/5">
              {calendarCells.map((cell, index) => {
                const dateStr = cell.date.toLocaleDateString('sv-SE');
                const dayEvents = events.filter(e => e.due_date === dateStr);
                const isSelected = selectedDateStr === dateStr;

                return (
                  <div
                    key={index}
                    onClick={() => handleDayClick(cell.date, cell.isCurrentMonth)}
                    className={cn(
                      "min-h-20 p-1.5 rounded-lg border transition-all duration-200 flex flex-col justify-between cursor-pointer",
                      cell.isCurrentMonth
                        ? isSelected 
                          ? "bg-violet-500/10 border-violet-500/40" 
                          : "bg-zinc-900/40 border-white/2 hover:bg-white/5 hover:border-white/10"
                        : "bg-transparent border-transparent opacity-20 cursor-not-allowed"
                    )}
                  >
                    {/* Day Number */}
                    <span className={cn(
                      "text-xs font-bold",
                      isSelected ? "text-violet-400" : cell.isCurrentMonth ? "text-zinc-300" : "text-zinc-600"
                    )}>
                      {cell.day}
                    </span>

                    {/* Event Dots/Indicators */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dayEvents.slice(0, 3).map((event, eventIdx) => (
                        <div 
                          key={eventIdx} 
                          title={`${event.title} (${event.status})`}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            getEventDotClass(event.type),
                            event.status === 'paid' && "opacity-40"
                          )}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] font-extrabold text-zinc-500 leading-none">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Event Side Panel */}
        <div className="lg:col-span-1">
          {selectedDateStr ? (
            <Card className="p-5 bg-zinc-900/30 border-white/5 backdrop-blur-md space-y-6">
              <div>
                <h3 className="font-bold text-white text-lg">Dues for {new Date(selectedDateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Quick actions to clear your schedules.</p>
              </div>

              {/* Event Cards List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {selectedDayEvents.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-white/2 border border-white/5 text-zinc-500 flex flex-col items-center justify-center gap-2">
                    <Check size={20} className="text-emerald-500" />
                    <p className="text-sm font-semibold">All clear!</p>
                    <p className="text-xs text-zinc-600">No transactions scheduled on this day.</p>
                  </div>
                ) : (
                  selectedDayEvents.map((event, idx) => {
                    const isPaid = event.status === 'paid';
                    return (
                      <div 
                        key={idx} 
                        className="p-4 rounded-xl bg-white/2 border border-white/5 flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-2.5">
                            <div className={cn(
                              "w-7 h-7 rounded-lg border flex items-center justify-center mt-0.5",
                              getEventBadgeClass(event.type)
                            )}>
                              {getEventIcon(event.type)}
                            </div>
                            <div>
                              <p className={cn("text-xs font-semibold text-white", isPaid && "line-through text-zinc-500")}>
                                {event.title}
                              </p>
                              <p className="text-[10px] text-zinc-500 uppercase font-semibold mt-0.5">
                                {event.type}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs font-extrabold",
                            isPaid ? "text-zinc-500" : "text-white"
                          )}>
                            INR {event.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Event action button */}
                        {!isPaid && (
                          <div className="pt-2 border-t border-white/2">
                            {event.type === 'bill' && (
                              <Button 
                                onClick={() => handlePayBill(event.linked_id)}
                                className="w-full bg-linear-to-r from-violet-600 to-indigo-600 text-xs font-semibold py-1.5 h-8 border-0"
                              >
                                Mark as Paid
                              </Button>
                            )}
                            {event.type === 'loan' && (
                              <Button 
                                onClick={() => handlePayLoan(event.linked_id)}
                                className="w-full bg-linear-to-r from-violet-600 to-indigo-600 text-xs font-semibold py-1.5 h-8 border-0"
                              >
                                Pay Monthly EMI
                              </Button>
                            )}
                            {event.type === 'lent' && (
                              <Button 
                                onClick={() => handleSettleLent(event.linked_id, event.amount)}
                                className="w-full bg-linear-to-r from-emerald-600 to-teal-600 text-xs font-semibold py-1.5 h-8 border-0"
                              >
                                Settle Repayment (INR {event.amount.toLocaleString('en-IN')})
                              </Button>
                            )}
                            {event.type === 'subscription' && (
                              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <AlertCircle size={12} />
                                Auto-debit scheduled
                              </div>
                            )}
                          </div>
                        )}
                        {isPaid && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1">
                            <Check size={14} />
                            Completed / Settled
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center border-white/5 bg-zinc-900/10 text-zinc-500 flex flex-col items-center justify-center gap-2 h-64">
              <CalendarDays size={24} className="text-zinc-700" />
              <p className="text-sm font-semibold">Select a calendar date</p>
              <p className="text-xs text-zinc-600">Click any highlighted cell to see scheduled payments.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
