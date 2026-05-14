import { useCallback, useEffect, useState } from 'react';

import { autopilotService } from '../services/autopilot.js';

const CACHE_KEY = 'daily-safe-to-spend-cache';
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !parsed?.data) {
      return null;
    }
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch {
    // Cache is optional; ignore storage failures.
  }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function useDailySafeToSpend() {
  const initialCache = readCache();
  const [data, setData] = useState(initialCache);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCache();
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
        return cached;
      }
    }

    try {
      setLoading(true);
      const payload = await autopilotService.getDailySafeToSpend();
      setData(payload);
      setError(null);
      writeCache(payload);
      return payload;
    } catch (err) {
      setError(err?.message || 'Failed to fetch safe-to-spend data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false).catch(() => undefined);

    const intervalId = setInterval(() => {
      fetchData(true).catch(() => undefined);
    }, CACHE_TTL_MS);

    const onFocus = () => {
      fetchData(true).catch(() => undefined);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true).catch(() => undefined);
      }
    };

    const onTransactionsChanged = () => {
      clearCache();
      fetchData(true).catch(() => undefined);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('transactions:changed', onTransactionsChanged);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('transactions:changed', onTransactionsChanged);
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
  };
}
