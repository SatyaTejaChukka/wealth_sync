import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Info,
  Lock,
  PiggyBank,
  RefreshCw,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { CommitmentVaultDetails } from './CommitmentVaultDetails.jsx';
import { formatCurrency } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { autopilotService } from '../../services/autopilot.js';

export function CommitmentVault({ snapshot, onRefresh, isLoading }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('protected');
  const [fullVault, setFullVault] = useState(null);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // If loading and no snapshot yet, show skeleton
  if (isLoading && !snapshot) {
    return (
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 md:p-6 backdrop-blur-xl animate-pulse space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-40 rounded bg-white/10" />
          <div className="h-6 w-24 rounded-full bg-white/10" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-20 rounded-xl bg-white/5" />
          <div className="h-20 rounded-xl bg-white/5" />
          <div className="h-20 rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (!snapshot) return null;

  const {
    tracked_balance = 0,
    protected_amount = 0,
    future_amount = 0,
    free_amount = 0,
    integrity_state = 'incomplete',
    shortfall_amount = 0,
    horizon_end,
  } = snapshot;

  const total = Math.max(Number(tracked_balance), Number(protected_amount) + Number(future_amount));
  const protectedPct = total > 0 ? (Number(protected_amount) / total) * 100 : 0;
  const futurePct = total > 0 ? (Number(future_amount) / total) * 100 : 0;
  const freePct = total > 0 ? (Number(free_amount) / total) * 100 : 0;

  const handleOpenTab = async (tab) => {
    setSelectedTab(tab);
    setIsDetailsOpen(true);
    if (!fullVault) {
      try {
        setIsFetchingDetails(true);
        const data = await autopilotService.getCommitmentVault();
        setFullVault(data);
      } catch (err) {
        console.error('Failed to load full commitment vault details', err);
      } finally {
        setIsFetchingDetails(false);
      }
    }
  };

  return (
    <>
      <div className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 p-4 sm:p-5 md:p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/15">
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-600/10 blur-3xl" />

        {/* Top Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Shield size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
                  Commitment Vault
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">
                  (Ledger Basis)
                </span>
              </div>
              <p className="text-[11px] md:text-xs text-zinc-400">
                Guarding required obligations before next payday
              </p>
            </div>
          </div>

          {/* Status Badge & Details Trigger */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {integrity_state === 'covered' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                <CheckCircle2 size={12} />
                Covered
              </span>
            )}
            {integrity_state === 'shortfall' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
                <AlertTriangle size={12} />
                Shortfall: {formatCurrency(shortfall_amount)}
              </span>
            )}
            {integrity_state === 'incomplete' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                <Info size={12} />
                Needs Setup
              </span>
            )}

            <button
              onClick={() => handleOpenTab('free')}
              className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-zinc-800/60 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span>Explain</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Hero Balance & Allocation Bar */}
        <div className="py-4 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-medium text-zinc-400">Tracked Ledger Balance</span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatCurrency(tracked_balance)}
            </span>
          </div>

          {/* Proportional breakdown bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-800/60 p-0.5 border border-white/5">
            <div
              style={{ width: `${protectedPct}%` }}
              title={`Protected: ${protectedPct.toFixed(1)}%`}
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
            />
            <div
              style={{ width: `${futurePct}%` }}
              title={`Future: ${futurePct.toFixed(1)}%`}
              className="h-full rounded-full bg-cyan-400 transition-all duration-500 ml-0.5"
            />
            <div
              style={{ width: `${freePct}%` }}
              title={`Free: ${freePct.toFixed(1)}%`}
              className="h-full rounded-full bg-emerald-400 transition-all duration-500 ml-0.5"
            />
          </div>
        </div>

        {/* 3 Interactive Buckets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* 1. Protected Vault */}
          <button
            type="button"
            onClick={() => handleOpenTab('protected')}
            className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-zinc-950/40 p-3.5 text-left transition-all duration-200 hover:border-violet-500/40 hover:bg-violet-500/5 cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-300">
                <Shield size={14} className="text-violet-400" />
                Protected
              </span>
              <span className="text-[11px] text-zinc-500 group-hover:text-violet-300 transition-colors">
                View &rarr;
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-base sm:text-lg font-extrabold text-white">
                {formatCurrency(protected_amount)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Bills, EMIs &amp; Subscriptions
              </div>
            </div>
          </button>

          {/* 2. Future Vault */}
          <button
            type="button"
            onClick={() => handleOpenTab('future')}
            className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-zinc-950/40 p-3.5 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-cyan-500/5 cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <PiggyBank size={14} className="text-cyan-400" />
                Future
              </span>
              <span className="text-[11px] text-zinc-500 group-hover:text-cyan-300 transition-colors">
                View &rarr;
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-base sm:text-lg font-extrabold text-white">
                {formatCurrency(future_amount)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Active Goal Planned Reserves
              </div>
            </div>
          </button>

          {/* 3. Free Vault */}
          <button
            type="button"
            onClick={() => handleOpenTab('free')}
            className="group relative flex flex-col justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-left transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer shadow-sm"
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Sparkles size={14} className="text-emerald-400" />
                Free
              </span>
              <span className="text-[11px] text-emerald-400/80 group-hover:text-emerald-300 transition-colors">
                Math &rarr;
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-base sm:text-lg font-extrabold text-emerald-400">
                {formatCurrency(free_amount)}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Unencumbered after reserves
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Details Drawer / Modal */}
      <CommitmentVaultDetails
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        vault={
          fullVault || {
            tracked_balance,
            basis: {
              balance_source: 'tracked_ledger',
              horizon_start: new Date().toISOString().split('T')[0],
              horizon_end,
              horizon_source: 'next_income_date',
            },
            vaults: {
              protected: { amount: protected_amount, item_count: 0, items: [] },
              future: { amount: future_amount, item_count: 0, items: [] },
              free: { amount: free_amount, daily_amount: 0, days_remaining: 1 },
            },
            integrity: {
              state: integrity_state,
              shortfall_amount,
              reserve_total: Number(protected_amount) + Number(future_amount),
            },
            data_quality: { reasons: [] },
          }
        }
        initialTab={selectedTab}
      />
    </>
  );
}
