/**
 * WealthSync Offline Storage & Cache Engine
 * Provides persistent stale-while-revalidate data caching for instant offline app boot.
 */

const CACHE_PREFIX = 'wealthsync_cache';

export const offlineStorage = {
  /**
   * Generates a user-scoped cache key
   */
  _buildKey(key, userId = 'global') {
    const cleanUser = userId || 'global';
    return `${CACHE_PREFIX}_${cleanUser}_${key}`;
  },

  /**
   * Store data in local storage with timestamp metadata
   */
  set(key, data, userId = 'global') {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = this._buildKey(key, userId);
      const payload = {
        data,
        timestamp: Date.now(),
        version: 1,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      
      // Also update last synced timestamp for this user
      if (userId && userId !== 'global') {
        localStorage.setItem(`${CACHE_PREFIX}_${userId}_last_sync`, String(Date.now()));
      }
    } catch (e) {
      console.warn('[OfflineStorage] Failed to cache data:', e);
    }
  },

  /**
   * Retrieve cached data.
   * Returns { data, timestamp, isStale } or null if not found.
   */
  get(key, userId = 'global', maxAgeMs = null) {
    if (typeof window === 'undefined') return null;
    try {
      const storageKey = this._buildKey(key, userId);
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || parsed.data === undefined) return null;

      const age = Date.now() - (parsed.timestamp || 0);
      const isStale = maxAgeMs !== null && age > maxAgeMs;

      return {
        data: parsed.data,
        timestamp: parsed.timestamp || Date.now(),
        isStale,
      };
    } catch (e) {
      console.warn('[OfflineStorage] Failed to read cache:', e);
      return null;
    }
  },

  /**
   * Remove a specific cached item
   */
  remove(key, userId = 'global') {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this._buildKey(key, userId));
    } catch (e) {
      console.warn('[OfflineStorage] Failed to remove cache:', e);
    }
  },

  /**
   * Get the last time the user successfully synchronized data
   */
  getLastSyncTime(userId = 'global') {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}_${userId || 'global'}_last_sync`);
      return raw ? parseInt(raw, 10) : null;
    } catch {
      return null;
    }
  },

  /**
   * Purge all cached records for a specific user upon logout
   */
  clearUser(userId) {
    if (typeof window === 'undefined' || !userId) return;
    try {
      const prefix = `${CACHE_PREFIX}_${userId}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[OfflineStorage] Failed to clear user cache:', e);
    }
  },
};
