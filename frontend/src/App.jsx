import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsConditions from './pages/TermsConditions.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import Dashboard from './pages/dashboard/Dashboard.jsx';
import Transactions from './pages/dashboard/Transactions.jsx';
import AnalyticsPage from './pages/dashboard/Analytics.jsx';
import Budget from './pages/dashboard/Budget.jsx';
import Goals from './pages/dashboard/Goals.jsx';
import Bills from './pages/dashboard/Bills.jsx';
import Subscriptions from './pages/dashboard/Subscriptions.jsx';
import Loans from './pages/dashboard/Loans.jsx';
import Lent from './pages/dashboard/Lent.jsx';
import Settings from './pages/dashboard/Settings.jsx';
import Calendar from './pages/dashboard/Calendar.jsx';
import { useAuth } from './lib/auth.jsx';
import { MobileIntroSplash } from './components/mobile/MobileIntroSplash.jsx';

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return <MobileIntroSplash force duration={800} minDisplayTime={200} />;
  }
  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return children;
}

function RequireGuest({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <MobileIntroSplash force duration={800} minDisplayTime={200} />;
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const [introFinished, setIntroFinished] = useState(() => {
    if (typeof window !== 'undefined') {
      const shown = sessionStorage.getItem('wealthsync_intro_shown');
      if (shown) return true;
    }
    // Only auto-play the full intro reveal on native mobile cold start
    return !Capacitor.isNativePlatform();
  });

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#09090b' }).catch(() => {});
      SplashScreen.hide().catch(() => {});
    }
  }, []);

  return (
    <>
      {!introFinished && (
        <MobileIntroSplash onComplete={() => setIntroFinished(true)} />
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/preview-splash" element={<MobileIntroSplash force duration={3000} minDisplayTime={2500} onComplete={() => {}} />} />
        <Route
        path="/login"
        element={
          <RequireGuest>
            <Login />
          </RequireGuest>
        }
      />
      <Route
        path="/signup"
        element={
          <RequireGuest>
            <Signup />
          </RequireGuest>
        }
      />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsConditions />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="budget" element={<Budget />} />
        <Route path="goals" element={<Goals />} />
        <Route path="bills" element={<Bills />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="loans" element={<Loans />} />
        <Route path="lent" element={<Lent />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
);
}
