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
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative overflow-hidden">
      <div className="absolute top-0 -left-20 w-96 h-96 bg-violet-600/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full mix-blend-screen filter blur-3xl animate-pulse delay-500" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fadeIn">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
              <TrendingUp className="text-white" size={24} />
            </div>
            <span className="text-3xl font-bold bg-linear-to-r from-white to-zinc-300 bg-clip-text text-transparent">
              WealthSync
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-zinc-400 text-sm">Sign in to manage your wealth & commitments</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-linear-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />

          <div className="relative bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-zinc-800/50 animate-fadeIn space-y-6">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            {/* 1-Click Google Sign-In */}
            {isFirebaseConfigured && (
              <>
                <GoogleSignInButton 
                  onClick={handleGoogleSignIn} 
                  isLoading={isGoogleLoading} 
                  disabled={isLoading}
                  text="Continue with Google"
                />

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-zinc-800 w-full" />
                  <span className="bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500 font-semibold absolute">
                    or with email
                  </span>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-zinc-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="pl-12 bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder="••••••••"
                    required
                    className="pl-12 pr-12 bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-violet-500/50 focus:ring-violet-500/20"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {isPasswordFocused && (
                  <p className="mt-2 text-xs text-zinc-400">
                    Password must be at least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isGoogleLoading}
                icon={<ArrowRight size={20} />}
                iconPosition="right"
              >
                Sign In
              </Button>
            </form>

            <div className="text-center pt-2">
              <p className="text-sm text-zinc-400">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          Protected by Google Firebase Authentication & Commitment Vault.
        </p>

        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={() => setIsServerModalOpen(true)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 py-1 px-3 rounded-full border border-zinc-800 bg-zinc-900/60 transition-colors cursor-pointer"
          >
            <Server size={12} className="text-violet-400" />
            <span>Server Connection</span>
          </button>
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
