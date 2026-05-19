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
  Repeat
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
  { name: 'Bills', href: '/dashboard/bills', icon: FileText },
  { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: Repeat },
  { name: 'Budget', href: '/dashboard/budget', icon: PieChart },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const { logout, user } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-20 px-8 border-b border-white/5">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-all duration-300">
            <TrendingUp className="text-white" size={20} />
          </div>
          <span className="text-2xl font-bold bg-linear-to-r from-white to-white/70 bg-clip-text text-transparent tracking-tight">
            WealthSync
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "text-white shadow-lg shadow-violet-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-0 bg-linear-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/20 rounded-xl" />
                  )}
                  <Icon 
                    size={20} 
                    className={cn(
                      "mr-3 transition-colors duration-300",
                      isActive ? "text-violet-400" : "text-zinc-500 group-hover:text-violet-400"
                    )} 
                  />
                  <span className="relative z-10">{item.name}</span>
                  {isActive && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-white/5">
          <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm flex items-center gap-3">
            {user.avatar_url ? (
              <img 
                src={`${API_ORIGIN}${user.avatar_url}`}
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white">
                {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Signed in as</p>
              <p className="text-sm font-semibold text-white truncate">{user.full_name || user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-xl transition-all duration-300 group"
          >
            <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
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
