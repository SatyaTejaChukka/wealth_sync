import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { haptics } from '../../lib/haptics.js';
import { cn } from '../../lib/utils.js';

const PULL_THRESHOLD = 64;
const MAX_PULL = 90;

export function PullToRefresh({ onRefresh, children, className = '' }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const hasTriggeredHaptic = useRef(false);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    // Only allow pull to refresh when scrolled at the very top
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop <= 1 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
      hasTriggeredHaptic.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Non-linear dampening formula for native elastic pull feel
      const distance = Math.min(MAX_PULL, diff * 0.42);
      setPullDistance(distance);

      if (distance >= PULL_THRESHOLD && !hasTriggeredHaptic.current) {
        haptics.impactMedium();
        hasTriggeredHaptic.current = true;
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(52); // Settle at refresh indicator height

      try {
        if (onRefresh) {
          await onRefresh();
        }
        haptics.notificationSuccess();
      } catch {
        haptics.notificationWarning();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      setPullDistance(0);
    }
  };

  const rotation = Math.min(360, (pullDistance / PULL_THRESHOLD) * 360);

  return (
    <div
      ref={containerRef}
      className={cn('relative min-h-screen', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 pointer-events-none"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? Math.min(1, pullDistance / 40) : 0,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900/95 text-zinc-300 shadow-lg text-xs font-mono">
          <RefreshCw
            size={14}
            className={cn(
              'text-emerald-400 transition-transform duration-100',
              isRefreshing ? 'animate-spin' : ''
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
          <span>{isRefreshing ? 'Syncing...' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>

      {children}
    </div>
  );
}
