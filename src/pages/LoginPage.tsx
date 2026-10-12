import { useState } from 'react';
import {
  Activity,
  Mail,
  Lock,
  User as UserIcon,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Compass,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { Page } from '@/types';

interface LoginPageProps {
  onNavigate: (page: Page) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
          setLoading(false);
        } else {
          onNavigate('overview');
        }
      } else if (mode === 'signup') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const { error: err } = await signUp(email, password, name);
        if (err) {
          setError(err);
          setLoading(false);
        } else {
          setSuccessMessage(
            'Account registration initiated! If your project requires email verification, please check your inbox.'
          );
          setTimeout(() => {
            onNavigate('overview');
          }, 1500);
        }
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          setError('Please provide your registered email address.');
          setLoading(false);
          return;
        }
        const { error: err } = await resetPassword(email);
        if (err) {
          setError(err);
        } else {
          setSuccessMessage(
            `Password reset link dispatched to ${email}. Please check your inbox and spam folders.`
          );
        }
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-slate-50 dark:bg-citynavy relative overflow-hidden transition-colors">
      {/* Subtle GIS map vector backdrop motif */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-xl shadow-blue-500/30 mb-3 group hover:scale-105 transition-transform">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-citynavy-text">
            CityPulse Identity
          </h1>
          <p className="text-xs text-slate-500 dark:text-citynavy-muted mt-1 max-w-xs mx-auto">
            Secure Smart City Telemetry, User Bookmarks & Multi-Route Travel Sync
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-citynavy-card border border-slate-200 dark:border-citynavy-border rounded-3xl shadow-xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Mode Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-citynavy-secondary rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white dark:bg-citynavy-card text-citynavy-accent shadow-sm'
                  : 'text-slate-500 dark:text-citynavy-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-citynavy-card text-citynavy-accent shadow-sm'
                  : 'text-slate-500 dark:text-citynavy-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('forgot');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'forgot'
                  ? 'bg-white dark:bg-citynavy-card text-citynavy-accent shadow-sm'
                  : 'text-slate-500 dark:text-citynavy-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Recovery
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name for Registration */}
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Citizen / Operator Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Aditi Sharma"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl focus:outline-none focus:ring-1 focus:ring-citynavy-accent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl focus:outline-none focus:ring-1 focus:ring-citynavy-accent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password with Show/Hide Control */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-citynavy-accent hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-citynavy-secondary border border-slate-200 dark:border-citynavy-border rounded-xl focus:outline-none focus:ring-1 focus:ring-citynavy-accent text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="text-[10px] text-slate-400 dark:text-citynavy-muted mt-1">
                    Must be at least 6 characters long.
                  </p>
                )}
              </div>
            )}

            {/* Error Feedback */}
            {error && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3 leading-relaxed">
                {error}
              </div>
            )}

            {/* Success Feedback */}
            {successMessage && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-3 flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' && (
                    <>
                      <span>Sign In to CityPulse</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                  {mode === 'signup' && (
                    <>
                      <span>Register Account</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                  {mode === 'forgot' && (
                    <>
                      <span>Send Recovery Link</span>
                      <KeyRound className="w-4 h-4" />
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Continue as Public Explorer */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-citynavy-border text-center">
            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className="text-xs text-slate-500 dark:text-citynavy-muted hover:text-citynavy-accent flex items-center justify-center gap-1.5 mx-auto font-medium transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Browse GIS maps as Public Guest</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
