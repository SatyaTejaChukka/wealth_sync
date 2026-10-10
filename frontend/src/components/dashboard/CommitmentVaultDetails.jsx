import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Info,
  PiggyBank,
  Shield,
  Wallet,
  TrendingDown,
  X,
} from 'lucide-react';
import { formatCurrency, MoneyValue } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

export function CommitmentVaultDetails({ isOpen, onClose, vault, initialTab = 'protected' }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Synchronize activeTab whenever the modal opens or the requested initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen || !vault) return null;

  const basis = vault.basis || {};
  const vaults = vault.vaults || {};
  const protectedVault = vaults.protected || { items: [], amount: 0, item_count: 0 };
  const futureVault = vaults.future || { items: [], amount: 0, item_count: 0 };
  const freeVault = vaults.free || { amount: 0, daily_amount: 0, days_remaining: 1 };
  const integrity = vault.integrity || {};
  const dataQuality = vault.data_quality || { reasons: [] };

  const handleRoute = (path) => {
    onClose();
    navigate(path);
  };

  const getSourceRoute = (type) => {
    switch (type) {
      case 'BILL':
        return '/dashboard/bills';
      case 'LOAN':
        return '/dashboard/loans';
      case 'SUBSCRIPTION':
        return '/dashboard/subscriptions';
      default:
        return '/dashboard';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col border border-white/10 bg-[#09090b] shadow-[0_-16px_40px_rgba(0,0,0,0.8)] rounded-t-[2rem] md:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Commitment Vault Details</h2>
              <p className="text-xs text-zinc-400">
                Deterministic breakdown of your tracked ledger balance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-zinc-950 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('protected')}
            className={cn(
              'flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors',
              activeTab === 'protected'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Shield size={14} />
            <span>Protected ({protectedVault.item_count})</span>
          </button>

          <button
            onClick={() => setActiveTab('future')}
            className={cn(
              'flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors',
              activeTab === 'future'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            )}
          >
            <PiggyBank size={14} />
            <span>Future ({futureVault.item_count})</span>
          </button>

          <button
            onClick={() => setActiveTab('free')}
            className={cn(
              'flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-semibold transition-colors',
              activeTab === 'free'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Wallet size={14} />
            <span>Free Equation</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 max-h-[calc(92vh-160px)] pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)]">
          {/* TAB 1: PROTECTED */}
          {activeTab === 'protected' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 card-specular">
                <div>
                  <div className="text-xs text-amber-300 font-medium">Total Protected Obligations</div>
                  <MoneyValue
                    value={protectedVault.amount}
                    className="text-xl font-extrabold text-white font-display tabular-nums"
                  />
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-200">
                    {protectedVault.item_count} due before {basis.horizon_end}
                  </span>
                </div>
              </div>

              {protectedVault.items.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No upcoming unpaid bills, EMIs, or subscriptions within this horizon.
                </div>
              ) : (
                <div className="segmented-deck divide-y divide-white/[0.04] overflow-hidden">
                  {protectedVault.items.map((item, idx) => (
                    <div
                      key={item.source_id || idx}
                      className="flex items-center justify-between p-3.5 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border',
                              item.source_type === 'BILL' && 'bg-amber-500/15 text-amber-300 border-amber-500/20',
                              item.source_type === 'LOAN' && 'bg-blue-500/15 text-blue-300 border-blue-500/20',
                              item.source_type === 'SUBSCRIPTION' && 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20'
                            )}
                          >
                            {item.source_type}
                          </span>
                          <span className="text-sm font-semibold text-white">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            Due: {item.due_on}
                          </span>
                          {item.payment_status && (
                            <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                              Order: {item.payment_status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <MoneyValue
                          value={item.amount}
                          className="text-sm font-bold text-white font-display tabular-nums"
                        />
                        <button
                          onClick={() => handleRoute(getSourceRoute(item.source_type))}
                          title="View source details"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FUTURE */}
          {activeTab === 'future' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3.5 card-specular">
                <div>
                  <div className="text-xs text-cyan-300 font-medium">Total Future Reserves</div>
                  <MoneyValue
                    value={futureVault.amount}
                    className="text-xl font-extrabold text-white font-display tabular-nums"
                  />
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-medium text-cyan-200">
                    {futureVault.item_count} active savings goals
                  </span>
                </div>
              </div>

              {futureVault.items.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No active savings goals with planned contributions.
                </div>
              ) : (
                <div className="segmented-deck divide-y divide-white/[0.04] overflow-hidden">
                  {futureVault.items.map((item, idx) => (
                    <div
                      key={item.goal_id || idx}
                      className="p-3.5 hover:bg-white/[0.03] transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <PiggyBank size={16} className="text-cyan-400" />
                          <span className="text-sm font-semibold text-white">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-baseline gap-1 text-sm font-bold text-cyan-300">
                            <MoneyValue
                              value={item.reserved_amount}
                              className="font-display tabular-nums text-cyan-300"
                              symbolClassName="text-[0.65em] font-medium text-cyan-300/60 mr-0.5 select-none"
                            />
                            <span className="text-xs font-normal text-cyan-300/80">reserved</span>
                          </div>
                          <button
                            onClick={() => handleRoute('/dashboard/goals')}
                            title="Go to Goals"
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-1 border-t border-white/5">
                        <div className="flex items-baseline gap-1">
                          <span>Planned monthly:</span>
                          <MoneyValue
                            value={item.planned_amount}
                            className="text-zinc-200 font-medium font-display tabular-nums"
                          />
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span>Saved this cycle:</span>
                          <MoneyValue
                            value={item.completed_amount}
                            className="text-emerald-400 font-medium font-display tabular-nums"
                            symbolClassName="text-[0.65em] font-medium text-emerald-400/60 mr-0.5 select-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FREE */}
          {activeTab === 'free' && (
            <div className="space-y-4">
              {/* Formula card */}
              <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 space-y-3 card-specular">
                <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400">
                  Allocation Math (Ledger Basis)
                </h3>
                <div className="space-y-2 text-sm font-medium">
                  <div className="flex justify-between items-center text-zinc-200">
                    <span>Tracked Balance (Completed Ledger)</span>
                    <div className="flex items-baseline gap-0.5 font-bold text-white">
                      <span>+</span>
                      <MoneyValue value={vault.tracked_balance} className="font-display tabular-nums text-white" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-violet-400">
                    <span>- Protected Reserves (Bills, EMIs, Subs)</span>
                    <div className="flex items-baseline gap-0.5 font-bold text-violet-400">
                      <span>-</span>
                      <MoneyValue
                        value={protectedVault.amount}
                        className="font-display tabular-nums text-violet-400"
                        symbolClassName="text-[0.65em] font-medium text-violet-400/60 mr-0.5 select-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-cyan-400">
                    <span>- Future Goal Reserves (Active Goals)</span>
                    <div className="flex items-baseline gap-0.5 font-bold text-cyan-400">
                      <span>-</span>
                      <MoneyValue
                        value={futureVault.amount}
                        className="font-display tabular-nums text-cyan-400"
                        symbolClassName="text-[0.65em] font-medium text-cyan-400/60 mr-0.5 select-none"
                      />
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between items-center text-base">
                    <span className="font-bold text-white">Truly Free Amount</span>
                    <MoneyValue
                      value={freeVault.amount}
                      className={cn(
                        'font-extrabold font-display tabular-nums',
                        freeVault.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      )}
                      symbolClassName={cn(
                        'text-[0.65em] font-medium mr-0.5 select-none',
                        freeVault.amount > 0 ? 'text-emerald-400/60' : 'text-rose-400/60'
                      )}
                    />
                  </div>
                </div>

                {integrity.state === 'shortfall' && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 flex items-center gap-2 text-xs text-rose-300">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>
                      Tracked balance has a shortfall of{' '}
                      <MoneyValue
                        value={integrity.shortfall_amount}
                        className="font-bold text-rose-300 font-display tabular-nums inline"
                        symbolClassName="text-[0.65em] font-medium text-rose-300/60 mr-0.5 select-none"
                      />{' '}
                      to fully cover scheduled commitments.
                    </span>
                  </div>
                )}
              </div>

              {/* Daily context */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-3.5 space-y-1 card-specular">
                  <div className="text-xs text-zinc-400">Daily Free Pace</div>
                  <div className="text-lg font-bold text-white flex items-baseline gap-1">
                    <MoneyValue
                      value={freeVault.daily_amount}
                      className="font-display tabular-nums text-white"
                    />
                    <span className="text-xs text-zinc-500 font-normal">/ day</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Context pacing over remaining {freeVault.days_remaining} days
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-3.5 space-y-1 card-specular">
                  <div className="text-xs text-zinc-400">Planning Horizon</div>
                  <div className="text-lg font-bold text-white">
                    {freeVault.days_remaining} days
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Ends on {basis.horizon_end}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PERSISTENT FOOTER: BASIS & DATA QUALITY */}
          <div className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 space-y-2.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 font-semibold text-zinc-300">
              <Info size={14} className="text-violet-400" />
              <span>Why this calculation?</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
              <div>
                <span className="text-zinc-500">Balance Basis:</span> Tracked transactions ledger
              </div>
              <div>
                <span className="text-zinc-500">Horizon:</span> {basis.horizon_start} to {basis.horizon_end}
              </div>
              <div>
                <span className="text-zinc-500">Horizon Source:</span>{' '}
                {basis.horizon_source === 'next_income_date'
                  ? `Next salary (${basis.next_income_date})`
                  : 'Current month-end fallback'}
              </div>
              <div>
                <span className="text-zinc-500">Integrity:</span>{' '}
                <span className={cn('capitalize font-medium', integrity.state === 'covered' ? 'text-emerald-400' : 'text-amber-400')}>
                  {integrity.state}
                </span>
              </div>
            </div>

            {dataQuality.reasons && dataQuality.reasons.length > 0 && (
              <div className="border-t border-white/5 pt-2 space-y-1">
                {dataQuality.reasons.map((reason, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-300/80">
                    <span className="h-1 w-1 rounded-full bg-amber-400 shrink-0" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
