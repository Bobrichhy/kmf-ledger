// app/dashboard/page.tsx

'use client';
import { useEffect, useState } from 'react';
import { Crown, Flame, Award, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

export default function KMFDashboard() {
    const [trades, setTrades] = useState<any[]>([]);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch all trades
            const { data: tradeData, error } = await supabase
                .from('trades')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) console.error("Error fetching trades:", error);
            else if (tradeData) setTrades(tradeData);

            // Fetch streak data from the view we created earlier
            const { data: streakData } = await supabase
                .from('kmf_streaks')
                .select('current_streak, best_streak')
                .single();

            if (streakData) {
                setCurrentStreak(streakData.current_streak || 0);
                setBestStreak(streakData.best_streak || 0);
            }
        } catch (err) {
            console.error("Dashboard data error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Sample data for chart (replace with real data later)
    const emotionData = [
        { name: 'Calm', winRate: 82 },
        { name: 'Moderate', winRate: 65 },
        { name: 'High Emotion', winRate: 34 },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-2xl text-[#FFD700]">Loading Kingdom Records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <Crown className="w-14 h-14 text-[#FFD700]" />
                    <div>
                        <h1 className="text-5xl font-bold tracking-tighter" style={{ color: '#FFD700' }}>
                            KMF DASHBOARD
                        </h1>
                        <p className="text-[#E5E4E2] text-lg">Kingdom Minded Performance Overview</p>
                    </div>
                </div>

                {/* Current Streak */}
                <div className="glass-card px-8 py-6 rounded-3xl flex items-center gap-4 min-w-[220px]">
                    <Flame className="w-10 h-10 text-[#FFD700]" />
                    <div>
                        <div className="text-5xl font-bold text-[#FFD700]">{currentStreak}</div>
                        <div className="text-[#E5E4E2] text-sm">Current Discipline Streak</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Best Streak Card */}
                <div className="glass-card p-8 rounded-3xl">
                    <Award className="w-12 h-12 text-[#FFD700] mb-6" />
                    <div className="text-6xl font-bold text-[#FFD700] mb-2">{bestStreak}</div>
                    <div className="text-[#E5E4E2]">Best Streak Record</div>
                    <p className="text-sm text-[#E5E4E2]/70 mt-4">High-confluence + calm emotion days</p>
                </div>

                {/* Emotional Analytics */}
                <div className="lg:col-span-2 glass-card p-8 rounded-3xl">
                    <div className="flex items-center gap-3 mb-8">
                        <TrendingUp className="w-8 h-8 text-[#FFD700]" />
                        <h2 className="text-3xl font-bold" style={{ color: '#FFD700' }}>Emotional Performance</h2>
                    </div>

                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={emotionData}>
                            <XAxis dataKey="name" stroke="#E5E4E2" />
                            <YAxis stroke="#E5E4E2" />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="winRate"
                                stroke="#FFD700"
                                strokeWidth={6}
                                dot={{ fill: '#FFD700', r: 7 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Trades */}
            <div className="glass-card p-8 rounded-3xl">
                <h2 className="text-3xl font-bold mb-8" style={{ color: '#FFD700' }}>Recent Kingdom Trades</h2>

                {trades.length === 0 ? (
                    <p className="text-[#E5E4E2]/70 text-center py-12">No trades recorded yet. Start journaling!</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-full">
                            <thead>
                                <tr className="border-b border-[#FFD700]/30">
                                    <th className="text-left py-5">Pair</th>
                                    <th className="text-left py-5">Confluence</th>
                                    <th className="text-left py-5">Outcome</th>
                                    <th className="text-left py-5">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.slice(0, 8).map((trade, index) => (
                                    <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                                        <td className="py-5 font-medium">{trade.pair}</td>
                                        <td className="py-5">
                                            <span className="text-[#FFD700] font-bold">{trade.confluence_score}%</span>
                                        </td>
                                        <td className="py-5">
                                            <span className={`px-6 py-1.5 rounded-full text-xs font-medium ${trade.outcome === 'win'
                                                ? 'bg-[#FFD700]/20 text-[#FFD700]'
                                                : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {trade.outcome?.toUpperCase() || '---'}
                                            </span>
                                        </td>
                                        <td className="py-5 text-[#E5E4E2]/70 text-sm">
                                            {new Date(trade.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}