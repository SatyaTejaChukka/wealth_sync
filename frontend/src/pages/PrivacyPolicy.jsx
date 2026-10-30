import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Database, Server } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/80 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors p-1 -ml-1 rounded-md hover:bg-zinc-800/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="h-4 w-px bg-zinc-800" />
            <span className="text-sm font-bold text-white font-display">WealthSync Legal</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/login')}
              className="h-8 px-3 text-xs font-semibold border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 rounded-md"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="border-b border-zinc-800 pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-medium text-emerald-400 mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>PRIVACY & DATA PROTECTION DIRECTIVE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2">
            Effective Date: October 2026. Version 2.4.0
          </p>
        </div>

        <div className="space-y-10 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">01.</span>
              Core Privacy Principles
            </h2>
            <p>
              WealthSync is a personal financial ledger and cash flow tracking application. We operate on the principle that financial records belong strictly to the individual user. We do not sell user data, we do not display commercial advertisements, and we do not include third-party marketing tracking pixels or behavioral profile brokers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <Lock className="w-4 h-4 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white text-xs mb-1">Zero Advertising</h3>
                <p className="text-[11px] text-zinc-400">No ad networks, marketing cookies, or tracking pixels.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <Database className="w-4 h-4 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white text-xs mb-1">User-Scoped Records</h3>
                <p className="text-[11px] text-zinc-400">All financial entries are bound to your account and protected by user authentication.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <Server className="w-4 h-4 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white text-xs mb-1">No Banking Aggregators</h3>
                <p className="text-[11px] text-zinc-400">No external bank scraping or account aggregator credentials required.</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">02.</span>
              Information Collected and Stored
            </h2>
            <p>
              WealthSync collects and stores only the information necessary to provide personal budgeting, transaction logging, and schedule tracking:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li><strong className="text-zinc-200">Account Credentials:</strong> Email address, display name, and authentication tokens managed via Firebase Authentication (including Google Sign-In) or salted and hashed passwords for direct email logins.</li>
              <li><strong className="text-zinc-200">Financial Ledger Entries:</strong> Income and expense transactions, custom category assignments, payment method labels, transaction dates, and descriptions inputted by you.</li>
              <li><strong className="text-zinc-200">Budget and Goal Targets:</strong> Category budget thresholds, target savings goals, milestone dates, and contribution allocations.</li>
              <li><strong className="text-zinc-200">Commitments and Recurring Items:</strong> Recurring bills, digital subscription details (renewal intervals, amounts), and consumer reference identifiers entered for bill reminders.</li>
              <li><strong className="text-zinc-200">Loan and Peer Lending Records:</strong> Loan principals, interest rates, tenure, EMI schedules, and bilateral lent or borrowed balances (counterpart name, amount, due dates).</li>
              <li><strong className="text-zinc-200">Technical Data:</strong> Basic HTTP request headers, IP address for security rate-limiting, and client error logs when diagnosing application health.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">03.</span>
              How Information is Used
            </h2>
            <p>
              Data entered into WealthSync is utilized exclusively for internal application operations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li>Calculating your True Safe-to-Spend balance and liquidity runway.</li>
              <li>Aggregating upcoming obligations onto the unified commitment calendar.</li>
              <li>Computing deterministic loan amortization schedules and peer balance totals.</li>
              <li>Generating in-app reminders for upcoming bill due dates and budget thresholds.</li>
              <li>Maintaining authenticated user sessions across web browsers and mobile application environments.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">04.</span>
              Third-Party Infrastructure and Services
            </h2>
            <p>
              WealthSync relies on a limited set of service providers to operate the application:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li><strong className="text-zinc-200">Firebase Authentication (Google):</strong> Provides secure authentication infrastructure and token verification for email/password and Google Sign-In.</li>
              <li><strong className="text-zinc-200">Cloud Hosting & Database:</strong> The backend API and relational database run on secure cloud infrastructure (Render / PostgreSQL) with encrypted connections.</li>
              <li><strong className="text-zinc-200">No Payment or Banking Gateways:</strong> WealthSync does not process monetary payments, does not initiate bank transfers, and does not connect to live banking clearinghouse networks or live government utility bill payment gateways.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">05.</span>
              Data Security and Retention
            </h2>
            <p>
              All communication between your client device and our servers is encrypted in transit using standard HTTPS and TLS transport. Database records are logically partitioned by user identity, ensuring your financial information is inaccessible to other users.
            </p>
            <p className="mt-2">
              Data is retained as long as your account remains active so you can review historical balances and trend reports over time.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">06.</span>
              User Rights and Account Management
            </h2>
            <p>
              You maintain complete control over the financial entries stored in your account. You can add, edit, or delete individual transactions, budgets, goals, bills, and peer ledger records at any time directly through the workspace interface.
            </p>
            <p className="mt-2">
              If you wish to close your account or request the removal of your profile and associated records, you may submit a request using the contact details below.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">07.</span>
              Contact and Inquiries
            </h2>
            <p>
              For questions regarding this Privacy Policy or application data practices, contact:
            </p>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
              WealthSync Administration<br />
              Email: <a href="mailto:satyateja671@gmail.com" className="text-emerald-400 hover:underline">satyateja671@gmail.com</a><br />
              Project Repository: <a href="https://github.com/SatyaTejaChukka/wealth_sync" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">github.com/SatyaTejaChukka/wealth_sync</a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>WealthSync Personal Finance Engine</span>
          <div className="flex gap-4">
            <button onClick={() => navigate('/terms')} className="hover:text-zinc-300 transition-colors">Terms of Service</button>
            <button onClick={() => navigate('/')} className="hover:text-zinc-300 transition-colors">Overview</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
