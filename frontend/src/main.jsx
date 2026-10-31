import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Local self-hosted typography for 100% offline shell viability
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';

import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/outfit/900.css';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';

// Acknowledge bundle viability to prevent Capgo auto-rollback on mobile boot
if (Capacitor.isNativePlatform()) {
  CapacitorUpdater.notifyAppReady().catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
