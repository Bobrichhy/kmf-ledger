'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Crown, LayoutDashboard, BookOpen, BarChart3,
  TrendingUp, LogOut, Wallet, Calendar, Target, Menu, X
} from 'lucide-react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface DashboardLayoutProps { children: ReactNode; }

const navItems = [
  { href: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/journal', icon: BookOpen,         label: 'Journal Entry' },
  { href: '/dashboard/analytics', icon: BarChart3,       label: 'Deep Analytics' },
  { href: '/dashboard/calendar',  icon: Calendar,        label: 'Trading Calendar' },
  { href: '/dashboard/backtest',  icon: Target,          label: 'Backtesting Lab' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect } = useConnect();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-7 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-panel)' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--gold-glow)', border: '1px solid var(--border-subtle)' }}
        >
          <Crown className="w-5 h-5" style={{ color: 'var(--gold-bright)' }} />
        </div>
        <div>
          <span className="gold-text text-xl font-bold tracking-wider font-heading block">KMF</span>
          <span className="text-[0.6rem] tracking-[0.22em] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Kingdom Ledger</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <p className="px-3 mb-3 text-[0.65rem] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-faint)' }}>Navigation</p>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
              style={{
                background: active ? 'var(--gold-glow)' : 'transparent',
                border: active ? '1px solid var(--border-subtle)' : '1px solid transparent',
                color: active ? 'var(--gold-bright)' : 'var(--text-muted)',
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0 transition-colors" style={{ color: active ? 'var(--gold-bright)' : undefined }} />
              <span className="text-sm font-medium tracking-wide">{label}</span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--gold-bright)' }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout / Footer Branding */}
      <div className="px-4 py-5 mt-auto space-y-3" style={{ borderTop: '1px solid var(--border-panel)' }}>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all"
          style={{ background: 'var(--red-dim)', color: 'var(--red-loss)', border: '1px solid rgba(239,83,80,0.2)' }}
        >
          <LogOut className="w-4 h-4" /> Exit Kingdom
        </button>
        <div className="text-center pt-2">
          <p className="text-[0.6rem] tracking-[0.3em] font-bold uppercase" style={{ color: 'var(--text-faint)' }}>
            Kingdom Minded Financial
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: 'var(--bg-primary)' }}>
      
      {/* Mobile Header */}
      <header 
        className="lg:hidden flex items-center justify-between px-5 py-4 royal-shine z-50 sticky top-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-panel)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gold-glow)', border: '1px solid var(--border-subtle)' }}>
            <Crown className="w-4 h-4" style={{ color: 'var(--gold-bright)' }} />
          </div>
          <span className="font-heading font-bold gold-text tracking-wider">KMF Ledger</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--gold-bright)' }}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside
        className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 flex-col royal-shine h-screen sticky top-0"
        style={{
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-panel)',
        }}
      >
        <NavContent />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 flex flex-col pt-16 animate-in fade-in slide-in-from-top-4 duration-300 h-screen"
          style={{ background: 'var(--bg-primary)' }}
        >
          <NavContent />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="p-5 lg:p-8 max-w-[1600px] mx-auto">
          {loading ? (
             <div className="flex items-center justify-center h-[60vh]">
               <div className="w-8 h-8 border-2 border-gold-mid/30 border-t-gold-mid rounded-full animate-spin" />
             </div>
          ) : children}
        </div>
      </main>
    </div>
  );
}