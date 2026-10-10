import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton.jsx';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal.jsx';
import { ServerConnectionModal } from '../components/common/ServerConnectionModal.jsx';
import { TrendingUp, Mail, Lock, ArrowRight, Eye, EyeOff, Server } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

const MIN_PASSWORD_LENGTH = 8;

function mapAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password. Please try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Access temporarily disabled due to multiple failed login attempts. You can reset your password or try again later.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was cancelled.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error. Please check your internet connection.';
  }
  return err?.response?.data?.detail || err?.message || 'Login failed. Please check your credentials.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  const { loginWithEmail, loginWithGoogle, isFirebaseConfigured } = useAuth();
  const location = useLocation();

  const redirectTo = useMemo(() => {
    const from = location.state?.from;
    return typeof from === 'string' && from.startsWith('/') ? from : '/dashboard';
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await loginWithEmail(email, password, redirectTo);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(redirectTo);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 relative overflow-hidden">
      {/* Precision background grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
      </div>

      <div className="w-full max-w-md relative z-10 py-8">
        <div className="text-center mb-8 animate-fadeIn">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              <TrendingUp className="text-emerald-400" size={20} />
            </div>
            <span className="text-2xl font-bold text-white font-display tracking-tight">
              WealthSync
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1.5 font-display">Sign In to Workspace</h1>
          <p className="text-zinc-400 text-xs sm:text-sm">Deterministic personal cash flow and commitment ledger</p>
        </div>

        <div className="relative">
          <div className="bg-zinc-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-6 sm:p-8 border border-zinc-800 animate-fadeIn space-y-6">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            {/* 1-Click Google Sign-In (Web only) */}
            {isFirebaseConfigured && !isNative && (
              <>
                <GoogleSignInButton 
                  onClick={handleGoogleSignIn} 
                  isLoading={isGoogleLoading} 
                  disabled={isLoading}
                  text="Continue with Google"
                />

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-zinc-800 w-full" />
                  <span className="bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500 font-semibold absolute font-mono">
                    or with email
                  </span>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase font-mono tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="pl-11 bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-emerald-500/20 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-xs font-semibold text-zinc-300 uppercase font-mono tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder="••••••••"
                    required
                    className="pl-11 pr-11 bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-emerald-500/20 rounded-lg text-sm"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isPasswordFocused && (
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Password must be at least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  isLoading={isLoading}
                  disabled={isGoogleLoading}
                  icon={<ArrowRight size={18} />}
                  iconPosition="right"
                  className="h-11 rounded-lg bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  Sign In
                </Button>
              </div>
            </form>

            <div className="text-center pt-2">
              <p className="text-xs text-zinc-400">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Legal Links & Security Footer */}
        <div className="mt-6 space-y-3 text-center">
          <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
            <Link to="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-zinc-300 transition-colors">Terms & Conditions</Link>
          </div>

          <p className="text-[11px] text-zinc-600">
            Protected by Google Firebase Authentication & Commitment Vault.
          </p>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setIsServerModalOpen(true)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 py-1 px-3 rounded-md border border-zinc-800 bg-zinc-900/60 transition-colors cursor-pointer"
            >
              <Server size={12} className="text-zinc-400" />
              <span>Server Connection</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        initialEmail={email}
      />

      {/* Server Connection Modal for Mobile & Custom Environments */}
      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
}
