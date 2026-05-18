import React from 'react';
import { AlertTriangle } from 'lucide-react';

import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { cn } from '../../lib/utils.js';

export function ConfirmDialog({
  isOpen,
  title = 'Confirm',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  icon = null,
  onConfirm,
  onCancel,
  isConfirming = false,
}) {
  const Icon = icon || AlertTriangle;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 rounded-xl border p-2',
              variant === 'destructive'
                ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
                : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
            )}
          >
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            {description ? (
              <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isConfirming}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={onConfirm}
            isLoading={isConfirming}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

