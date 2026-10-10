import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowLeft, AlertCircle, FileCheck, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';

export default function TermsConditions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/80">
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
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-medium text-amber-400 mb-4">
            <Scale className="w-3.5 h-3.5" />
            <span>SOFTWARE SERVICE & USAGE AGREEMENT</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms and Conditions
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
              Non-Custodial Nature of Software
            </h2>
            <p>
              WealthSync is a computational personal finance management and cash flow ledger application. WealthSync is not a chartered bank, investment adviser, depository institution, or money services business. At no point does WealthSync take custody of, hold, transmit, or control user funds. All monetary values displayed represent user-inputted or aggregator-mirrored bookkeeping entries.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">02.</span>
              No Financial or Investment Advice
            </h2>
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs text-white">Mathematical Simulation Disclaimer</p>
                <p className="text-[11px] text-zinc-300">
                  Calculations including Safe-to-Spend Runway, Loan Amortization, and Goal Allocation Rules are strictly deterministic mathematical formulas executed against user-supplied variables. WealthSync does not offer investment, tax, legal, or wealth management advice.
                </p>
              </div>
            </div>
            <p>
              You are advised to consult a qualified Certified Financial Planner (CFP) or legal counsel before making substantial financial, borrowing, or investment decisions.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">03.</span>
              Account Security & User Obligations
            </h2>
            <p>
              When establishing an account on WealthSync, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li>Maintain the confidentiality of your authentication credentials and session tokens.</li>
              <li>Notify the system administrators immediately upon identifying any unauthorized access.</li>
              <li>Refrain from attempting denial-of-service exploits, unauthorized reverse proxying, or circumvention of rate-limiting protections.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">04.</span>
              Utility Bill and External Verification Services
            </h2>
            <p>
              WealthSync includes modules enabling connectivity with public utility portals and payment gateways. You acknowledge that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li>Utility bill data availability is contingent upon uptime of state electricity DISCOM servers.</li>
              <li>WealthSync is not responsible for utility disconnections, tariff penalty assessments, or billing discrepancies instituted by power boards.</li>
              <li>Marking a bill as paid within WealthSync updates internal ledger records and does not execute real-world fund transfers unless explicitly dispatched through external banking gateways.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">05.</span>
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, WealthSync and its maintainers shall not be liable for any indirect, punitive, incidental, special, or consequential damages resulting from ledger calculation errors, service interruptions, or reliance on projected cash runway figures.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">06.</span>
              Modifications to Agreement
            </h2>
            <p>
              We reserve the right to amend these Terms and Conditions to reflect statutory updates or algorithmic enhancements. Continued utilization of WealthSync following published changes constitutes binding acceptance of the updated terms.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>WealthSync Personal Finance Engine</span>
          <div className="flex gap-4">
            <button onClick={() => navigate('/privacy')} className="hover:text-zinc-300 transition-colors">Privacy Policy</button>
            <button onClick={() => navigate('/')} className="hover:text-zinc-300 transition-colors">Overview</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
