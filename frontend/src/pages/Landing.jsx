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
  Layers,
  Users,
  Calendar,
  CreditCard,
  Clock,
  ArrowUpRight,
  PieChart,
  Check,
  X,
  Database,
  Server,
  FileText,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // If user is already authenticated on mobile app or web, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white overflow-x-hidden relative">
      {/* Precision background grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
      </div>

      {/* Top Fixed Institutional Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/85 backdrop-blur-md border-b border-zinc-800/80 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-700/80 shadow-inner">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white font-display">
                WealthSync
              </span>
              <span className="text-[10px] font-mono font-medium tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
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
              className="text-xs font-semibold text-zinc-300 hover:text-white px-3 h-8 rounded-lg hover:bg-zinc-800/60"
            >
              Sign In
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/signup')}
              className="h-8 px-3.5 text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg shrink-0 transition-colors shadow-sm"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Status Indicator Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            <span className="flex h-2 w-2 relative">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-white tracking-wide">DETERMINISTIC CASH FLOW ENGINE</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 hidden xs:inline">Self-Hosted & Private</span>
          </div>

          {/* Institutional Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.12] text-white font-display">
            Calculate True Liquid Runway.
            <br />
            <span className="text-zinc-400">
              Isolate Obligations in Real Time.
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xs sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Bank account balances conceal pending rent, upcoming electricity bills, scheduled loan EMIs, and monthly reserve targets. WealthSync ring-fences non-discretionary commitments so you always know your exact safe-to-spend liquidity.
          </p>

          {/* Structured CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm sm:max-w-none mx-auto w-full">
            <Button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto h-11 sm:h-12 px-7 sm:px-8 text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg shadow-sm transition-all group"
            >
              <span>Initialize Workspace</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 text-sm font-semibold rounded-lg border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200"
            >
              <span>Access Existing Account</span>
            </Button>
          </div>

          {/* Security & Architecture Guarantees */}
          <div className="pt-2 flex items-center justify-center gap-4 sm:gap-8 text-[11px] text-zinc-400 flex-wrap font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Local Encryption
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-zinc-300" />
              Zero Telemetry / No Ads
            </span>
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-zinc-300" />
              PostgreSQL & Docker Ready
            </span>
          </div>
        </div>

        {/* The Live Engine Interactive Card Preview */}
        <div className="mt-8 sm:mt-14 max-w-xl mx-auto">
          <div className="relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  LIQUID RUNWAY CALCULATION
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Floor Active
              </span>
            </div>

            {/* Central Safe-to-Spend Balance Display */}
            <div className="py-4 sm:py-5 text-center">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium font-mono">
                Safe to Spend Right Now
              </span>
              <div className="mt-1 flex items-center justify-center">
                <MoneyValue
                  value={48250}
                  className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                Formula: ₹70,000 Liquid - (₹15,000 Bills + ₹6,750 Debt)
              </p>
            </div>

            {/* Proportional Distribution Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-md overflow-hidden flex bg-zinc-950 border border-zinc-800 p-0.5 gap-0.5">
                <div className="h-full bg-emerald-500 rounded-sm" style={{ width: '60%' }} title="Safe to Spend: 60%" />
                <div className="h-full bg-amber-500 rounded-sm" style={{ width: '25%' }} title="Committed Bills: 25%" />
                <div className="h-full bg-cyan-500 rounded-sm" style={{ width: '15%' }} title="Reserve Vaults: 15%" />
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 px-0.5 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500" /> Safe Spend (60%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-sm bg-amber-500" /> Bills (25%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-sm bg-cyan-500" /> Goals (15%)
                </span>
              </div>
            </div>

            {/* 3 Metric Mini-Deck */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Committed</span>
                <MoneyValue value={21750} className="text-xs sm:text-sm font-bold text-amber-300 font-display mt-0.5" />
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Goal Vault</span>
                <MoneyValue value={15000} className="text-xs sm:text-sm font-bold text-cyan-300 font-display mt-0.5" />
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-center">
                <span className="text-[10px] text-zinc-500 block uppercase font-mono">Cash Runway</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 font-display mt-0.5 block">24 Days</span>
              </div>
            </div>

            {/* Scheduled Obligation Alert */}
            <div className="mt-3.5 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate text-[11px] sm:text-xs">
                    State Power Distribution Utility
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">₹1,420 due in 3 days. Ring-fenced in ledger.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 shrink-0">
                Protected
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Engines */}
      <section className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto border-t border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
            CORE ENGINES
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Functional Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Four specialized subsystems designed for exact ledger verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* Card 1: Safe-to-Spend Runway */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 hover:border-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 mb-3 border border-zinc-700/80">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Safe-to-Spend Calculator</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                Arithmetic
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Deducts upcoming utility bills, active subscriptions, scheduled debt amortizations, and savings reserves from your liquid balances before expenses occur.
            </p>
          </div>

          {/* Card 2: Electricity & Bill Radar */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 hover:border-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 mb-3 border border-zinc-700/80">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Utility Bill & Electricity Radar</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                Scheduled
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Track state electricity connections, consumer identification numbers, monthly bill cycles, and unit metrics with deterministic payment due alerts.
            </p>
          </div>

          {/* Card 3: P2P Lending & Debt Ledger */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 hover:border-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 mb-3 border border-zinc-700/80">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Bilateral Lending & Debt Ledger</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                Audit Trail
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Maintains bilateral debt logs for personal loans, money lent to associates, interest formulas, and installment tracking with zero third-party visibility.
            </p>
          </div>

          {/* Card 4: Salary Rule Engine */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6 hover:border-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 mb-3 border border-zinc-700/80">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-sm sm:text-base font-bold text-white">Deterministic Allocation Engine</h3>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                Rules
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Configurable split rules partition incoming deposits into fixed obligations, discretionary allowances, and emergency reserves automatically upon receipt.
            </p>
          </div>
        </div>
      </section>

      {/* Comparative Matrix: Standard Bank Balances vs WealthSync */}
      <section className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 sm:p-8">
          <div className="text-center mb-6 space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              Why Raw Account Balances Mislead
            </h2>
            <p className="text-xs text-zinc-400">
              Commercial banking interfaces report aggregate balances without obligation deduction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Standard Bank Account */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wide">
                <X className="w-4 h-4" />
                <span>Commercial Bank Interface</span>
              </div>
              <ul className="space-y-2 text-xs text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Displays unallocated total balance without accounting for unbilled commitments.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>Auto-debits hit unexpectedly, disrupting cash flow planning.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>No ledger tracking for informal loans or peer-to-peer receivables.</span>
                </li>
              </ul>
            </div>

            {/* WealthSync */}
            <div className="p-4 rounded-lg bg-zinc-950 border border-emerald-950/60 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wide">
                <Check className="w-4 h-4" />
                <span>WealthSync Ledger Engine</span>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Calculates actual safe-to-spend liquidity in real time.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Scheduled rent, utility bills, and loan EMIs are locked in advance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>Unified tracking of liquid capital, debts, savings, and expenses.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment & Workflow Steps */}
      <section className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 max-w-4xl mx-auto border-t border-zinc-800/80">
        <div className="text-center mb-8 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
            GETTING STARTED
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
            Operational Setup
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-2">
            <span className="text-sm font-bold text-zinc-400 font-mono">STEP 01</span>
            <h3 className="text-sm font-bold text-white">Record Balance & Accounts</h3>
            <p className="text-xs text-zinc-400">Establish base ledger balances, income sources, and discretionary categories.</p>
          </div>
          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-2">
            <span className="text-sm font-bold text-zinc-400 font-mono">STEP 02</span>
            <h3 className="text-sm font-bold text-white">Configure Obligations</h3>
            <p className="text-xs text-zinc-400">Specify recurring rent, loan amortization schedules, and utility connections.</p>
          </div>
          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-800 space-y-2">
            <span className="text-sm font-bold text-zinc-400 font-mono">STEP 03</span>
            <h3 className="text-sm font-bold text-white">Monitor Runway</h3>
            <p className="text-xs text-zinc-400">Inspect the Safe-to-Spend indicator prior to discretionary disbursements.</p>
          </div>
        </div>
      </section>

      {/* Final Action Call */}
      <section className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-10 text-center space-y-4">
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-white">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Deploy Your Financial Ledger
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Run on your private server, native mobile device, or local Docker container.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 max-w-xs sm:max-w-none mx-auto">
            <Button
              onClick={() => navigate('/signup')}
              className="w-full sm:w-auto h-11 px-7 text-sm font-bold bg-white text-zinc-950 hover:bg-zinc-200 rounded-lg shadow-sm"
            >
              Create Account
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto h-11 px-6 text-sm font-semibold border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Institutional Legal & Product Footer */}
      <footer className="relative z-10 py-8 px-4 sm:px-6 border-t border-zinc-800/80 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="font-bold text-zinc-300">WealthSync Engine</span>
            <span className="text-zinc-600">|</span>
            <span className="text-[11px] text-zinc-500">Self-Hosted Personal Wealth Intelligence</span>
          </div>

          {/* Legal Navigation Links */}
          <div className="flex items-center gap-5 text-xs text-zinc-400">
            <button
              onClick={() => navigate('/privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="hover:text-white transition-colors"
            >
              Terms & Conditions
            </button>
            <button
              onClick={() => navigate('/login')}
              className="hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="hover:text-white transition-colors"
            >
              Register
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-zinc-900 text-center sm:text-left text-[11px] text-zinc-600">
          Copyright 2026 WealthSync. Open-source personal cash flow software. All calculation engines run locally or on user-controlled infrastructure.
        </div>
      </footer>
    </div>
  );
}
