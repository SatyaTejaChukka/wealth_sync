import { useState, useEffect, useCallback, useRef } from 'react';
import { Network } from '@capacitor/network';
import { offlineStorage } from '../lib/offlineStorage.js';

/**
 * Custom hook implementing the Stale-While-Revalidate pattern.
 * Instantly returns cached data on app launch (0ms), then refreshes in background.
 */
export function useOfflineResource(cacheKey, fetcher, options = {}) {
  const {
    initialData = null,
    userId = 'global',
    enabled = true,
    onSuccess,
    onError,
    deps = [],
  } = options;

  // 1. Synchronously hydrate from offline storage if available
  const cachedEntry = offlineStorage.get(cacheKey, userId);
  const [data, setData] = useState(() => (cachedEntry ? cachedEntry.data : initialData));
  const [lastSynced, setLastSynced] = useState(() => (cachedEntry ? cachedEntry.timestamp : null));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState(null);

  // Keep latest fetcher in ref to avoid re-triggering loops
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // 2. Background Revalidation function
  const revalidate = useCallback(async (isSilent = false) => {
    if (!enabled) return;

    try {
      if (!isSilent) setIsSyncing(true);
      setError(null);

      // Fast check if device is known to be offline
      try {
        const status = await Network.getStatus();
        if (!status.connected) {
          setIsOffline(true);
          setIsSyncing(false);
          return;
        }
      } catch {
        // Network plugin check fallback
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOffline(true);
          setIsSyncing(false);
          return;
        }
      }

      const freshData = await fetcherRef.current();

      if (freshData !== undefined && freshData !== null) {
        setData(freshData);
        const now = Date.now();
        setLastSynced(now);
        setIsOffline(false);
        offlineStorage.set(cacheKey, freshData, userId);
        if (onSuccessRef.current) onSuccessRef.current(freshData);
      }
    } catch (err) {
      console.warn(`[useOfflineResource] Background sync failed for ${cacheKey}:`, err?.message || err);
      setIsOffline(true);
      setError(err);
      if (onErrorRef.current) onErrorRef.current(err);
      // NOTE: We deliberately do NOT wipe `data` on error.
      // The cached data remains visible so user experience is uninterrupted.
    } finally {
      setIsSyncing(false);
    }
  }, [cacheKey, userId, enabled]);

  // 3. Initial revalidation and dependency updates
  useEffect(() => {
    if (!enabled) return;

    // Check if we need to hydrate new cache key when key/user changes
    const entry = offlineStorage.get(cacheKey, userId);
    if (entry) {
      setData(entry.data);
      setLastSynced(entry.timestamp);
    }

    revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, userId, enabled, ...deps]);

  // 4. Auto-sync when device regains network connectivity
  useEffect(() => {
    let networkListener = null;

    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) {
        setIsOffline(false);
        revalidate(true);
      } else {
        setIsOffline(true);
      }
    }).then((handle) => {
      networkListener = handle;
    }).catch(() => {});

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, [revalidate]);

  return {
    data,
    setData,
    lastSynced,
    isSyncing,
    isOffline,
    error,
    refetch: () => revalidate(false),
  };
}
