// app/dashboard/calendar/page.tsx
'use client';
import { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Crown, TrendingUp, TrendingDown,
  Info, Calendar as CalendarIcon, CheckCircle2, XCircle
} from 'lucide-react';
import { supabase, kmfStorage } from '@/lib/supabase';

interface Trade {
  id: string;
  pair: string;
  outcome: 'win' | 'loss' | 'breakeven';
  created_at: string;
}

export default function TradingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: remoteTrades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id);
        
        const localTrades = kmfStorage.getTrades();
        const allTrades = [...(remoteTrades || []), ...localTrades];
        
        setTrades(allTrades as Trade[]);
      } catch (e) {
        setTrades(kmfStorage.getTrades() as Trade[]);
      } finally {
        setLoading(false);
      }
    }
    fetchTrades();
  }, []);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    
    // Previous month's padding
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, trades: [] });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = new Date(year, month, i).toISOString().split('T')[0];
      const dayTrades = trades.filter(t => t.created_at.startsWith(dateString));
      
      let outcome: 'win' | 'loss' | 'neutral' = 'neutral';
      const wins = dayTrades.filter(t => t.outcome === 'win').length;
      const losses = dayTrades.filter(t => t.outcome === 'loss').length;
      
      if (wins > losses) outcome = 'win';
      else if (losses > wins) outcome = 'loss';
      else if (dayTrades.length > 0) outcome = 'neutral';

      days.push({ day: i, trades: dayTrades, outcome, wins, losses });
    }

    return days;
  }, [currentDate, trades]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  if(loading) return <div className="p-10 text-center">Loading Archives...</div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-header">Time-Series Records</div>
          <h1 className="text-4xl font-bold font-heading gold-text uppercase">Trading Calendar</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-[#1E222D] border border-gold-mid/20 p-2 rounded-2xl">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gold-mid/10 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-gold-mid" />
          </button>
          <div className="text-center min-w-[140px]">
            <h2 className="text-lg font-bold font-heading uppercase text-white tracking-widest leading-tight">{monthName}</h2>
            <p className="text-[0.6rem] text-gold-mid/60 tracking-[0.2em] font-bold">{year}</p>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gold-mid/10 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5 text-gold-mid" />
          </button>
        </div>
      </div>

      <div className="kmf-panel p-4 lg:p-6 royal-shine">
        {/* Calendar Grid Header */}
        <div className="grid grid-cols-7 mb-4 border-b border-white/5 pb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold-mid/50">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid Body */}
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {calendarData.map((d, i) => (
            <div 
              key={i} 
              className={`min-h-[100px] md:min-h-[140px] p-2 rounded-2xl border transition-all duration-300 relative group
                ${d.day ? 'bg-[#131722]/50' : 'opacity-0 pointer-events-none'}
                ${d.outcome === 'win' ? 'border-green-win/30 hover:border-green-win/60 bg-green-win/5' : 
                  d.outcome === 'loss' ? 'border-red-loss/30 hover:border-red-loss/60 bg-red-loss/5' : 
                  'border-white/5 hover:border-gold-mid/30'}
                ${d.day ? 'hover:scale-[1.02] cursor-pointer' : ''}
              `}
            >
              {d.day && (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold font-mono ${d.outcome === 'win' ? 'text-green-win' : d.outcome === 'loss' ? 'text-red-loss' : 'text-white/40'}`}>
                      {d.day.toString().padStart(2, '0')}
                    </span>
                    {d.trades.length > 0 && (
                      <div className="flex gap-1">
                        {d.outcome === 'win' && <CheckCircle2 className="w-3 h-3 text-green-win" />}
                        {d.outcome === 'loss' && <XCircle className="w-3 h-3 text-red-loss" />}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {d.trades.slice(0, 3).map((t, idx) => (
                      <div 
                        key={idx} 
                        className={`text-[0.6rem] px-1.5 py-0.5 rounded-sm font-bold tracking-tight truncate border
                          ${t.outcome === 'win' ? 'bg-green-win/10 border-green-win/20 text-green-win' : 
                            t.outcome === 'loss' ? 'bg-red-loss/10 border-red-loss/20 text-red-loss' : 
                            'bg-white/5 border-white/10 text-white/50'}
                        `}
                      >
                        {t.pair.split(':')[1] || t.pair}
                      </div>
                    ))}
                    {d.trades.length > 3 && (
                      <div className="text-[0.5rem] text-center text-white/30 font-bold uppercase tracking-tighter">
                        + {d.trades.length - 3} more
                      </div>
                    )}
                  </div>

                  {/* Hover stats */}
                  <div className="absolute inset-0 bg-[#1E222D] rounded-2xl p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2 pointer-events-none z-10 border border-gold-mid/40 shadow-2xl">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-gold-mid">{monthName} {d.day}</p>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-green-win font-bold text-lg leading-none">{d.wins}</p>
                        <p className="text-[0.5rem] uppercase text-green-win/50 font-bold">Wins</p>
                      </div>
                      <div className="text-center">
                        <p className="text-red-loss font-bold text-lg leading-none">{d.losses}</p>
                        <p className="text-[0.5rem] uppercase text-red-loss/50 font-bold">Losses</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/30">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-win/5 border border-green-win/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-win"></div>
          Profit Day
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-loss/5 border border-red-loss/20 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-red-loss"></div>
          Loss Day
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          No Trades
        </div>
      </div>
    </div>
  );
}
