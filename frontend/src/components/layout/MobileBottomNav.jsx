import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  PieChart,
  Repeat,
  Settings,
  Target,
  X,
  Receipt,
  Landmark,
  HandCoins,
} from 'lucide-react';

import { useAuth } from '../../lib/auth.jsx';
import { cn } from '../../lib/utils.js';

const primaryItems = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Activity', href: '/dashboard/transactions', icon: Receipt },
  { label: 'Budget', href: '/dashboard/budget', icon: PieChart },
  { label: 'Goals', href: '/dashboard/goals', icon: Target },
];

const moreItems = [
  { label: 'Bills', href: '/dashboard/bills', icon: FileText },
  { label: 'Subscriptions', href: '/dashboard/subscriptions', icon: Repeat },
  { label: 'Loans', href: '/dashboard/loans', icon: Landmark },
  { label: 'Lent Tracker', href: '/dashboard/lent', icon: HandCoins },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = useMemo(
    () => moreItems.some((item) => location.pathname.startsWith(item.href)),
    [location.pathname]
  );

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close more menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-[1.75rem] border-t border-white/10 bg-[#09090b]/95 px-4 pb-6 pt-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">More</p>
                <p className="text-xs text-zinc-500">Open the rest of your workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-24 flex-col justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                        isActive
                          ? 'border-violet-400/45 bg-violet-500/12 text-white'
                          : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/8'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'inline-flex h-10 w-10 items-center justify-center rounded-xl border',
                            isActive
                              ? 'border-violet-400/35 bg-violet-500/15 text-violet-200'
                              : 'border-white/10 bg-black/20 text-zinc-400'
                          )}
                        >
                          <Icon size={18} />
                        </span>
                        <span className="text-sm font-medium">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-zinc-200 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#09090b]/92 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-2 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md items-end justify-between gap-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-medium transition-colors',
                    isActive
                      ? 'bg-violet-500/14 text-white'
                      : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} className={isActive ? 'text-violet-300' : undefined} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-medium transition-colors',
              moreActive
                ? 'bg-violet-500/14 text-white'
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
            )}
          >
            <MoreHorizontal size={18} className={moreActive ? 'text-violet-300' : undefined} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
