/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  onIdTokenChanged,
  updateProfile 
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase.js';
import api from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync token whenever Firebase refreshes it in the background
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // If Firebase is not yet configured, initialize from local token
      const localToken = localStorage.getItem('token');
      if (localToken) {
        api.get('/auth/me')
          .then((res) => setUser(res.data))
          .catch(() => {
            localStorage.removeItem('token');
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          localStorage.setItem('token', idToken);
          const res = await api.get('/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to sync user profile from backend', err);
          // If backend couldn't validate, keep user info from Firebase at minimum
          setUser({
            id: fbUser.uid,
            email: fbUser.email,
            full_name: fbUser.displayName || fbUser.email?.split('@')[0],
            avatar_url: fbUser.photoURL
          });
        }
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to 401 unauthorized events from Axios
  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('token');
      setUser(null);
      if (isFirebaseConfigured && auth) {
        signOut(auth).catch(() => {});
      }
    };

    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', onUnauthorized);
    };
  }, []);

  // 1. Email + Password Login
  const loginWithEmail = useCallback(async (email, password, redirectTo = '/dashboard') => {
    if (isFirebaseConfigured) {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();
      localStorage.setItem('token', token);
      const res = await api.get('/auth/me');
      setUser(res.data);
      navigate(redirectTo, { replace: true });
      return res.data;
    } else {
      // Fallback to legacy local auth if Firebase not configured
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const res = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      localStorage.setItem('token', res.data.access_token);
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);
      navigate(redirectTo, { replace: true });
      return userRes.data;
    }
  }, [navigate]);

  // 2. 1-Click Google Sign-In
  const loginWithGoogle = useCallback(async (redirectTo = '/dashboard') => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase credentials not configured in frontend/.env');
    }
    const cred = await signInWithPopup(auth, googleProvider);
    const token = await cred.user.getIdToken();
    localStorage.setItem('token', token);
    const res = await api.get('/auth/me');
    setUser(res.data);
    navigate(redirectTo, { replace: true });
    return res.data;
  }, [navigate]);

  // 3. Email + Password Registration
  const signupWithEmail = useCallback(async (email, password, fullName = '', redirectTo = '/dashboard') => {
    if (isFirebaseConfigured) {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (fullName && fullName.trim()) {
        try {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        } catch (profileErr) {
          console.warn('Failed to update displayName on Firebase user', profileErr);
        }
      }
      // Force token refresh so that claims immediately include the displayName
      const token = await cred.user.getIdToken(true);
      localStorage.setItem('token', token);
      const res = await api.get('/auth/me');
      setUser(res.data);
      navigate(redirectTo, { replace: true });
      return res.data;
    } else {
      // Fallback to legacy local auth
      const res = await api.post('/auth/signup', { 
        email, 
        password,
        full_name: fullName?.trim() || null 
      });
      localStorage.setItem('token', res.data.access_token);
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);
      navigate(redirectTo, { replace: true });
      return userRes.data;
    }
  }, [navigate]);

  // 4. Logout
  const logout = useCallback(async () => {
    localStorage.removeItem('token');
    setUser(null);
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Firebase sign out error', err);
      }
    }
    navigate('/login', { replace: true });
  }, [navigate]);

  // 5. Refresh User
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      firebaseUser,
      login: loginWithEmail,
      loginWithEmail,
      loginWithGoogle,
      signup: signupWithEmail,
      signupWithEmail,
      logout,
      refreshUser,
      isAuthenticated: !!user,
      isLoading,
      isFirebaseConfigured
    }),
    [user, firebaseUser, loginWithEmail, loginWithGoogle, signupWithEmail, logout, refreshUser, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
