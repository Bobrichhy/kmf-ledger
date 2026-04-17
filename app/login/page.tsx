'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Crown, Mail, Lock, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` }
        });
        if (error) throw error;
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/dashboard`
        });
        if (error) throw error;
        setMessage('Password reset link sent to your email!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-glow blur-[120px] rounded-full opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-info/10 blur-[120px] rounded-full opacity-10" />

      <div className="w-full max-w-md z-10">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-glow border border-gold-mid/30 mb-6 royal-shine">
            <Crown className="w-8 h-8 text-gold-bright" />
          </div>
          <h1 className="text-4xl font-bold font-heading gold-text tracking-tight mb-2 uppercase">KMF LEDGER</h1>
          <p className="text-sm text-text-muted tracking-widest uppercase">The Sovereign Trading Journal</p>
        </div>

        {/* Auth Card */}
        <div className="kmf-panel royal-shine border-gold-mid/20">
          {mode !== 'forgot' && (
            <div className="flex gap-4 mb-8 p-1 bg-bg-primary rounded-xl border border-border-panel">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'login' ? 'bg-gold-mid text-bg-primary' : 'text-text-muted hover:text-white'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${mode === 'signup' ? 'bg-gold-mid text-bg-primary' : 'text-text-muted hover:text-white'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-8 text-center">
              <h2 className="text-xl font-bold text-white mb-2 font-heading">Reset Credentials</h2>
              <p className="text-xs text-text-muted">Enter your imperial email to recover access.</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-[0.6rem] font-bold uppercase tracking-[0.2em] text-text-muted mb-2 ml-1">Imperial Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="kmf-input pl-12 h-13"
                  placeholder="king@kmf.com"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-[0.6rem] font-bold uppercase tracking-[0.2em] text-text-muted">Sacred Credentials</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[0.6rem] font-bold text-gold-mid hover:text-gold-bright transition-colors uppercase tracking-widest"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="kmf-input pl-12 h-13"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-dim border border-red-loss/30 text-red-loss text-xs text-center font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-green-dim border border-green-win/30 text-green-win text-xs text-center font-medium animate-in fade-in slide-in-from-top-1">
                {message}
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="gold-button w-full py-4 rounded-xl flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm tracking-widest">
                    {mode === 'login' ? 'ENTER THE KINGDOM' : mode === 'signup' ? 'CLAIM YOUR CROWN' : 'SEND RESET LINK'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode !== 'forgot' && (
            <>
              <div className="relative my-8 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-panel"></div></div>
                <span className="relative bg-bg-secondary px-4 text-[0.6rem] text-text-faint uppercase tracking-[0.3em] font-bold">OR</span>
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full py-3.5 rounded-xl border border-border-panel hover:border-gold-mid/30 text-white text-xs font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.48-.98 7.31-2.67l-3.57-2.77c-1 .67-2.27 1.07-3.74 1.07-2.88 0-5.32-1.95-6.2-4.57H2.18v2.87C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.8 14.06c-.23-.67-.36-1.39-.36-2.06s.13-1.39.36-2.06V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.62-2.87z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.62 2.87c.88-2.62 3.32-4.57 6.2-4.57z"/>
                </svg>
                {mode === 'login' ? 'LOGIN WITH GOOGLE' : 'SIGN UP WITH GOOGLE'}
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <button 
              onClick={() => setMode('login')}
              className="w-full mt-6 text-[0.6rem] font-bold text-text-faint hover:text-white transition-colors uppercase tracking-[0.3em]"
            >
              ← Back to Login
            </button>
          )}

          {mode === 'signup' && (
            <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-blue-info/5 border border-blue-info/10">
              <ShieldCheck className="w-5 h-5 text-blue-info flex-shrink-0 mt-0.5" />
              <p className="text-[0.65rem] text-text-muted leading-relaxed">
                By joining, you agree to uphold the divine laws of trading discipline and kingdom risk management.
              </p>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-[0.65rem] font-bold text-text-faint uppercase tracking-[0.3em] hover:text-gold-mid transition-colors">
            ← Return to Sanctuary
          </Link>
        </div>
      </div>
    </div>
  );
}
