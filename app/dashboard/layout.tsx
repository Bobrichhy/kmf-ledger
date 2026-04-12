'use client';

import Link from 'next/link';
import { Crown, Home, BookOpen, LogOut } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
    children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    return (
        <div className="min-h-screen bg-[#0F0F1A] flex flex-col lg:flex-row">
            {/* Royal Sidebar */}
            <div className="w-full lg:w-72 glass-card border-r border-[#FFD700]/40 p-6 lg:p-8 flex flex-col royal-shine">
                <div className="flex items-center gap-4 mb-12">
                    <Crown className="w-12 h-12 text-[#FFD700]" />
                    <div>
                        <h1 className="text-4xl font-bold tracking-tighter" style={{ color: '#FFD700' }}>
                            KMF
                        </h1>
                        <p className="text-[#E5E4E2] text-sm tracking-widest">KINGDOM LEDGER</p>
                    </div>
                </div>

                <nav className="space-y-3 flex-1">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-[#FFD700]/10 text-[#E5E4E2] transition-all"
                    >
                        <Home className="w-5 h-5" /> Dashboard
                    </Link>
                    <Link
                        href="/dashboard/journal"
                        className="flex items-center gap-4 px-6 py-4 rounded-2xl hover:bg-[#FFD700]/10 text-[#E5E4E2] transition-all"
                    >
                        <BookOpen className="w-5 h-5" /> New Journal Entry
                    </Link>
                </nav>

                {isConnected && (
                    <Button
                        onClick={() => disconnect()}
                        className="mt-10 gold-button flex items-center gap-3 w-full"
                    >
                        <LogOut className="w-4 h-4" /> Disconnect Wallet
                    </Button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 lg:p-10 overflow-auto bg-[#0F0F1A]">
                {children}
            </div>
        </div>
    );
}