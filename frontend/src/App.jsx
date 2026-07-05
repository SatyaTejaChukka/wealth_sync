import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
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

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
          <span className="text-sm font-medium">Loading WealthSync...</span>
        </div>
      </div>
    );
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
     return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
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
  );
}
