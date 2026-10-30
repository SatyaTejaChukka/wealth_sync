import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';

export default function TermsConditions() {
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
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-medium text-amber-400 mb-4">
            <Scale className="w-3.5 h-3.5" />
            <span>SOFTWARE USAGE AND SERVICE TERMS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms and Conditions
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
              Non-Custodial Nature of Software
            </h2>
            <p>
              WealthSync is a computational personal finance tracking and bookkeeping software application. WealthSync is not a bank, investment advisor, broker-dealer, credit bureau, money services business, or payment processor. At no time does WealthSync hold, transmit, receive, or take custody of user funds. All financial numbers and metrics shown in the application represent manual entries and calculations for personal planning.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">02.</span>
              No Financial, Investment, or Legal Advice
            </h2>
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs text-white">Mathematical Simulation Disclaimer</p>
                <p className="text-[11px] text-zinc-300">
                  Calculations such as Safe-to-Spend runway, budget utilization percentages, loan amortization schedules, and financial health scores are automated mathematical models based on user-entered values. They do not constitute financial, investment, tax, or legal advice.
                </p>
              </div>
            </div>
            <p>
              You should consult a licensed financial advisor, accountant, or legal professional before making substantial financial or debt commitments.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">03.</span>
              Bookkeeping Only (No Real-World Fund Transfers)
            </h2>
            <p>
              WealthSync operates as an internal ledger for organizing personal cash flow. You acknowledge and understand that:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li>Marking an obligation, utility bill, loan EMI, or subscription as paid updates internal bookkeeping records only. It does not execute a bank wire, card charge, or real-world monetary settlement.</li>
              <li>You are solely responsible for initiating and verifying any actual bill or debt payments through your external banking, utility, or payment provider.</li>
              <li>WealthSync is not responsible for utility disconnections, late payment penalties, interest accruals, or third-party fee assessments.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">04.</span>
              User Responsibilities and Accuracy of Inputs
            </h2>
            <p>
              When using WealthSync, you agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400 text-xs">
              <li>Maintain the confidentiality of your account login credentials and session tokens.</li>
              <li>Ensure the accuracy of the income, transaction, loan, and obligation data you enter, recognizing that all analytical outputs depend on your inputted data.</li>
              <li>Refrain from attempting to disrupt application services, bypass rate limits, probe vulnerabilities, or engage in unauthorized access to other user accounts.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">05.</span>
              Service Availability and Changes
            </h2>
            <p>
              WealthSync is provided on an "as is" and "as available" basis. While we strive to maintain high service availability, access may occasionally be interrupted for scheduled updates, maintenance, or infrastructure downtime. We reserve the right to refine calculations, modify interface features, or update system configurations.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">06.</span>
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, WealthSync and its maintainers shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from your use of the application, including calculation inaccuracies, reliance on displayed runway metrics, or any errors arising from manual data input.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="font-mono text-zinc-500 text-xs">07.</span>
              Contact and Inquiries
            </h2>
            <p>
              If you have questions regarding these Terms and Conditions, you can reach out via the official project repository:
            </p>
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
              WealthSync Governance<br />
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
            <button onClick={() => navigate('/privacy')} className="hover:text-zinc-300 transition-colors">Privacy Policy</button>
            <button onClick={() => navigate('/')} className="hover:text-zinc-300 transition-colors">Overview</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
