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
  Wallet,
} from 'lucide-react';
import { CommitmentVaultDetails } from './CommitmentVaultDetails.jsx';
import { formatCurrency, MoneyValue } from '../../lib/format.js';
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
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-linear-to-b from-zinc-900/80 via-zinc-900/50 to-zinc-950/90 p-4 sm:p-6 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_16px_40px_rgba(0,0,0,0.6)] transition-all duration-300">
        {/* Glow ambient background inside hero surface */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-cyan-600/10 blur-3xl" />

        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300 shadow-sm shadow-violet-500/20">
              <Shield size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Commitment Vault
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium hidden sm:inline">
                  (Ledger Basis)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Guarding required obligations before next payday
              </p>
            </div>
          </div>

          {/* Status Badge & Details Trigger */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {integrity_state === 'covered' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 shadow-sm">
                <CheckCircle2 size={12} />
                Covered
              </span>
            )}
            {integrity_state === 'shortfall' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300 shadow-sm">
                <AlertTriangle size={12} />
                <span>Shortfall:</span>
                <MoneyValue value={shortfall_amount} symbolClassName="text-[0.65em] font-medium text-rose-300/60 mr-0.5 select-none" />
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
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <span>Explain</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Hero Balance & Allocation Bar */}
        <div className="py-4 space-y-2.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-medium text-zinc-400">Tracked Ledger Balance</span>
            <MoneyValue
              value={tracked_balance}
              className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display"
            />
          </div>

          {/* Proportional illuminated allocation bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-950/80 p-0.5 border border-white/[0.06]">
            <div
              style={{ width: `${Math.max(protectedPct > 0 ? 3 : 0, protectedPct)}%` }}
              title={`Protected: ${protectedPct.toFixed(1)}%`}
              className="h-full rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)] transition-all duration-500"
            />
            <div
              style={{ width: `${Math.max(futurePct > 0 ? 3 : 0, futurePct)}%` }}
              title={`Future: ${futurePct.toFixed(1)}%`}
              className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-all duration-500 ml-0.5"
            />
            <div
              style={{ width: `${Math.max(freePct > 0 ? 3 : 0, freePct)}%` }}
              title={`Free: ${freePct.toFixed(1)}%`}
              className="h-full rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] transition-all duration-500 ml-0.5"
            />
          </div>
        </div>

        {/* ── Mobile View: Sleek Segmented Glass List (Eliminates bulky nested boxes) ── */}
        <div className="sm:hidden mt-2 segmented-deck divide-y divide-white/[0.04]">
          {/* 1. Protected Row */}
          <button
            type="button"
            onClick={() => handleOpenTab('protected')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                <Shield size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Protected Obligations</p>
                <p className="text-[10px] text-zinc-400 truncate">Bills, EMIs &amp; Subscriptions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <MoneyValue
                value={protected_amount}
                className="text-sm font-extrabold text-white font-display"
              />
              <ChevronRight size={14} className="text-zinc-500" />
            </div>
          </button>

          {/* 2. Future Row */}
          <button
            type="button"
            onClick={() => handleOpenTab('future')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shrink-0">
                <PiggyBank size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Future Goal Reserves</p>
                <p className="text-[10px] text-zinc-400 truncate">Planned Milestone Allocations</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <MoneyValue
                value={future_amount}
                className="text-sm font-extrabold text-white font-display"
              />
              <ChevronRight size={14} className="text-zinc-500" />
            </div>
          </button>

          {/* 3. Free Row */}
          <button
            type="button"
            onClick={() => handleOpenTab('free')}
            className="w-full p-3.5 flex items-center justify-between hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
                <Wallet size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Free to Spend</p>
                <p className="text-[10px] text-zinc-400 truncate">Safe Discretionary Runway</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <MoneyValue
                value={free_amount}
                className="text-sm font-extrabold text-emerald-400 font-display"
                symbolClassName="text-[0.65em] font-medium text-emerald-400/60 mr-0.5 select-none"
              />
              <ChevronRight size={14} className="text-zinc-500" />
            </div>
          </button>
        </div>

        {/* ── Desktop View: 3 Interactive Glass Cards ── */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-3 pt-2">
          {/* 1. Protected Vault */}
          <button
            type="button"
            onClick={() => handleOpenTab('protected')}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-4 text-left transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-500/5 cursor-pointer shadow-sm card-specular"
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Shield size={14} className="text-amber-400" />
                Protected
              </span>
              <span className="text-[11px] text-zinc-500 group-hover:text-amber-300 transition-colors">
                View &rarr;
              </span>
            </div>
            <div className="mt-3">
              <MoneyValue
                value={protected_amount}
                className="text-base sm:text-lg font-extrabold text-white font-display"
              />
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Bills, EMIs &amp; Subscriptions
              </div>
            </div>
          </button>

          {/* 2. Future Vault */}
          <button
            type="button"
            onClick={() => handleOpenTab('future')}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/40 p-4 text-left transition-all duration-200 hover:border-cyan-500/40 hover:bg-cyan-500/5 cursor-pointer shadow-sm card-specular"
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
            <div className="mt-3">
              <MoneyValue
                value={future_amount}
                className="text-base sm:text-lg font-extrabold text-white font-display"
              />
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Active Goal Planned Reserves
              </div>
            </div>
          </button>

          {/* 3. Free Vault */}
          <button
            type="button"
            onClick={() => handleOpenTab('free')}
            className="group relative flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-left transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 cursor-pointer shadow-sm card-specular"
          >
            <div className="flex items-center justify-between w-full">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Wallet size={14} className="text-emerald-400" />
                Free
              </span>
              <span className="text-[11px] text-emerald-400/80 group-hover:text-emerald-300 transition-colors">
                Math &rarr;
              </span>
            </div>
            <div className="mt-3">
              <MoneyValue
                value={free_amount}
                className="text-base sm:text-lg font-extrabold text-emerald-400 font-display"
                symbolClassName="text-[0.65em] font-medium text-emerald-400/60 mr-0.5 select-none"
              />
              <div className="text-[11px] text-zinc-400 mt-0.5">
                Unencumbered after reserves
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Details Drawer / Modal */}
      <CommitmentVaultDetails
        key={`${selectedTab}-${isDetailsOpen ? 'open' : 'closed'}`}
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
