import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2, Server, Database } from 'lucide-react';
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
              className="h-8 px-3 text-xs font-semibold border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
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
            Effective Date: October 1, 2026. Version 2.4.0
          </p>
        </div>

        <div className="space-y-10 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">01.</span>
              Core Privacy Architecture
            </h2>
            <p>
              WealthSync is engineered around a zero-surveillance architecture. We operate on the foundational premise that personal financial data belongs exclusively to the user. We do not monetize personal data, we do not sell financial metrics to advertising networks, and we do not maintain tracking pixels or behavioral telemetry.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <Lock className="w-4 h-4 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white text-xs mb-1">Zero Advertising</h3>
                <p className="text-[11px] text-zinc-400">No ad networks, tracker SDKs, or marketing profile brokers.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <Database className="w-4 h-4 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white text-xs mb-1">Isolated Data Storage</h3>
                <p className="text-[11px] text-zinc-400">Tenant-isolated relational storage with strict row-level authorization.</p>
              </div>
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <Server className="w-4 h-4 text-emerald-400 mb-2" />
                <h3 className="font-bold text-white text-xs mb-1">Self-Hostable</h3>
                <p className="text-[11px] text-zinc-400">Complete code deployable within private infrastructure or personal servers.</p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">02.</span>
              Information Collected and Processed
            </h2>
            <p>
              To execute arithmetic calculations, ledger balancing, and bill schedules, WealthSync processes only the data you explicitly supply:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li><strong className="text-zinc-200">Account Credentials:</strong> Email address and salted, hashed cryptographic password representation. Passwords are never stored in plaintext.</li>
              <li><strong className="text-zinc-200">Financial Ledger Entries:</strong> Transaction records, custom category tags, income sources, and discretionary spending logs entered manually or via import.</li>
              <li><strong className="text-zinc-200">Commitment Vault Records:</strong> Recurring expenses, rent milestones, savings goal thresholds, and loan amortization principal amounts.</li>
              <li><strong className="text-zinc-200">Utility Provider References:</strong> State electricity consumer identification numbers supplied to track bill amounts and scheduled payment dates.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">03.</span>
              Data Security and Encryption
            </h2>
            <p>
              All communication between your client device and the backend occurs over TLS 1.3 cryptographic transport. Session management utilizes stateless, signed JSON Web Tokens (JWT) configured with expiration cycles and secure cookie storage. In native mobile environments (Android / iOS via Capacitor), secure hardware-backed storage sandboxing isolates offline session states.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">04.</span>
              Third-Party Services and Aggregators
            </h2>
            <p>
              WealthSync does not initiate background transfers to third parties without direct user invocation:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li><strong className="text-zinc-200">Authentication:</strong> When signing in through Google Identity, only your verified email and name are retrieved to establish the local profile.</li>
              <li><strong className="text-zinc-200">Utility Bill Fetching:</strong> When querying state power boards or public BBPS biller endpoints, only the user-specified consumer identifier is submitted to determine current payable balance.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">05.</span>
              Data Portability and Right to Deletion
            </h2>
            <p>
              Users maintain full sovereignty over their records:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li><strong className="text-zinc-200">Export:</strong> You may export transactions and ledgers in structured JSON or CSV format at any time from Account Settings.</li>
              <li><strong className="text-zinc-200">Permanent Deletion:</strong> Initiating account deletion permanently purges all ledger entries, categories, commitment vaults, and credentials from the relational database without ghost retention.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">06.</span>
              Contact Information
            </h2>
            <p>
              For privacy verification, security vulnerability disclosures, or infrastructure questions, contact:
            </p>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
              WealthSync Security & Governance<br />
              Email: security@wealthsync.internal<br />
              Repository: https://github.com/SatyaTejaChukka/wealth_sync
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
