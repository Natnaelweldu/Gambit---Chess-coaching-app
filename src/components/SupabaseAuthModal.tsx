import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, configWarning } from '../lib/supabase';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: any) => void;
  initialMode?: 'signin' | 'signup';
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'signin',
}) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setIsSignUp(initialMode === 'signup');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isSupabaseConfigured) {
      // Graceful fallback simulation when keys aren't set yet
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const demoUser = {
          id: 'demo-user-123',
          email: email,
          user_metadata: {
            skillLevel: 1,
            eloRating: '1200 Elo',
            careerHistory: [],
          }
        };
        setSuccessMsg(`Simulated ${isSignUp ? 'sign up' : 'sign in'} successful! (Demo Mode)`);
        setTimeout(() => {
          onAuthSuccess(demoUser);
          onClose();
        }, 1500);
      }, 1000);
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase!.auth.signUp({
          email,
          password,
        });

        if (signUpErr) throw signUpErr;

        if (data?.user) {
          setSuccessMsg('Registration successful! Please check your email inbox if verification is enabled.');
          setTimeout(() => {
            onAuthSuccess(data.user);
            onClose();
          }, 2000);
        } else {
          throw new Error('Registration did not return user details.');
        }
      } else {
        const { data, error: signInErr } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr) throw signInErr;

        if (data?.user) {
          setSuccessMsg('Welcome back! Successfully logged in.');
          setTimeout(() => {
            onAuthSuccess(data.user);
            onClose();
          }, 1200);
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let errMsg = err?.message || 'Authentication failed. Please verify your credentials.';
      if (
        errMsg.toLowerCase().includes('invalid path') || 
        errMsg.toLowerCase().includes('failed to fetch') ||
        errMsg.toLowerCase().includes('invalid request url')
      ) {
        errMsg = "INVALID CONFIGURATION DETECTED: The Supabase URL provided is incorrect. This usually happens when you paste your PostgreSQL database connection string (starts with postgres://) or DB host instead of the REST API 'Project URL' (which starts with https://). Please go to Settings > API in your Supabase dashboard, copy the 'Project URL' and 'anon/public' key, and paste them into Settings > Secrets as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY respectively.";
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-800 bg-[#0b0f19] p-6 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
            <div>
              <h3 className="font-display text-lg font-bold tracking-tight text-white uppercase">
                {isSignUp ? 'Create Gambit Account' : 'Sign In to Gambit'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSignUp ? 'Register to synchronize statistics across devices.' : 'Access your chess progress, Elo rating and career logs.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Control Tabs */}
          <div className="flex p-1 bg-slate-950 border border-slate-900 rounded-lg mb-5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
                !isSignUp
                  ? 'bg-amber-500 text-slate-950 shadow font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center py-1.5 text-xs font-bold rounded-md transition-all ${
                isSignUp
                  ? 'bg-amber-500 text-slate-950 shadow font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account (Sign Up)
            </button>
          </div>

          {/* Config Warning */}
          {configWarning && (
            <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-200/90 leading-normal font-mono">
                <strong>Config Alert:</strong> {configWarning}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex gap-2.5 items-center">
              <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-200 leading-normal">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2.5 items-center">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-200 leading-normal">{successMsg}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase font-mono">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.morgan@example.com"
                  className="w-full pl-9 pr-4 py-2 text-sm text-white bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-amber-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase font-mono">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2 text-sm text-white bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-amber-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold tracking-wide uppercase rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 transition-all disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  Processing...
                </>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Toggle Tab Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800/60 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Register / Sign Up"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
