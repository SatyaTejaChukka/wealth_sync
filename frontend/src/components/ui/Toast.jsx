/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let toastId = 0;

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    icon: 'text-red-400',
    bar: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    icon: 'text-amber-400',
    bar: 'bg-amber-500',
  },
  info: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    icon: 'text-blue-400',
    bar: 'bg-blue-500',
  },
};

function Toast({ toast, onDismiss }) {
  const style = styles[toast.type] || styles.info;
  const Icon = icons[toast.type] || Info;

  return (
    <div
      className={`
        relative overflow-hidden
        w-[380px] max-w-[calc(100vw-2rem)]
        ${style.border} border
        bg-zinc-900/95 backdrop-blur-xl
        rounded-xl shadow-2xl shadow-black/40
        p-4 pr-10
        animate-toast-in
      `}
      role="alert"
    >
      <div className="flex gap-3 items-start">
        <div className={`${style.bg} ${style.icon} p-1.5 rounded-lg shrink-0 mt-0.5`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-sm font-semibold text-white mb-0.5">{toast.title}</p>
          )}
          <p className="text-sm text-zinc-400 leading-relaxed">{toast.message}</p>
        </div>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute top-3 right-3 text-zinc-600 hover:text-zinc-300 transition-colors"
      >
        <X size={14} />
      </button>

      {/* Auto-dismiss progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800">
        <div
          className={`h-full ${style.bar} opacity-60`}
          style={{
            animation: `toast-progress ${toast.duration || 4000}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutMapRef = useRef(new Map());
  const recentSignatureRef = useRef(null);

  const dismiss = useCallback((id) => {
    const timeoutId = timeoutMapRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const signature = `${type}::${title || ''}::${message || ''}`;
    if (recentSignatureRef.current === signature) {
      return null;
    }
    recentSignatureRef.current = signature;
    setTimeout(() => {
      if (recentSignatureRef.current === signature) {
        recentSignatureRef.current = null;
      }
    }, 600);

    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, message, duration }].slice(-5));
    const timeoutId = setTimeout(() => dismiss(id), duration);
    timeoutMapRef.current.set(id, timeoutId);
    return id;
  }, [dismiss]);

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current;
    return () => {
      timeoutMap.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutMap.clear();
    };
  }, []);

  const toast = React.useMemo(() => ({
    success: (message, title) => addToast({ type: 'success', title, message }),
    error: (message, title) => addToast({ type: 'error', title, message, duration: 6000 }),
    warning: (message, title) => addToast({ type: 'warning', title, message }),
    info: (message, title) => addToast({ type: 'info', title, message }),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container: fixed bottom-right */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] flex flex-col gap-3 pointer-events-auto items-center sm:items-end">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
