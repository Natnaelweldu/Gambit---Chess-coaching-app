import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, CheckCircle, AlertCircle, Loader2, Shield, Flame, BookOpen, Trophy } from 'lucide-react';
import { supabase, isSupabaseConfigured, configWarning } from '../lib/supabase';

interface AuthGatewayProps {
  onAuthSuccess: (user: any) => void;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [isSignUp]);

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
        setSuccessMsg(`Welcome to Gambit! (Demo Cloud-Sync Mode Active)`);
        setTimeout(() => {
          onAuthSuccess(demoUser);
        }, 1200);
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
          setSuccessMsg('Welcome back! Loading your profile...');
          setTimeout(() => {
            onAuthSuccess(data.user);
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
        errMsg = "INVALID CONFIGURATION DETECTED: The Supabase URL provided is incorrect. This usually happens when you paste your PostgreSQL database connection string or database host instead of the REST API 'Project URL'. Please update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Settings > Secrets.";
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col justify-center items-center relative px-4 py-12 select-none overflow-hidden font-sans">
      {/* Background radial glows */}
      <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-[700px] h-[700px] bg-slate-500/5 rounded-full blur-[180px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Side: Brand & Value Prop */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-3 bg-slate-900/80 border border-slate-800/80 px-4 py-2 rounded-2xl">
            <div className="bg-gradient-to-tr from-amber-600 to-amber-400 p-2 rounded-xl shadow-lg border border-amber-500/20">
              <Shield className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-display font-black text-white text-xl tracking-widest uppercase block">GAMBIT</span>
              <span className="text-[10px] text-amber-400 font-mono tracking-widest uppercase">PREMIER AI MENTORSHIP</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-black text-white leading-tight tracking-tight">
            Elevate Your Chess Game with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">True AI Coaching</span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
            Play against Stockfish, receive instant move evaluations, and get custom training regimens curated on-the-fly by Coach Garry. Your progress is dynamically analyzed and synchronized to the cloud.
          </p>

          {/* Core Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-lg mx-auto lg:mx-0">
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-left">
              <Flame className="w-5 h-5 text-amber-400 mb-1" />
              <h4 className="text-xs font-bold text-slate-200">Interactive Board</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Defeat Stockfish engine of variable difficulty.</p>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-left">
              <BookOpen className="w-5 h-5 text-sky-400 mb-1" />
              <h4 className="text-xs font-bold text-slate-200">AI Analysis</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">3-game checkpoint analyses custom-tailored for you.</p>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3 text-left">
              <Trophy className="w-5 h-5 text-emerald-400 mb-1" />
              <h4 className="text-xs font-bold text-slate-200">Cloud Progress</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Durable cloud sync for ratings and report cards.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Panel */}
        <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative">
          
          {/* Form Header Tabs */}
          <div className="flex border-b border-slate-900 mb-6">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                !isSignUp
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                isSignUp
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Input */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Feedback Notifications */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] leading-relaxed p-3 rounded-xl flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] leading-relaxed p-3 rounded-xl flex items-start gap-2.5"
                >
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {!isSupabaseConfigured && !error && !successMsg && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-amber-500/5 border border-amber-500/10 text-amber-500/80 text-[10px] leading-normal p-2.5 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    No Supabase keys are configured. You can type any valid email/password to sign in directly with temporary cloud-synchronization simulation!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/40 text-slate-950 font-bold uppercase tracking-wider text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create Premium Account' : 'Enter Training Studio'}</span>
              )}
            </button>

            {/* Hint message */}
            <p className="text-[10px] text-slate-500 text-center pt-2 leading-relaxed italic">
              *By logging in, you unlock persistent AI coaching cycles, historical report cards, and tactical dashboards.
            </p>

          </form>
        </div>

      </div>

      {/* Sub Footer details */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-slate-600 font-mono z-10">
        GAMBIT CHESS STUDIO • VER 1.2.0 • ALL DATA ENCRYPTED SECURELY
      </footer>
    </div>
  );
};
