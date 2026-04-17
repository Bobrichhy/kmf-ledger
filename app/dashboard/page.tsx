// app/dashboard/page.tsx — KMF Dashboard (Tradezella-level analytics)
'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  Crown, Flame, Award, TrendingUp, TrendingDown,
  Clock, BarChart2, Target, AlertTriangle, CheckCircle, Activity
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { supabase, kmfStorage } from '@/lib/supabase';

// ────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────
interface Trade {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  entry: number;
  stop: number;
  target: number;
  confluence_score: number;
  pre_emotions: { level: number; basic: string[]; complex: string[]; note: string };
  post_emotions: { level: number; lesson: string; reflection: string; interfered: boolean };
  outcome: 'win' | 'loss' | 'breakeven';
  wallet_address: string;
  on_chain_hash: string;
  created_at: string;
}

// ────────────────────────────────────────────────────
// Small reusable stat card
// ────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color = 'var(--gold-bright)',
}: { label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Custom Tooltip for charts
// ────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="kmf-panel px-4 py-3 text-sm" style={{ border: '1px solid var(--border-subtle)', minWidth: 120 }}>
      <p className="font-bold mb-1" style={{ color: 'var(--gold-bright)' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ────────────────────────────────────────────────────
// Dashboard Page
// ────────────────────────────────────────────────────
export default function KMFDashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [streaks, setStreaks] = useState({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: remoteTrades } = await supabase
          .from('trades')
          .select('*')
          .order('created_at', { ascending: false });
        
        const localTrades = kmfStorage.getTrades();
        
        // Merge & Sort
        const allTrades = [...(remoteTrades || []), ...localTrades].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setTrades(allTrades as Trade[]);

        const { data: streakData } = await supabase
          .from('kmf_streaks')
          .select('current_streak, best_streak')
          .single();
        if (streakData) {
          setStreaks({ current: streakData.current_streak || 0, best: streakData.best_streak || 0 });
        }
      } catch (_) {
        // Fallback to local only on total fail
        setTrades(kmfStorage.getTrades() as Trade[]);
      }
      finally { setLoading(false); }
    })();
  }, []);

  // ── Computed stats ──────────────────────────────
  const stats = useMemo(() => {
    if (!trades.length) return null;
    const wins = trades.filter(t => t.outcome === 'win');
    const losses = trades.filter(t => t.outcome === 'loss');
    const be = trades.filter(t => t.outcome === 'breakeven');
    const winRate = (wins.length / trades.length) * 100;
    const avgConfluence = trades.reduce((s, t) => s + t.confluence_score, 0) / trades.length;
    const avgRR = trades.reduce((t, tr) => {
      if (tr.entry && tr.stop && tr.target) {
        const risk = Math.abs(tr.entry - tr.stop);
        const reward = Math.abs(tr.target - tr.entry);
        return t + (risk > 0 ? reward / risk : 0);
      }
      return t;
    }, 0) / trades.length;
    const emotionalInterference = trades.filter(t => t.post_emotions?.interfered).length;

    // Pair breakdown
    const pairMap: Record<string, { wins: number; losses: number }> = {};
    trades.forEach(t => {
      if (!pairMap[t.pair]) pairMap[t.pair] = { wins: 0, losses: 0 };
      if (t.outcome === 'win') pairMap[t.pair].wins++;
      else if (t.outcome === 'loss') pairMap[t.pair].losses++;
    });

    // Cumulative P&L (score based on outcome)
    const pnlData = trades.slice().reverse().map((t, i) => ({
      n: i + 1,
      score: t.outcome === 'win' ? 1 : t.outcome === 'loss' ? -1 : 0,
      cumulative: 0,
    }));
    let cum = 0;
    pnlData.forEach(d => { cum += d.score; d.cumulative = cum; });

    // Outcome donut
    const donutData = [
      { name: 'Win', value: wins.length, color: 'var(--green-win)' },
      { name: 'Loss', value: losses.length, color: 'var(--red-loss)' },
      { name: 'BE', value: be.length, color: 'var(--yellow-be)' },
    ].filter(d => d.value > 0);

    // Pair bar chart
    const pairBarData = Object.entries(pairMap)
      .map(([pair, v]) => ({ pair, wins: v.wins, losses: v.losses }))
      .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
      .slice(0, 8);

    return { wins, losses, be, winRate, avgConfluence, avgRR, emotionalInterference, pnlData, donutData, pairBarData };
  }, [trades]);

  // ── Loading ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Crown className="w-12 h-12 animate-pulse" style={{ color: 'var(--gold-bright)' }} />
          <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Loading Kingdom Records…</p>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────
  if (!trades.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'var(--gold-glow)', border: '1px solid var(--border-subtle)' }}
        >
          <Crown className="w-10 h-10" style={{ color: 'var(--gold-bright)' }} />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-bold font-heading gold-text mb-2">No trades yet, King.</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Record your first KMF trade to see your kingdom analytics.</p>
        </div>
        <a href="/dashboard/journal" className="gold-button px-8 py-3 rounded-xl text-sm inline-block">
          Record First Trade
        </a>
      </div>
    );
  }

  // ── Main Dashboard ───────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-header">Performance Overview</div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading gold-text">KMF Dashboard</h1>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest w-fit"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-panel)', color: 'var(--text-muted)' }}
        >
          <Activity className="w-4 h-4" style={{ color: 'var(--green-win)' }} />
          {trades.length} Trades Recorded
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Win Rate" value={`${stats!.winRate.toFixed(1)}%`} sub={`${stats!.wins.length}W / ${stats!.losses.length}L`} icon={Target} color="var(--green-win)" />
        <StatCard label="Total Trades" value={trades.length} sub={`${stats!.be.length} breakeven`} icon={BarChart2} color="var(--blue-info)" />
        <StatCard label="Avg Confluence" value={`${stats!.avgConfluence.toFixed(0)}%`} sub="Kingdom checklist" icon={CheckCircle} color="var(--gold-bright)" />
        <StatCard label="Avg RR Ratio" value={`1:${stats!.avgRR.toFixed(2)}`} sub="Risk / Reward" icon={TrendingUp} color="var(--gold-mid)" />
        <StatCard label="Discipline Streak" value={streaks.current} sub={`Best: ${streaks.best}`} icon={Flame} color="#ff6b35" />
        <StatCard label="Emotional Breaks" value={stats!.emotionalInterference} sub="Emotions interfered" icon={AlertTriangle} color="var(--red-loss)" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Cumulative Performance */}
        <div className="kmf-panel xl:col-span-2">
          <div className="section-header">Cumulative Performance Curve</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={stats!.pnlData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="n" stroke="var(--text-faint)" tick={{ fontSize: 11 }} label={{ value: 'Trade #', position: 'insideBottom', offset: -4, fill: 'var(--text-faint)', fontSize: 11 }} />
              <YAxis stroke="var(--text-faint)" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotoneX" dataKey="cumulative" name="Cum. Score" stroke="var(--gold-mid)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: 'var(--gold-bright)', stroke: 'none' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Win / Loss Donut */}
        <div className="kmf-panel flex flex-col">
          <div className="section-header">Outcome Distribution</div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stats!.donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {stats!.donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              {stats!.donutData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pair Performance Bar ── */}
      {stats!.pairBarData.length > 0 && (
        <div className="kmf-panel">
          <div className="section-header">Pair Performance Breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats!.pairBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="pair" stroke="var(--text-faint)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-faint)" tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
              <Bar dataKey="wins" name="Wins" fill="var(--green-win)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="losses" name="Losses" fill="var(--red-loss)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent Trades Table ── */}
      <div className="kmf-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="section-header mb-0">Recent Journal Entries</div>
          <a href="/dashboard/journal" className="text-xs font-semibold tracking-wide transition-colors" style={{ color: 'var(--gold-mid)' }}>
            + New Entry
          </a>
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="kmf-table min-w-[800px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pair</th>
                <th>Direction</th>
                <th>Entry</th>
                <th>Stop</th>
                <th>Target</th>
                <th>Confluence</th>
                <th>Outcome</th>
                <th>Emotion ⚠</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 12).map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-muted)' }} className="font-mono text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="font-bold tracking-wider" style={{ color: 'var(--text-primary)' }}>{t.pair}</td>
                  <td>
                    {t.direction === 'long'
                      ? <span className="badge-win">▲ LONG</span>
                      : <span className="badge-loss">▼ SHORT</span>}
                  </td>
                  <td className="font-mono font-semibold">{t.entry}</td>
                  <td className="font-mono" style={{ color: 'var(--red-loss)' }}>{t.stop}</td>
                  <td className="font-mono" style={{ color: 'var(--green-win)' }}>{t.target}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="confluence-bar w-16">
                        <div
                          className="confluence-bar-fill"
                          style={{
                            width: `${t.confluence_score}%`,
                            background: t.confluence_score >= 80 ? 'var(--green-win)' : t.confluence_score >= 60 ? 'var(--gold-mid)' : 'var(--red-loss)'
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono" style={{ color: t.confluence_score >= 80 ? 'var(--green-win)' : 'var(--text-muted)' }}>
                        {t.confluence_score}%
                      </span>
                    </div>
                  </td>
                  <td>
                    {t.outcome === 'win' && <span className="badge-win">WIN</span>}
                    {t.outcome === 'loss' && <span className="badge-loss">LOSS</span>}
                    {t.outcome === 'breakeven' && <span className="badge-be">BE</span>}
                  </td>
                  <td>
                    {t.post_emotions?.interfered
                      ? <span className="badge-loss">⚠ Yes</span>
                      : <span style={{ color: 'var(--text-faint)' }} className="text-xs">–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}