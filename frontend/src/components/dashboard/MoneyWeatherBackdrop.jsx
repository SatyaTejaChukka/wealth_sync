import React, { useMemo } from 'react';

import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import { calculateSafeBudgetSignal } from '../../lib/safeBudgetSignal.js';
import { cn } from '../../lib/utils.js';

const WEATHER_STATE = {
  calm: {
    title: 'Calm',
    gradient:
      'radial-gradient(circle at 20% 25%, rgba(16, 185, 129, 0.2), transparent 55%), radial-gradient(circle at 80% 15%, rgba(59, 130, 246, 0.14), transparent 50%)',
    mist: 'bg-emerald-400/12',
    accent: 'shadow-emerald-400/30',
  },
  balanced: {
    title: 'Balanced',
    gradient:
      'radial-gradient(circle at 18% 20%, rgba(245, 158, 11, 0.16), transparent 50%), radial-gradient(circle at 78% 20%, rgba(59, 130, 246, 0.16), transparent 52%)',
    mist: 'bg-amber-400/12',
    accent: 'shadow-amber-400/25',
  },
  cautious: {
    title: 'Cautious',
    gradient:
      'radial-gradient(circle at 15% 25%, rgba(239, 68, 68, 0.18), transparent 55%), radial-gradient(circle at 80% 12%, rgba(245, 158, 11, 0.12), transparent 52%)',
    mist: 'bg-rose-400/12',
    accent: 'shadow-rose-400/25',
  },
};

function resolveWeatherState(stats) {
  return calculateSafeBudgetSignal(stats || {}).weatherState;
}

export function MoneyWeatherBackdrop({ stats }) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const stateKey = useMemo(() => resolveWeatherState(stats), [stats]);
  const palette = WEATHER_STATE[stateKey];
  const particleCount = isMobile ? 8 : 16;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-90 transition-all duration-700"
        style={{ backgroundImage: palette.gradient }}
      />

      <div
        className={cn(
          'absolute -left-20 top-16 h-56 w-56 rounded-full blur-[90px] animate-money-weather-drift',
          palette.mist
        )}
      />
      <div
        className={cn(
          'absolute -right-12 bottom-24 h-72 w-72 rounded-full blur-[110px] animate-money-weather-drift-reverse',
          palette.mist
        )}
      />



      {Array.from({ length: particleCount }).map((_, index) => {
        const delay = (index % 8) * 0.45;
        const duration = 8 + (index % 5) * 1.4;
        const left = 5 + (index * 6.3) % 90;
        const size = 2 + (index % 4);

        return (
          <span
            // Particles are decorative and intentionally pseudo-random for ambient movement.
            key={`particle-${index}`}
            className={cn('absolute rounded-full bg-white/20 shadow-sm', palette.accent)}
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              bottom: '-8%',
              animationName: 'money-weather-rise',
              animationDuration: `${duration}s`,
              animationTimingFunction: 'linear',
              animationDelay: `${delay}s`,
              animationIterationCount: 'infinite',
              opacity: 0.45,
            }}
          />
        );
      })}
    </div>
  );
}

