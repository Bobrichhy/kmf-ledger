'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Crown, Mail, Lock, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` }
        });
        if (error) throw error;
        alert('Verification email sent! Please check your inbox.');
      }
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <div className="flex gap-4 mb-8 p-1 bg-bg-primary rounded-xl border border-border-panel">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isLogin ? 'bg-gold-mid text-bg-primary' : 'text-text-muted hover:text-white'}`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!isLogin ? 'bg-gold-mid text-bg-primary' : 'text-text-muted hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>

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

            <div>
              <label className="block text-[0.6rem] font-bold uppercase tracking-[0.2em] text-text-muted mb-2 ml-1">Sacred Credentials</label>
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

            {error && (
              <div className="p-3 rounded-lg bg-red-dim border border-red-loss/30 text-red-loss text-xs text-center font-medium animate-in fade-in slide-in-from-top-1">
                {error}
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
                  <span className="text-sm tracking-widest">{isLogin ? 'ENTER THE KINGDOM' : 'CLAIM YOUR CROWN'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {!isLogin && (
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
