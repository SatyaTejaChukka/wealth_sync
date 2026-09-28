import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton.jsx';
import { ServerConnectionModal } from '../components/common/ServerConnectionModal.jsx';
import { TrendingUp, Mail, Lock, ArrowRight, Eye, EyeOff, User, Server } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

const MIN_PASSWORD_LENGTH = 8;

function mapAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 8 characters with numbers or symbols.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-up was cancelled.';
  }
  return err?.response?.data?.detail || err?.message || 'Registration failed. Please try again.';
}

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  const { signupWithEmail, loginWithGoogle, isFirebaseConfigured } = useAuth();
  const hasConfirmPasswordValue = confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setIsLoading(true);

    try {
      await signupWithEmail(email, password, fullName, '/dashboard');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle('/dashboard');
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
          <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-zinc-400 text-sm">Start protecting commitments & growing your wealth</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-linear-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000" />

          <div className="relative bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-zinc-800/50 animate-fadeIn space-y-6">
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            {/* 1-Click Google Sign-Up (Web only) */}
            {isFirebaseConfigured && !isNative && (
              <>
                <GoogleSignInButton
                  onClick={handleGoogleSignUp}
                  isLoading={isGoogleLoading}
                  disabled={isLoading}
                  text="Sign up with Google"
                />

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-zinc-800 w-full" />
                  <span className="bg-zinc-900 px-3 text-xs uppercase tracking-wider text-zinc-500 font-semibold absolute">
                    or with email
                  </span>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="pl-12 bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-violet-500/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-zinc-300 mb-1.5">
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
                    className="pl-12 bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-violet-500/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-zinc-300 mb-1.5">
                  Password
                </label>
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
                    className="pl-12 pr-12 bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-violet-500/50"
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
                  <p className="mt-1 text-xs text-zinc-400">
                    Password must be at least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-zinc-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setIsConfirmPasswordFocused(true)}
                    onBlur={() => setIsConfirmPasswordFocused(false)}
                    placeholder="••••••••"
                    required
                    className="pl-12 pr-12 bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-violet-500/50"
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {isConfirmPasswordFocused && hasConfirmPasswordValue && !passwordsMatch && (
                  <p className="mt-1 text-xs text-rose-400">
                    Passwords do not match.
                  </p>
                )}
              </div>

              <div className="pt-2">
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
                  Create Account
                </Button>
              </div>
            </form>

            <div className="text-center pt-2">
              <p className="text-sm text-zinc-400">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6">
          By signing up, you agree to our Terms and Privacy Policy.
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

      {/* Server Connection Modal for Mobile & Custom Environments */}
      <ServerConnectionModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
}
