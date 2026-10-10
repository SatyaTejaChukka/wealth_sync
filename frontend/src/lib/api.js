import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const getInitialBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_api_base_url');
    if (custom) {
      // On mobile native, localhost is unreachable; purge it and use production HTTPS
      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && (custom.includes('localhost') || custom.includes('127.0.0.1'))) {
        localStorage.removeItem('custom_api_base_url');
      } else {
        return custom;
      }
    }
  }
  // On native mobile builds, fallback to production HTTPS endpoint rather than unreachable host localhost
  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_BASE_URL || 'https://wealth-sync.onrender.com/api/v1';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
};

export const API_BASE_URL = getInitialBaseUrl();
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds to accommodate Render free-tier cold starts
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem('custom_api_base_url');
    if (customUrl) {
      if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform() && (customUrl.includes('localhost') || customUrl.includes('127.0.0.1'))) {
        localStorage.removeItem('custom_api_base_url');
      } else {
        config.baseURL = customUrl;
      }
    }
  }
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    // Only genuine 401 Unauthorized responses trigger session revocation.
    // Network errors (no response), timeouts, connection refused, and 5xx errors must NOT log the user out.
    if (status === 401) {
      const url = error?.config?.url || '';
      // Don't trigger global unauthorized logout when user is simply submitting credentials on login/signup forms
      if (!url.includes('/auth/login') && !url.includes('/auth/signup')) {
        localStorage.removeItem('token');
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { error } }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
