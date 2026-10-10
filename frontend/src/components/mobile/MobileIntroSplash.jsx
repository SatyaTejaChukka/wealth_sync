import React, { useEffect, useState, useCallback } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * MobileIntroSplash - Enterprise Sequential Monogram & Brand Reveal
 * Sequence:
 * 1. Deep Obsidian canvas & subtle ambient glow
 * 2. Stacking animation of the 3 logo layers (Apex Diamond -> Emerald Chevron -> Slate Chevron)
 * 3. ONLY after logo stack finishes: "WealthSync" title reveals with zoom-in fading animation
 * 4. THEN the accent line & subtitle line below it reveal with zoom-in fading animation
 * 5. Hardware-accelerated exit dissolve
 */
export function MobileIntroSplash({
  onComplete,
  duration = 2800,
  minDisplayTime = 500,
  force = false,
  persist = false,
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

    // Allow user tap-to-skip after initial layer lock-in
    const skipTimer = setTimeout(() => {
      setCanSkip(true);
    }, minDisplayTime);

    if (persist) {
      return () => clearTimeout(skipTimer);
    }

    // Auto-dismiss sequence
    const exitLeadTime = 320;
    const autoDismissTimer = setTimeout(() => {
      handleDismiss();
    }, Math.max(duration - exitLeadTime, minDisplayTime));

    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoDismissTimer);
    };
  }, [isVisible, duration, minDisplayTime, persist, handleDismiss, onComplete]);

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

      {/* Top Spacer for True Visual Centering */}
      <div className="w-full h-8" />

      {/* 2. Central Mathematical Stacking & Zoom Reveal */}
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
            {/* Step 1: Top Diamond (Stark White Apex Drop) */}
            <path
              d="M7 10.5L16 6L25 10.5L16 15L7 10.5Z"
              stroke="#f4f4f5"
              strokeWidth="1.85"
              strokeLinejoin="round"
              className="opacity-0 animate-layer-apex"
            />

            {/* Step 2: Middle Chevron (Institutional Emerald Stack) */}
            <path
              d="M7 16L16 20.5L25 16"
              stroke="#10b981"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0 animate-layer-emerald"
            />

            {/* Step 3: Bottom Chevron (Muted Slate Foundation Stack) */}
            <path
              d="M7 21.5L16 26L25 21.5"
              stroke="#71717a"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-0 animate-layer-slate"
            />
          </svg>
        </div>

        {/* Step 4: Title Reveal (Strictly Hidden at Start; Zooms in and Fades in after Layer Stacking) */}
        <div className="mt-7 flex flex-col items-center">
          <h1 className="opacity-0 font-display text-xl sm:text-2xl font-bold text-white uppercase tracking-[0.24em] animate-title-zoom-fade">
            WealthSync
          </h1>

          {/* Step 5: Accent Hairline & Subtitle Line (Zooms in and Fades in after Title) */}
          <div className="opacity-0 w-12 h-px bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent my-2 animate-line-expand origin-center" />
          
          <p className="opacity-0 text-[10px] sm:text-[11px] font-mono tracking-[0.28em] text-zinc-400 uppercase animate-subtitle-zoom-fade">
            Deterministic Liquidity Engine
          </p>
        </div>
      </div>

      {/* Step 6: Bottom Institutional Integrity Tag */}
      <div className="opacity-0 relative z-10 animate-security-reveal flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-4 py-1.5 rounded-md border border-white/[0.04] bg-white/[0.02]">
        <Shield size={11} className="text-emerald-500/70" />
        <span>Protected Commitment Ledger</span>
      </div>
    </div>
  );
}
