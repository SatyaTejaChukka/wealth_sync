import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let networkListenerHandle = null;

    if (Capacitor.isNativePlatform()) {
      Network.getStatus().then((status) => {
        if (isMounted) setIsOffline(!status.connected);
      }).catch(() => {});

      Network.addListener('networkStatusChange', (status) => {
        if (isMounted) setIsOffline(!status.connected);
      }).then((handle) => {
        networkListenerHandle = handle;
      }).catch(() => {});
    } else {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        isMounted = false;
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      isMounted = false;
      if (networkListenerHandle) {
        networkListenerHandle.remove();
      }
    };
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Network.getStatus();
        setIsOffline(!status.connected);
      } else {
        setIsOffline(!navigator.onLine);
      }
    } finally {
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[70] pt-[env(safe-area-inset-top,0px)] bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md transition-all duration-300"
    >
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-200 min-w-0">
          <WifiOff size={15} className="text-amber-400 shrink-0 animate-pulse" />
          <span className="font-semibold text-white truncate">Connection Offline</span>
          <span className="hidden sm:inline text-amber-300/80">Displaying cached workspace. Changes will sync once network is restored.</span>
        </div>
        <button
          type="button"
          onClick={handleManualCheck}
          disabled={isChecking}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 active:scale-95 transition-all shrink-0 font-medium disabled:opacity-50"
        >
          <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}
