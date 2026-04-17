'use client';
import { useState, useMemo } from 'react';
import { 
  Flame, Target, Zap, RefreshCw, Activity, TrendingDown
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function BacktestingLab() {
  const [stats, setStats] = useState({
    winRate: 50,
    avgRR: 2,
    startingBalance: 1000,
    riskPerTrade: 1, // 1%
  });

  const simulationData = useMemo(() => {
    const paths = 50;
    const trades = 50;
    const allPaths = [];

    for (let p = 0; p < paths; p++) {
      let balance = stats.startingBalance;
      const pathData = [{ n: 0, balance }];
      
      for (let t = 1; t <= trades; t++) {
        const isWin = Math.random() * 100 < stats.winRate;
        const riskAmount = (balance * stats.riskPerTrade) / 100;
        
        if (isWin) balance += riskAmount * stats.avgRR;
        else balance -= riskAmount;
        
        pathData.push({ n: t, balance });
      }
      allPaths.push(pathData);
    }

    const chartData = [];
    for (let t = 0; t <= trades; t++) {
      const entry: any = { n: t };
      allPaths.forEach((p, idx) => {
        entry[`p${idx}`] = p[t].balance;
      });
      chartData.push(entry);
    }
    return chartData;
  }, [stats]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="section-header">Simulation and Strategy</div>
          <h1 className="text-3xl md:text-4xl font-bold font-heading gold-text uppercase">Backtesting Lab</h1>
        </div>
        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gold-mid/10 border border-gold-mid/30 text-gold-bright text-xs font-bold w-fit sm:w-auto">
          <Zap className="w-4 h-4 fill-gold-bright" /> STRATEGY ENGINE ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="kmf-panel space-y-6">
          <div className="section-header">Strategy Parameters</div>
          <div className="space-y-4">
            <div>
              <label className="block text-[0.6rem] font-bold uppercase tracking-widest text-white/40 mb-2">Win Rate (%)</label>
              <input 
                type="range" min="1" max="99" value={stats.winRate} 
                onChange={e => setStats({...stats, winRate: parseInt(e.target.value)})}
                className="w-full accent-gold-mid"
              />
              <div className="flex justify-between mt-1 font-mono text-xs text-gold-mid font-bold">
                <span>1%</span>
                <span className="text-lg">{stats.winRate}%</span>
                <span>99%</span>
              </div>
            </div>
            <div>
              <label className="block text-[0.6rem] font-bold uppercase tracking-widest text-white/40 mb-2">Risk Reward Ratio (1:X)</label>
              <input 
                type="number" step="0.1" value={stats.avgRR} 
                onChange={e => setStats({...stats, avgRR: parseFloat(e.target.value)})}
                className="kmf-input font-mono text-gold-bright font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.6rem] font-bold uppercase tracking-widest text-white/40 mb-2">Starting Balance</label>
                <input 
                  type="number" value={stats.startingBalance} 
                  onChange={e => setStats({...stats, startingBalance: parseInt(e.target.value)})}
                  className="kmf-input font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[0.6rem] font-bold uppercase tracking-widest text-white/40 mb-2">Risk per Trade (%)</label>
                <input 
                  type="number" step="0.5" value={stats.riskPerTrade} 
                  onChange={e => setStats({...stats, riskPerTrade: parseFloat(e.target.value)})}
                  className="kmf-input font-mono text-xs"
                />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 space-y-3">
            <button className="gold-button w-full py-4 rounded-xl flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5" /> REGENERATE SIMULATION
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 kmf-panel royal-shine relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold font-heading tracking-tight">MONTE CARLO SIMULATOR</h2>
              <p className="text-[0.6rem] text-white/30 font-bold uppercase tracking-widest mt-1">50 Theoretical Equity Path Projections</p>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simulationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="n" hide />
                <YAxis hide domain={['auto', 'auto']} />
                {Array.from({ length: 50 }).map((_, i) => (
                  <Line 
                    key={i} 
                    type="monotone" 
                    dataKey={`p${i}`} 
                    stroke={`hsla(${212 + (i * 2)}, 70%, 50%, 0.15)`} 
                    strokeWidth={1} 
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="kmf-panel border-l-4 border-l-green-win flex items-center justify-between">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Ideal Target Setup</p>
            <h3 className="text-xl font-bold text-white mt-1">Higher Timeframe POI</h3>
          </div>
          <Activity className="w-10 h-10 text-green-win opacity-20" />
        </div>
        <div className="kmf-panel border-l-4 border-l-gold-mid flex items-center justify-between">
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/30">Historical Max Drawdown</p>
            <h3 className="text-xl font-bold text-white mt-1">12.4% Projection</h3>
          </div>
          <TrendingDown className="w-10 h-10 text-gold-mid opacity-20" />
        </div>
      </div>
    </div>
  );
}
