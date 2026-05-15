import { useSyncExternalStore } from 'react';

export function useMediaQuery(query) {
  const subscribe = (onStoreChange) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', onStoreChange);
    return () => mediaQueryList.removeEventListener('change', onStoreChange);
  };

  const getSnapshot = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
