/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInWithCredential,
  GoogleAuthProvider,
  signOut, 
  onIdTokenChanged,
  updateProfile 
} from 'firebase/auth';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { Capacitor } from '@capacitor/core';
import { auth, googleProvider, isFirebaseConfigured } from './firebase.js';
import api from './api.js';

let googleSignInInitPromise = null;

async function ensureGoogleSignInInitialized() {
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      'Google Sign-In is not configured. Check VITE_GOOGLE_WEB_CLIENT_ID in frontend/.env.'
    );
  }

  if (!googleSignInInitPromise) {
    googleSignInInitPromise = GoogleSignIn.initialize({
      clientId,
    }).catch((error) => {
      googleSignInInitPromise = null;
      throw error;
    });
  }

  return googleSignInInitPromise;
}

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
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            // Backend definitively rejected the credentials or disabled user
            localStorage.removeItem('token');
            setUser(null);
          } else {
            // Backend connectivity issue (cold start, offline, timeout)
            // Preserve basic Firebase profile with explicit offline indicator
            setUser({
              id: fbUser.uid,
              email: fbUser.email,
              full_name: fbUser.displayName || fbUser.email?.split('@')[0],
              avatar_url: fbUser.photoURL,
              is_backend_unavailable: true
            });
          }
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
    if (isFirebaseConfigured && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const token = await cred.user.getIdToken();
        localStorage.setItem('token', token);
        const res = await api.get('/auth/me');
        setUser(res.data);
        navigate(redirectTo, { replace: true });
        return res.data;
      } catch (fbErr) {
        // If Firebase says user not found or invalid credential, try Supabase database auth
        const fbCode = fbErr?.code;
        if (
          fbCode === 'auth/user-not-found' || 
          fbCode === 'auth/invalid-credential' || 
          fbCode === 'auth/wrong-password' ||
          fbCode === 'auth/invalid-email'
        ) {
          try {
            const formData = new URLSearchParams();
            formData.append('username', email.trim());
            formData.append('password', password);
            const res = await api.post('/auth/login', formData, {
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            localStorage.setItem('token', res.data.access_token);
            const userRes = await api.get('/auth/me');
            setUser(userRes.data);

            // Auto-sync into Firebase in background so subsequent logins work via Firebase
            try {
              const newCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
              if (userRes.data?.full_name) {
                await updateProfile(newCred.user, { displayName: userRes.data.full_name });
              }
              const newIdToken = await newCred.user.getIdToken();
              localStorage.setItem('token', newIdToken);
              await api.get('/auth/me');
            } catch (autoRegErr) {
              console.warn('Auto-sync to Firebase skipped:', autoRegErr?.message);
            }

            navigate(redirectTo, { replace: true });
            return userRes.data;
          } catch {
            // If backend also rejected credentials, throw the original error
            throw fbErr;
          }
        }
        throw fbErr;
      }
    } else {
      // Fallback to legacy local auth if Firebase not configured
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
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

  // 2. Google Sign-In: native Android and web
  const loginWithGoogle = useCallback(
    async (redirectTo = '/dashboard') => {
      if (!isFirebaseConfigured || !auth) {
        throw new Error(
          'Firebase credentials are not configured in frontend/.env.'
        );
      }

      let firebaseUser;

      if (Capacitor.isNativePlatform()) {
        // Android/iOS: use native Google Sign-In.
        await ensureGoogleSignInInitialized();

        const googleResult = await GoogleSignIn.signIn();

        if (!googleResult?.idToken) {
          throw new Error(
            'Google Sign-In did not return an ID token. Please try again.'
          );
        }

        // Exchange Google's ID token for a Firebase credential.
        const credential = GoogleAuthProvider.credential(
          googleResult.idToken
        );

        const firebaseCredential = await signInWithCredential(
          auth,
          credential
        );

        firebaseUser = firebaseCredential.user;
      } else {
        // Web: preserve the existing Firebase popup flow.
        const credential = await signInWithPopup(
          auth,
          googleProvider
        );

        firebaseUser = credential.user;
      }

      // Obtain the Firebase ID token for the FastAPI backend.
      const token = await firebaseUser.getIdToken();

      localStorage.setItem('token', token);

      // Synchronize the authenticated user with the backend.
      const response = await api.get('/auth/me');

      setUser(response.data);

      navigate(redirectTo, { replace: true });

      return response.data;
    },
    [navigate]
  );

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
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleSignIn.signOut();
      } catch (err) {
        console.warn('Native Google sign out warning:', err);
      }
    }
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
