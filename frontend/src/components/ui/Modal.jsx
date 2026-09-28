import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-4">
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-fade-in" 
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full flex-col border border-white/10 bg-[#09090b] shadow-[0_-16px_40px_rgba(0,0,0,0.8)] rounded-t-[2rem] md:max-w-lg md:max-h-[90vh] md:rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 p-4 shrink-0 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-white md:h-10 md:w-10 md:rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
