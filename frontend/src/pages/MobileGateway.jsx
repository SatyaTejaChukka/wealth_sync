import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  ShieldCheck, 
  CalendarClock, 
  Lock, 
  ArrowRight, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

const SLIDES = [
  {
    id: 'liquidity',
    badge: 'TRUE SAFE-TO-SPEND',
    badgeIcon: ShieldCheck,
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    title: 'Deterministic Liquidity',
    description: 'Eliminate cash flow guesswork. WealthSync mathematically ring-fences scheduled obligations, debt, and buffer reserves before computing discretionary spend.',
    schematic: {
      title: 'Real-Time Liquidity Breakdown',
      rows: [
        { label: 'Liquid Cash Balance', value: '$14,250.00', sign: '+' },
        { label: 'Scheduled Obligations', value: '$4,820.00', sign: '−', highlight: 'text-red-400' },
        { label: 'Liquidity Buffer Target', value: '$2,000.00', sign: '−', highlight: 'text-amber-400' },
      ],
      result: {
        label: 'True Safe-to-Spend',
        value: '$7,430.00',
        status: 'VERIFIED'
      }
    }
  },
  {
    id: 'cascade',
    badge: 'ZERO COLLISION TIMELINE',
    badgeIcon: CalendarClock,
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    title: 'Automated Obligation Cascade',
    description: 'Synchronize recurring bills, subscription renewals, and debt amortization onto an immutable calendar horizon so commitments never collide.',
    schematic: {
      title: 'Next 14 Days Outflow Horizon',
      items: [
        { date: 'OCT 15', name: 'Commercial Mortgage Note', amount: '$2,400.00', tag: 'LOCKED', tagStyle: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
        { date: 'OCT 18', name: 'Tier-1 Cloud Infrastructure', amount: '$380.00', tag: 'SYNCED', tagStyle: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' },
        { date: 'OCT 22', name: 'Executive Equipment Lease', amount: '$640.00', tag: 'QUEUED', tagStyle: 'border-zinc-700 text-zinc-400 bg-zinc-800/40' },
      ]
    }
  },
  {
    id: 'ledger',
    badge: 'PRIVATE COMMITMENT LEDGER',
    badgeIcon: Lock,
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    title: 'Protected Peer Ledger',
    description: 'Ring-fence bilateral lending, promissory repayments, and counterpart receivables with audit-ready recovery status and zero float leakage.',
    schematic: {
      title: 'Counterpart Lending Position',
      stats: [
        { label: 'Principal Extended', value: '$8,500.00' },
        { label: 'Recovered to Date', value: '$5,200.00' },
      ],
      active: { label: 'Net Active Receivables', value: '$3,300.00' },
      progress: 61
    }
  }
];

export default function MobileGateway() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Touch swipe handling
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 45;
    if (touchDeltaX.current < -swipeThreshold) {
      nextSlide();
    } else if (touchDeltaX.current > swipeThreshold) {
      prevSlide();
    }
    // Resume auto-advance after brief delay
    setTimeout(() => setIsPaused(false), 2000);
  };

  const activeSlideData = SLIDES[currentSlide];
  const BadgeIcon = activeSlideData.badgeIcon;

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between selection:bg-emerald-500/30 overflow-x-hidden relative">
      {/* 1. Ambient Background Grid & Specular Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-emerald-500/[0.06] rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff06_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* 2. Top Monogram & Brand Header */}
      <header className="pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] px-6 relative z-10 flex flex-col items-center text-center">
        {/* Bespoke 3-Tier Monogram */}
        <div className="relative w-12 h-12 flex items-center justify-center mb-2.5">
          <div className="absolute -inset-2 bg-emerald-500/10 blur-xl rounded-xl opacity-75 pointer-events-none" />
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" aria-hidden="true">
            <path d="M7 10.5L16 6L25 10.5L16 15L7 10.5Z" stroke="#f4f4f5" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M7 16L16 20.5L25 16" stroke="#10b981" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 21.5L16 26L25 21.5" stroke="#71717a" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-[0.24em] text-white">
          WealthSync
        </h1>
        <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.26em] text-zinc-500 uppercase mt-0.5">
          Deterministic Liquidity Engine
        </p>
      </header>

      {/* 3. Interactive Feature Carousel */}
      <main 
        className="flex-1 flex flex-col justify-center px-5 sm:px-6 py-4 relative z-10 max-w-md w-full mx-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative flex flex-col">
          {/* Status Badge */}
          <div className="flex items-center justify-center mb-3">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-[10px] sm:text-[11px] font-medium tracking-wider uppercase transition-colors duration-300",
              activeSlideData.badgeColor
            )}>
              <BadgeIcon size={12} />
              <span>{activeSlideData.badge}</span>
            </div>
          </div>

          {/* Slide Heading & Description */}
          <div className="text-center min-h-[96px] mb-3 transition-opacity duration-300">
            <h2 className="text-lg sm:text-xl font-display font-semibold text-white tracking-tight mb-1.5">
              {activeSlideData.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed max-w-xs mx-auto">
              {activeSlideData.description}
            </p>
          </div>

          {/* Visual Schematic Demonstration Card */}
          <div className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm min-h-[168px] flex flex-col justify-between transition-all duration-300">
            {/* Slide 1: Safe-to-Spend Computation */}
            {activeSlideData.id === 'liquidity' && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 pb-1 border-b border-zinc-800/60 flex items-center justify-between">
                  <span>{activeSlideData.schematic.title}</span>
                  <span className="text-emerald-400">LEDGER-BALANCED</span>
                </div>
                <div className="space-y-1 text-xs">
                  {activeSlideData.schematic.rows.map((r, i) => (
                    <div key={i} className="flex justify-between items-center text-zinc-400">
                      <span className="text-[11px]">{r.label}</span>
                      <span className={cn("font-mono tnum font-medium", r.highlight || "text-zinc-200")}>
                        {r.sign} {r.value.replace(/^[+-]\s*/, '')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">{activeSlideData.schematic.result.label}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      {activeSlideData.schematic.result.status}
                    </span>
                  </div>
                  <span className="font-mono tnum text-base font-bold text-emerald-400">
                    {activeSlideData.schematic.result.value}
                  </span>
                </div>
              </div>
            )}

            {/* Slide 2: Outflow Horizon */}
            {activeSlideData.id === 'cascade' && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 pb-1 border-b border-zinc-800/60 flex items-center justify-between">
                  <span>{activeSlideData.schematic.title}</span>
                  <span className="text-cyan-400">NO OVERDRAFTS</span>
                </div>
                <div className="space-y-1.5">
                  {activeSlideData.schematic.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                        <span className="font-mono text-[10px] text-zinc-500 w-11 shrink-0">{item.date}</span>
                        <span className="text-[11px] text-zinc-200 font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono tnum text-xs text-white font-medium">{item.amount}</span>
                        <span className={cn("text-[9px] font-mono px-1 py-0.5 rounded border", item.tagStyle)}>
                          {item.tag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slide 3: Peer Lending Ledger */}
            {activeSlideData.id === 'ledger' && (
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 pb-1 border-b border-zinc-800/60 flex items-center justify-between">
                  <span>{activeSlideData.schematic.title}</span>
                  <span className="text-amber-400">PROMISSORY TRACKED</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {activeSlideData.schematic.stats.map((s, i) => (
                    <div key={i} className="bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-800/50">
                      <span className="text-[10px] text-zinc-500 block leading-tight">{s.label}</span>
                      <span className="font-mono tnum text-xs text-zinc-200 font-medium mt-0.5 block">{s.value}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[11px] text-zinc-400">{activeSlideData.schematic.active.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono tnum text-xs font-semibold text-amber-400">
                        {activeSlideData.schematic.active.value}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">
                        ({activeSlideData.schematic.progress}% Rec.)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-950/90 rounded-sm h-1.5 overflow-hidden border border-zinc-800/60">
                    <div className="bg-amber-400 h-full rounded-sm" style={{ width: `${activeSlideData.schematic.progress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Structured Carousel Indicators */}
          <div className="flex items-center justify-between mt-3 px-1">
            <button
              type="button"
              onClick={prevSlide}
              aria-label="Previous slide"
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5">
              {SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={cn(
                    "h-1 rounded-sm transition-all duration-300 cursor-pointer",
                    idx === currentSlide
                      ? "w-7 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "w-2.5 bg-zinc-800 hover:bg-zinc-700"
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={nextSlide}
              aria-label="Next slide"
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </main>

      {/* 4. Action Buttons (Touch Ergonomics) */}
      <footer className="px-6 pb-2 pt-2 relative z-10 flex flex-col gap-2.5 w-full max-w-md mx-auto">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.22)] transition-all cursor-pointer"
        >
          <span>Sign In to Workspace</span>
          <ArrowRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => navigate('/signup')}
          className="w-full h-12 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 active:scale-[0.98] text-zinc-200 hover:text-white font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles size={15} className="text-emerald-400" />
          <span>Create Account</span>
        </button>

        {/* 5. Institutional Trust & Legal Micro-Footer */}
        <div className="pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
            <Shield size={11} className="text-emerald-500/70" />
            <span>Protected Commitment Ledger</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <span className="text-zinc-700 text-xs">·</span>
            <Link to="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
