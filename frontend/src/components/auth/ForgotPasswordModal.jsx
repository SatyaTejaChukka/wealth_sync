import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, X } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../../lib/firebase.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = '' }) {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      setError('Firebase is not yet configured. Please add your Firebase credentials in frontend/.env');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setIsSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      // Map common Firebase auth error codes
      if (err.code === 'auth/user-not-found') {
        // For security, show success anyway to prevent email enumeration
        setIsSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else {
        setError(err.message || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Reset your password</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {isSuccess 
                ? 'Check your inbox for the reset link'
                : 'Enter your account email to receive a password reset link.'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {isSuccess ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
              <CheckCircle2 size={24} className="shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold text-emerald-300">Reset instructions sent!</p>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  If an account exists for <strong className="text-white">{email}</strong>, Google has sent an email with a secure link to set your new password. Check your spam folder if it doesn&apos;t arrive in 2 minutes.
                </p>
              </div>
            </div>

            <Button
              variant="gradient"
              fullWidth
              onClick={handleClose}
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  className="pl-10 bg-zinc-800/60 border-zinc-700/60 text-white placeholder:text-zinc-500 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={handleClose}
                disabled={isLoading}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                fullWidth
                isLoading={isLoading}
                icon={<ArrowRight size={16} />}
                iconPosition="right"
              >
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
