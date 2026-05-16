import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../../lib/utils.js';

export function CollapsibleCard({
  title,
  description,
  defaultOpen = false,
  className,
  headerClassName,
  children,
  actions,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-2xl border border-white/8 bg-black/25 backdrop-blur-lg', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]',
          headerClassName
        )}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {description ? <p className="mt-1 text-xs text-zinc-500">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400">
            <ChevronDown
              size={16}
              className={cn('transition-transform duration-200', open && 'rotate-180')}
            />
          </span>
        </div>
      </button>

      {open ? <div className="border-t border-white/8 px-4 py-4">{children}</div> : null}
    </div>
  );
}
