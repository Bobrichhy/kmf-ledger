// app/dashboard/analytics/page.tsx
'use client';
import { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LineChart, Line 
} from 'recharts';
import { 
  Activity, Target, Brain, Clock, Shield, Flame, 
  BarChart3, Calendar, Filter, Download
} from 'lucide-react';
import { supabase, kmfStorage } from '@/lib/supabase';

interface Trade {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  entry: number;
  stop: number;
  target: number;
  confluence_score: number;
  setup?: string;
  timeframe?: string;
  tags?: string[];
  outcome: 'win' | 'loss' | 'breakeven';
  created_at: string;
  post_emotions?: { interfered: boolean };
}

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrades() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: remoteTrades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        const localTrades = kmfStorage.getTrades();
        
        const allTrades = [...(remoteTrades || []), ...localTrades].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setTrades(allTrades as Trade[]);
      } catch (e) {
        setTrades(kmfStorage.getTrades() as Trade[]);
      } finally {
        setLoading(false);
      }
    }
    loadTrades();
  }, []);

  const stats = useMemo(() => {
    if (!trades.length) return null;

    // 1. Weekday Performance
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayMap: any = {};
    days.forEach(d => weekdayMap[d] = { name: d, wins: 0, losses: 0, total: 0 });
    
    trades.forEach(t => {
      const day = days[new Date(t.created_at).getDay()];
      weekdayMap[day].total++;
      if (t.outcome === 'win') weekdayMap[day].wins++;
      else if (t.outcome === 'loss') weekdayMap[day].losses++;
    });

    // 2. Setup Performance
    const setupMap: any = {};
    trades.forEach(t => {
      const s = t.setup || 'Unknown';
      if (!setupMap[s]) setupMap[s] = { name: s, wins: 0, losses: 0, total: 0 };
      setupMap[s].total++;
      if (t.outcome === 'win') setupMap[s].wins++;
      else if (t.outcome === 'loss') setupMap[s].losses++;
    });

    // 3. Timeframe Performance
    const tfMap: any = {};
    trades.forEach(t => {
      const tf = t.timeframe || 'Unknown';
      if (!tfMap[tf]) tfMap[tf] = { name: tf, wins: 0, losses: 0, total: 0 };
      tfMap[tf].total++;
      if (t.outcome === 'win') tfMap[tf].wins++;
      else if (t.outcome === 'loss') tfMap[tf].losses++;
    });

    return {
      weekdayData: Object.values(weekdayMap),
      setupData: Object.values(setupMap).sort((a: any, b: any) => b.total - a.total),
      tfData: Object.values(tfMap).sort((a: any, b: any) => b.total - a.total),
    };
  }, [trades]);

  if (loading) return <div>Loading Analytics...</div>;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="section-header">Deep Metrics</div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading gold-text uppercase tracking-tight">Data Intelligence</h1>
        </div>
        <button className="gold-button flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm w-full md:w-auto">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Weekday Performance */}
        <div className="kmf-panel h-[400px] royal-shine">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-heading tracking-wider">WEEKDAY PERFORMANCE</h2>
            <Calendar className="w-5 h-5 text-gold-mid" />
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={stats?.weekdayData}>
              <XAxis dataKey="name" stroke="#787b86" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(212,175,55,0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload?.length) {
                    const data = payload[0].payload;
                    const winRate = ((data.wins / (data.total || 1)) * 100).toFixed(1);
                    return (
                      <div className="bg-[#1E222D] border border-gold-mid/30 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                        <p className="text-gold-bright font-bold mb-1">{data.name}</p>
                        <p className="text-green-win text-xs">Wins: {data.wins}</p>
                        <p className="text-red-loss text-xs">Losses: {data.losses}</p>
                        <p className="text-white text-xs mt-1 font-bold">Win Rate: {winRate}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="wins" stackId="a" fill="#26a69a" radius={[0, 0, 0, 0]} barSize={32} />
              <Bar dataKey="losses" stackId="a" fill="#ef5350" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Setup Performance */}
        <div className="kmf-panel h-[400px] royal-shine">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-heading tracking-wider">SETUP EFFICIENCY</h2>
            <Target className="w-5 h-5 text-gold-mid" />
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart layout="vertical" data={stats?.setupData.slice(0, 5)}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="#e0e3eb" fontSize={12} width={100} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(212,175,55,0.05)' }} />
              <Bar dataKey="wins" stackId="a" fill="#26a69a" barSize={12} radius={[0, 0, 0, 0]} />
              <Bar dataKey="losses" stackId="a" fill="#ef5350" barSize={12} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timeframe Analysis */}
        <div className="kmf-panel h-[400px] royal-shine">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-heading tracking-wider">TIMEFRAME MASTERY</h2>
            <Clock className="w-5 h-5 text-gold-mid" />
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={stats?.tfData}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="total"
                stroke="none"
              >
                {stats?.tfData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={['#FFD700', '#D4AF37', '#9A7D0A', '#1E222D'][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate Over Time */}
        <div className="kmf-panel h-[400px] royal-shine">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold font-heading tracking-wider">CONSISTENCY CURVE</h2>
            <Activity className="w-5 h-5 text-gold-mid" />
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={trades.slice().reverse()}>
              <XAxis dataKey="created_at" hide />
              <YAxis hide />
              <Tooltip />
              <Line 
                type="stepAfter" 
                dataKey="confluence_score" 
                stroke="#FFD700" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, stroke: "#FFD700", strokeWidth: 2, fill: "#131722" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
