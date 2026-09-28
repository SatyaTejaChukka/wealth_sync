import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function MobileDetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  children,
  className
}) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Touch handlers for swipe-down to dismiss
  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Dismiss if dragged down more than 100px
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Backdrop covering entire screen including bottom nav */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up Sheet */}
      <div
        ref={sheetRef}
        style={{
          transform: isDragging ? `translateY(${currentY}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[60] flex flex-col max-h-[90vh] rounded-t-[2.25rem] border-t border-white/10 bg-[#09090b] shadow-[0_-16px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-slide-up",
          className
        )}
      >
        {/* Touch Handle for Swipe-to-Dismiss */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="w-12 h-1.5 rounded-full bg-zinc-700/80 hover:bg-zinc-600 transition-colors" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-white/5 shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate">{title}</h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content with ample bottom padding to clear gesture bars and bottom nav */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1 overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
