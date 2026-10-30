import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { AlertCircle, RefreshCw, Server, CheckCircle2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api.js';

export function BackendLiveStatus({ className = '' }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'operational' | 'waking'
  const [countdown, setCountdown] = useState(5);
  const countdownIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const checkHealth = useCallback(async () => {
    if (!isMountedRef.current) return;
    setStatus('checking');

    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    const healthUrl = cleanBase.endsWith('/health') ? cleanBase : `${cleanBase}/health`;

    try {
      const response = await axios.get(healthUrl, { timeout: 8000 });
      if (!isMountedRef.current) return;

      if (response.status === 200 && response.data?.status === 'ok') {
        setStatus('operational');
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      } else {
        triggerWakingState();
      }
    } catch {
      if (isMountedRef.current) {
        triggerWakingState();
      }
    }
  }, []);

  const triggerWakingState = useCallback(() => {
    setStatus('waking');
    setCountdown(5);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          checkHealth();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
  }, [checkHealth]);

  useEffect(() => {
    isMountedRef.current = true;
    checkHealth();

    return () => {
      isMountedRef.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [checkHealth]);

  const handleManualRetry = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    checkHealth();
  };

  if (status === 'operational') {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium select-none ${className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Cloud Services Operational</span>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs font-mono select-none ${className}`}>
        <RefreshCw size={12} className="animate-spin text-zinc-400" />
        <span>Checking backend status...</span>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left ${className}`}>
      <div className="flex items-start gap-2.5">
        <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white">Backend Connecting</p>
          <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
            The server may be waking up from cold sleep. Auto-retrying in {countdown}s.
          </p>
        </div>
        <button
          type="button"
          onClick={handleManualRetry}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 active:scale-95 transition-all text-xs font-medium shrink-0 cursor-pointer"
        >
          <RefreshCw size={11} className={status === 'checking' ? 'animate-spin' : ''} />
          <span>Retry Now</span>
        </button>
      </div>
    </div>
  );
}
