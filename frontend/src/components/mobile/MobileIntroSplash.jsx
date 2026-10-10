import React, { useEffect, useState, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * MobileIntroSplash - Enterprise Institutional Monogram Reveal
 * Benchmarking top-tier enterprise & financial applications (Mercury, Linear, Apple Wallet).
 * Features a mathematical 3-tier vault monogram assemble, spring curve zoom, and brand reveal.
 */
export function MobileIntroSplash({
  onComplete,
  duration = 1450,
  minDisplayTime = 400,
  force = false,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(() => {
    if (force) return true;
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('wealthsync_intro_shown');
      return !shown;
    }
    return false;
  });

  const [isExiting, setIsExiting] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('wealthsync_intro_shown', 'true');
    }
    // Allow 320ms for hardware-accelerated exit transition
    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) onComplete();
    }, 320);

    return () => clearTimeout(exitTimer);
  }, [isExiting, onComplete]);

  // Main lifecycle timer
  useEffect(() => {
    if (!isVisible) {
      if (onComplete) onComplete();
      return;
    }

    // Allow user tap-to-skip after initial monogram lock-in
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, minDisplayTime);

    // Auto-dismiss sequence
    const exitLeadTime = 320;
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, Math.max(duration - exitLeadTime, minDisplayTime));

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoDismissTimer);
    };
  }, [isVisible, duration, minDisplayTime, handleDismiss, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="WealthSync Loading Screen"
      onClick={() => {
        if (canSkip) handleDismiss();
      }}
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-[#09090b] select-none overflow-hidden cursor-default transition-all duration-300",
        "pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]",
        isExiting && "animate-splash-exit pointer-events-none",
        className
      )}
    >
      {/* 1. Subtle Precision Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-80 h-80 rounded-full bg-emerald-500/[0.05] blur-3xl animate-ambient-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Top Balancer (For vertical visual centering) */}
      <div className="w-full h-8" />

      {/* 2. Central Mathematical Monogram & Brand Reveal */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        {/* Monogram Vector Container */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          {/* Ambient Specular Base Shadow */}
          <div className="absolute -inset-3 bg-emerald-500/10 blur-xl rounded-2xl opacity-60 pointer-events-none" />

          <svg
            viewBox="0 0 32 32"
            fill="none"
            className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]"
            aria-hidden="true"
          >
            {/* Top Diamond: Stark White Apex */}
            <path
              d="M7 10.5L16 6L25 10.5L16 15L7 10.5Z"
              stroke="#f4f4f5"
              strokeWidth="1.85"
              strokeLinejoin="round"
              className="animate-monogram-apex"
            />

            {/* Middle Chevron: Institutional Emerald Yield */}
            <path
              d="M7 16L16 20.5L25 16"
              stroke="#10b981"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-chevron-middle"
            />

            {/* Bottom Chevron: Muted Foundation Slate */}
            <path
              d="M7 21.5L16 26L25 21.5"
              stroke="#71717a"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-chevron-bottom"
            />
          </svg>
        </div>

        {/* Brand Wordmark & Monospace Hierarchy */}
        <div className="mt-7 flex flex-col items-center">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white uppercase tracking-[0.22em] animate-wordmark-reveal">
            WealthSync
          </h1>
          <p className="text-[10px] sm:text-[11px] font-mono tracking-[0.28em] text-zinc-500 uppercase mt-1.5 animate-subtitle-reveal">
            Deterministic Liquidity Engine
          </p>
        </div>
      </div>

      {/* 3. Bottom Institutional Integrity Tag */}
      <div className="relative z-10 animate-security-reveal flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-4 py-1.5 rounded-md border border-white/[0.04] bg-white/[0.02]">
        <Shield size={11} className="text-emerald-500/70" />
        <span>Protected Commitment Ledger</span>
      </div>
    </div>
  );
}
