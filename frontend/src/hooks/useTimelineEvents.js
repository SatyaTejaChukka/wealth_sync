import { useCallback, useEffect, useState } from 'react';
import { autopilotService } from '../services/autopilot.js';

/**
 * Custom hook to fetch timeline events from the autopilot API
 */
function getErrorMessage(error, fallback = 'Unable to load timeline right now.') {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }
  if (detail && typeof detail === 'object') {
    if (typeof detail.message === 'string' && detail.message.trim()) {
      return detail.message;
    }
    if (typeof detail.detail === 'string' && detail.detail.trim()) {
      return detail.detail;
    }
  }

  const message = error?.response?.data?.message;
  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function normalizeTimelinePayload(payload) {
  const today =
    typeof payload?.today === 'string' && payload.today
      ? payload.today
      : new Date().toISOString().slice(0, 10);

  return {
    events: Array.isArray(payload?.events) ? payload.events : [],
    today,
    summary:
      payload?.summary && typeof payload.summary === 'object' ? payload.summary : {},
  };
}

export function useTimelineEvents(daysPast = 7, daysFuture = 30) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await autopilotService.getTimeline(daysPast, daysFuture);
      setData(normalizeTimelinePayload(payload));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setData(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [daysFuture, daysPast]);

  useEffect(() => {
    fetchData();

    const onTransactionsChanged = () => {
      fetchData();
    };

    window.addEventListener('transactions:changed', onTransactionsChanged);

    return () => {
      window.removeEventListener('transactions:changed', onTransactionsChanged);
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
