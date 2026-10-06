import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Button } from '../components/ui/Button.jsx';
import { MoneyValue } from '../lib/format.js';
import {
  TrendingUp,
  Wallet,
  Zap,
  ShieldCheck,
  ArrowRight,
  Lock,
  CheckCircle2,
  Layers,
  Users,
  Calendar,
  Sparkles,
  ChevronRight,
  CreditCard,
  Clock,
  ArrowUpRight,
  PieChart,
  Bell,
  Check,
  X
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // If user is already authenticated on mobile app, redirect straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-violet-500/30 selection:text-violet-200 overflow-x-hidden relative">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-violet-600/15 rounded-full blur-[100px] sm:blur-[140px]" />
        <div className="absolute top-[40%] -right-20 w-[260px] sm:w-[480px] h-[260px] sm:h-[480px] bg-indigo-600/10 rounded-full blur-[90px] sm:blur-[130px]" />
        <div className="absolute top-[70%] -left-20 w-[240px] sm:w-[400px] h-[240px] sm:h-[400px] bg-cyan-600/10 rounded-full blur-[90px] sm:blur-[120px]" />
        {/* Subtle dot matrix grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />
      </div>

      {/* Top Fixed Mobile-First Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 border border-white/20">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white font-display">WealthSync</span>
              <span className="hidden xs:inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                v2.4
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-zinc-300 hover:text-white px-2.5 sm:px-3 h-8 hover:bg-white/5"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => navigate('/signup')}
              className="h-8 px-3 text-xs font-bold shadow-md shadow-violet-600/25 shrink-0"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Status Beacon Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-inner text-[11px] font-medium text-zinc-300">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-white tracking-wide">LIVE WEALTH INTELLIGENCE</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400 hidden xs:inline">Zero Guesswork</span>
          </div>

          {/* Punchy Hero Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.14] text-white">
            Stop Guessing.{' '}
            <br />
            <span className="bg-gradient-to-r from-violet-300 via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
              Know What's Safe to Spend.
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xs sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed font-normal">
            Your bank balance lies by hiding upcoming rent, power bills, EMIs, and monthly goals. WealthSync ring-fences your committed cash so you always know your exact spend runway.
          </p>

          {/* Mobile-Optimized CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3.5 max-w-sm sm:max-w-none mx-auto w-full">
            <Button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 transition-all duration-300 group"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="surface"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 text-sm font-semibold rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-200"
            >
              <span>Sign In to Account</span>
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="pt-2 flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Private & Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Live Bill Auto-Fetch
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Zero Ad Selling
            </span>
          </div>
        </div>

        {/* The Live Engine Mobile Interactive Card Preview (The Jewel) */}
        <div className="mt-8 sm:mt-14 max-w-xl mx-auto">
          <div className="relative rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-b from-zinc-900/80 via-zinc-900/40 to-black/80 p-4 sm:p-6 backdrop-blur-2xl card-specular shadow-2xl">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  LIVE SPEND RUNWAY
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Protected Floor Active
              </span>
            </div>

            {/* Central Safe-to-Spend Balance Display */}
            <div className="py-4 sm:py-5 text-center">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Safe to Spend Right Now</span>
              <div className="mt-1 flex items-center justify-center">
                <MoneyValue
                  value={48250}
                  className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display drop-shadow-[0_0_20px_rgba(139,92,246,0.35)]"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Calculated after ₹21,750 committed bills & goals
              </p>
            </div>

            {/* Proportional Distribution Bar */}
            <div className="space-y-1.5">
              <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-black/50 border border-white/[0.06] p-0.5 gap-0.5">
                <div className="h-full rounded-l-full bg-violet-500 shadow-sm" style={{ width: '60%' }} title="Safe to Spend: 60%" />
                <div className="h-full bg-amber-500 shadow-sm" style={{ width: '25%' }} title="Committed Bills: 25%" />
                <div className="h-full rounded-r-full bg-cyan-500 shadow-sm" style={{ width: '15%' }} title="Goal Reserve: 15%" />
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 px-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" /> Safe Spend (60%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Bills (25%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Goals (15%)
                </span>
              </div>
            </div>

            {/* 3 Metric Mini-Deck */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.05] text-center">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Committed</span>
                <MoneyValue value={21750} className="text-xs sm:text-sm font-bold text-amber-300 font-display mt-0.5" />
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.05] text-center">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Goal Vault</span>
                <MoneyValue value={15000} className="text-xs sm:text-sm font-bold text-cyan-300 font-display mt-0.5" />
              </div>
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.05] text-center">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Cash Runway</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 font-display mt-0.5 block">24 Days</span>
              </div>
            </div>

            {/* Simulated Live Event Alert */}
            <div className="mt-3.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap className="w-3.5 h-3.5 fill-amber-400/30" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate text-[11px] sm:text-xs">
                    APSPDCL Electricity Bill
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">₹1,420 due in 3 days • Auto-tracked</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-md shrink-0">
                Tracked
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Pillars */}
      <section className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400 font-mono">
            ENGINE ARCHITECTURE
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Designed for Financial Clarity
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Four specialized engines working in unison to eliminate cash anxiety.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
          {/* Card 1: Safe-to-Spend Runway */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 sm:p-6 card-specular hover:border-violet-500/30 transition-all duration-300">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-3.5 shadow-sm shadow-violet-500/20">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Safe-to-Spend Runway</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Dynamic
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Dynamically deducts upcoming bills, subscriptions, loan EMIs, and monthly savings goals from your account balance before you swipe.
            </p>
          </div>

          {/* Card 2: Electricity & Bill Radar */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 sm:p-6 card-specular hover:border-amber-500/30 transition-all duration-300">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3.5 shadow-sm shadow-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Live Electricity & Bill Radar</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Auto-Fetch
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect your state electricity provider with your service number. WealthSync automatically polls monthly bills, monitors units, and alerts before due dates.
            </p>
          </div>

          {/* Card 3: P2P Lending & Debt Ledger */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 sm:p-6 card-specular hover:border-emerald-500/30 transition-all duration-300">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3.5 shadow-sm shadow-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">P2P Lending & Loan Ledger</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Track money lent to friends, repayment timelines, interest calculations, and bank loan amortization schedules in one secure ledger.
            </p>
          </div>

          {/* Card 4: Salary Rule Engine */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-4 sm:p-6 card-specular hover:border-cyan-500/30 transition-all duration-300">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3.5 shadow-sm shadow-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Salary Rule Engine</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Deterministic
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Rule-based engine automatically breaks down monthly salary into commitments, planned budgets, and prioritized goal buckets the second income arrives.
            </p>
          </div>
        </div>
      </section>

      {/* Comparative Reality Check: Bank App vs WealthSync */}
      <section className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-linear-to-b from-zinc-900/50 via-zinc-900/30 to-black/60 p-5 sm:p-8 card-specular">
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Why Bank Apps Fail You</h2>
            <p className="text-xs text-zinc-400">Traditional banks show what you have; WealthSync shows what you can afford.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* The Old Way */}
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wide">
                <X className="w-4 h-4" />
                <span>Standard Bank Account</span>
              </div>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Shows total balance including money committed to bills.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>Surprise bill auto-debits that wipe out unexpected cash.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>No visibility into money lent or personal loans.</span>
                </li>
              </ul>
            </div>

            {/* The WealthSync Way */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                <Check className="w-4 h-4" />
                <span>With WealthSync Engine</span>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>True Safe-to-Spend runway updated in real time.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Upcoming rent & electricity bills ring-fenced in advance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Single unified view of cash, loans, goals, and bills.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Simple Steps */}
      <section className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-8 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400 font-mono">ONBOARDING FLOW</span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Up and Running in 60 Seconds</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 card-specular space-y-2 text-center sm:text-left">
            <span className="text-xl font-extrabold text-violet-400 font-mono">01</span>
            <h3 className="text-sm font-bold text-white">Log or Link Accounts</h3>
            <p className="text-xs text-zinc-400">Add transactions, recurring subscriptions, and state power connections.</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 card-specular space-y-2 text-center sm:text-left">
            <span className="text-xl font-extrabold text-indigo-400 font-mono">02</span>
            <h3 className="text-sm font-bold text-white">Engine Locks Commitments</h3>
            <p className="text-xs text-zinc-400">Bills and monthly savings floors are automatically protected from spending.</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/5 card-specular space-y-2 text-center sm:text-left">
            <span className="text-xl font-extrabold text-cyan-400 font-mono">03</span>
            <h3 className="text-sm font-bold text-white">Spend With Peace of Mind</h3>
            <p className="text-xs text-zinc-400">Check your Safe-to-Spend runway before every purchase with 100% confidence.</p>
          </div>
        </div>
      </section>

      {/* Final Call to Action Card */}
      <section className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="rounded-2xl sm:rounded-3xl border border-violet-500/20 bg-linear-to-b from-violet-950/40 via-zinc-900/60 to-black p-6 sm:p-10 text-center space-y-4 card-specular relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-violet-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Take Control of Your Cash Flow
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Join WealthSync today and experience real financial clarity on your mobile device.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 max-w-xs sm:max-w-none mx-auto">
            <Button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto h-11 px-7 text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 shadow-xl shadow-white/10 rounded-xl"
            >
              Create Free Account
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto h-11 px-6 text-sm font-semibold border-zinc-700 hover:bg-zinc-800 text-white rounded-xl"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-6 sm:py-8 px-4 sm:px-6 border-t border-white/5 text-center text-xs text-zinc-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-zinc-300">WealthSync</span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Native Personal Wealth & Cash Flow Intelligence • © 2026 WealthSync. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
