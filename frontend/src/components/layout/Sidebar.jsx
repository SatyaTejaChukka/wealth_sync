import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth.jsx';
import { cn } from '../../lib/utils';
import { API_ORIGIN } from '../../lib/api.js';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Settings,
  LogOut,
  TrendingUp,
  BarChart3,
  FileText,
  Repeat,
  Landmark,
  HandCoins,
  Calendar
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
  { name: 'Bills', href: '/dashboard/bills', icon: FileText },
  { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: Repeat },
  { name: 'Loans & EMIs', href: '/dashboard/loans', icon: Landmark },
  { name: 'Lent Tracker', href: '/dashboard/lent', icon: HandCoins },
  { name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { name: 'Budget', href: '/dashboard/budget', icon: PieChart },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const { logout, user } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Brand Header */}
      <div className="flex items-center h-16 px-5 border-b border-zinc-800/80 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-emerald-400 shadow-inner group-hover:border-zinc-600 transition-colors">
            <TrendingUp size={18} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white tracking-tight font-display">
              WealthSync
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
              v2.4
            </span>
          </div>
        </Link>
      </div>

      {/* Modern, Sleek Navigation with subtle scrollbar */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto modern-scrollbar">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-colors group relative",
                  isActive
                    ? "bg-zinc-800/80 border border-zinc-700/70 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon 
                    size={18} 
                    className={cn(
                      "mr-3 shrink-0 transition-colors",
                      isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                    )} 
                  />
                  <span className="relative z-10 truncate">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)] shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Deck */}
      {user && (
        <div className="p-3 border-t border-zinc-800/80 shrink-0">
          <div className="mb-2 p-2.5 rounded-lg bg-zinc-900/70 border border-zinc-800/80 flex items-center gap-2.5">
            {user.avatar_url ? (
              <img 
                src={`${API_ORIGIN}${user.avatar_url}`}
                alt="Avatar"
                className="w-8 h-8 rounded-md object-cover border border-zinc-700 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Account</p>
              <p className="text-xs font-semibold text-white truncate">{user.full_name || user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-rose-300 bg-zinc-900/40 hover:bg-rose-500/10 hover:border-rose-500/20 border border-zinc-800/60 rounded-lg transition-colors group cursor-pointer"
          >
            <LogOut size={14} className="group-hover:text-rose-400 transition-colors" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 bg-[#09090b]/50 backdrop-blur-xl border-r border-white/5 z-20">
      {sidebarContent}
    </div>
  );
}
