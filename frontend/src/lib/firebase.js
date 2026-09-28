import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'wealthsync-app-b24c1.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wealthsync-app-b24c1',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'wealthsync-app-b24c1.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '773706147941',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:773706147941:web:dd0605169928135c7fbe8c',
};

// Check if Firebase keys are configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'demo-api-key'
);

// Initialize Firebase safely only when configured
export const app = isFirebaseConfigured
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

// Default prompt for account selection on Google sign-in
if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });
}
