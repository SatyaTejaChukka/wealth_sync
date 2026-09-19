import React, { useState } from 'react';
import { Zap, RefreshCw, Trash2, CheckCircle, Clock, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../lib/utils';
import { formatCurrency } from '../../lib/format';

export function ElectricityCard({ account, onFetch, onPay, onDelete }) {
  const [fetching, setFetching] = useState(false);
  const [paying, setPaying] = useState(false);

  const latestBill = account.latest_bill || (account.bills && account.bills[0]);
  const isPaid = latestBill?.status === 'paid';

  // Calculate days remaining
  let dueText = '';
  let dueVariant = 'neutral'; // 'neutral' | 'warning' | 'danger' | 'success'

  if (latestBill) {
    if (isPaid) {
      dueText = 'Paid';
      dueVariant = 'success';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(latestBill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        dueText = `Overdue by ${Math.abs(diffDays)}d`;
        dueVariant = 'danger';
      } else if (diffDays === 0) {
        dueText = 'Due Today';
        dueVariant = 'danger';
      } else if (diffDays <= 3) {
        dueText = `Due in ${diffDays}d`;
        dueVariant = 'warning';
      } else {
        dueText = `Due ${new Date(latestBill.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        dueVariant = 'neutral';
      }
    }
  }

  const handleFetch = async (e) => {
    e.stopPropagation();
    try {
      setFetching(true);
      await onFetch(account.id);
    } finally {
      setFetching(false);
    }
  };

  const handlePay = async (e) => {
    e.stopPropagation();
    if (!latestBill || isPaid) return;
    try {
      setPaying(true);
      await onPay(latestBill.id);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-zinc-900/60 to-zinc-950/80 p-5 backdrop-blur-xl shadow-lg transition-all hover:border-amber-500/30 hover:shadow-amber-500/5">
      {/* Glow highlight */}
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <Zap className="h-5 w-5 fill-amber-400/30 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white tracking-tight text-base">
                {account.nickname || account.provider_code}
              </h3>
              <span className="inline-flex items-center rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-400/20">
                {account.provider_code}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              No: {account.consumer_number}
              {account.consumer_name && <span className="text-zinc-500 ml-1.5">• {account.consumer_name}</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFetch}
            disabled={fetching}
            title="Check latest bill from provider"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", fetching && "animate-spin text-amber-400")} />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            title="Unlink connection"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Middle Bill Details Area */}
      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 items-end">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Current Bill</span>
          <div className="text-2xl font-bold text-white tracking-tight mt-0.5">
            {latestBill ? formatCurrency(latestBill.amount) : '₹0.00'}
          </div>
          {latestBill?.units_consumed && (
            <p className="text-xs text-amber-400/80 mt-0.5">
              ⚡ {latestBill.units_consumed} kWh consumed
            </p>
          )}
        </div>

        <div className="flex flex-col items-end justify-between h-full">
          {latestBill ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                dueVariant === 'success' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                dueVariant === 'warning' && "bg-amber-500/15 text-amber-300 border-amber-500/30",
                dueVariant === 'danger' && "bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse",
                dueVariant === 'neutral' && "bg-zinc-800 text-zinc-300 border-zinc-700"
              )}
            >
              {dueVariant === 'success' ? (
                <Check className="h-3 w-3" />
              ) : dueVariant === 'danger' ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {dueText}
            </span>
          ) : (
            <span className="text-xs text-zinc-500">No bill recorded</span>
          )}

          {latestBill && latestBill.bill_number && (
            <span className="text-[10px] text-zinc-500 mt-1 font-mono">
              Bill #{latestBill.bill_number}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Actions Bar */}
      {latestBill && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-500">
            {account.last_checked_at
              ? `Synced ${new Date(account.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Auto-fetch active'}
          </span>

          {isPaid ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <CheckCircle className="h-4 w-4" /> Paid & Logged
            </span>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={paying}
              onClick={handlePay}
              className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border-none shadow-md shadow-amber-500/20 h-8 px-4"
            >
              Mark as Paid
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
