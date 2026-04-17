// app/dashboard/journal/page.tsx — KMF Journal (Superior Build)
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase, kmfStorage } from '@/lib/supabase';
import {
  Crown, CheckCircle, ChevronRight, Zap, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, BarChart3,
  Brain, Heart, Target, Shield, BookOpen, Flame, LayoutDashboard
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// ── TradingView Chart (SSR-safe) ──────────────────────────────
const AdvancedRealTimeChart = dynamic(
  () => import('react-ts-tradingview-widgets').then(m => m.AdvancedRealTimeChart),
  { ssr: false, loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#131722' }}>
      <div className="flex flex-col items-center gap-3">
        <BarChart3 className="w-10 h-10 animate-pulse" style={{ color: 'var(--gold-mid)' }} />
        <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Loading Chart…</p>
      </div>
    </div>
  )}
);

// ── Constants ─────────────────────────────────────────────────
const BASIC_EMOTIONS = ['Calm', 'Excited', 'Focused', 'Fearful', 'Neutral', 'Confident'];
const COMPLEX_EMOTIONS = ['FOMO', 'Revenge', 'Overconfidence', 'Hesitation', 'Anxiety', 'Greed', 'Fear of Missing', 'Impatience'];

const CONFLUENCE_STEPS = [
  { key: 'marketDirection', label: 'Market Direction',    desc: 'Higher timeframe bias confirmed — trending structure',          icon: TrendingUp },
  { key: 'wyckoff',        label: 'Wyckoff Phase',        desc: 'Accumulation / Distribution + Spring or Upthrust visible',     icon: BarChart3 },
  { key: 'priceAction',    label: 'Price Action Signal',  desc: 'Reversal or continuation candle pattern confirmed',             icon: Zap },
  { key: 'mss',            label: 'Market Structure Shift', desc: 'Clear MSS with displacement — institutional move confirmed',   icon: Shield },
  { key: 'poiOb',          label: 'POI + Order Block',    desc: 'Fresh institutional zone: Order Block or Fair Value Gap',       icon: Target },
];

const TRADABLE_PAIRS = [
  // Forex Majors
  'EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD',
  // Forex Minors
  'EURGBP','EURJPY','GBPJPY','AUDJPY','EURAUD','GBPAUD','EURCAD','GBPCAD',
  'AUDCAD','AUDNZD','NZDJPY','CADJPY','CHFJPY','EURCHF','EURNZD','GBPNZD',
  // Crypto
  'BINANCE:BTCUSDT','BINANCE:ETHUSDT','BINANCE:SOLUSDT','BINANCE:XRPUSDT',
  'BINANCE:BNBUSDT','BINANCE:ADAUSDT','BINANCE:DOGEUSDT','BINANCE:AVAXUSDT',
  // Commodities
  'OANDA:XAUUSD','OANDA:XAGUSD','NYMEX:CL1!','NYMEX:NG1!',
  // Indices
  'CAPITALCOM:US30','CAPITALCOM:US100','CAPITALCOM:SPX500',
  'FOREXCOM:UK100','FOREXCOM:GER40','FOREXCOM:JPN225',
];

// Build Yahoo Finance ticker from KMF pair string
function buildYahooTicker(raw: string): string {
  const pair = raw.includes(':') ? raw.split(':')[1] : raw;
  const map: Record<string, string> = {
    XAUUSD: 'GC=F', XAGUSD: 'SI=F',
    US30: '^DJI', US100: '^NDX', SPX500: '^GSPC',
    UK100: '^FTSE', GER40: '^GDAXI', JPN225: '^N225',
    'CL1!': 'CL=F', 'NG1!': 'NG=F',
    BTCUSDT: 'BTC-USD', ETHUSDT: 'ETH-USD',
    SOLUSDT: 'SOL-USD', XRPUSDT: 'XRP-USD',
    BNBUSDT: 'BNB-USD', ADAUSDT: 'ADA-USD',
    DOGEUSDT: 'DOGE-USD', AVAXUSDT: 'AVAX-USD',
  };
  if (map[pair]) return map[pair];
  if (pair.endsWith('USDT')) return pair.replace('USDT', '-USD');
  if (pair.length === 6) return `${pair}=X`;
  return pair;
}

// ── Default Form State ─────────────────────────────────────────
const defaultForm = () => ({
  pair: 'EURUSD',
  direction: 'long' as 'long' | 'short',
  entry: '',
  stop: '',
  target: '',
  lotSize: '0.01',
  setup: '',
  timeframe: '1H',
  checklist: {
    marketDirection: false,
    wyckoff: false,
    priceAction: false,
    mss: false,
    poiOb: false,
  },
  preEmotions: { level: 5, basic: [] as string[], complex: [] as string[], note: '' },
  postEmotions: { level: 5, lesson: '', reflection: '', interfered: false },
  confluenceScore: 0,
  outcome: 'win' as 'win' | 'loss' | 'breakeven',
  tags: [] as string[],
});

// ── Component ─────────────────────────────────────────────────
export default function KMFJournalPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [form, setForm] = useState(defaultForm());
  const [livePrice, setLivePrice] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Computed RR ratio
  const rrRatio = (() => {
    const e = parseFloat(form.entry);
    const s = parseFloat(form.stop);
    const t = parseFloat(form.target);
    if (!e || !s || !t) return null;
    const risk = Math.abs(e - s);
    const reward = Math.abs(t - e);
    return risk > 0 ? (reward / risk).toFixed(2) : null;
  })();

  // ── Live Price Fetch ───────────────────────────────────────
  const fetchLivePrice = useCallback(async (pairStr: string) => {
    if (!pairStr) return;
    setPriceLoading(true);
    const ticker = buildYahooTicker(pairStr.toUpperCase());
    try {
      const url = `https://api.allorigins.win/get?url=${encodeURIComponent(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`
      )}`;
      const res = await fetch(url);
      const json = await res.json();
      const parsed = JSON.parse(json.contents);
      const price: number | undefined = parsed?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price && price > 0) {
        const fmt = price > 10 ? price.toFixed(2) : price.toFixed(5);
        setLivePrice(fmt);
        setForm(prev => {
          const updates: Partial<typeof prev> = { entry: fmt };
          const slPct = 0.01;
          const tpPct = 0.02;
          const isLong = prev.direction === 'long';
          if (!prev.stop) {
            const sl = isLong ? price * (1 - slPct) : price * (1 + slPct);
            updates.stop = sl > 10 ? sl.toFixed(2) : sl.toFixed(5);
          }
          if (!prev.target) {
            const tp = isLong ? price * (1 + tpPct) : price * (1 - tpPct);
            updates.target = tp > 10 ? tp.toFixed(2) : tp.toFixed(5);
          }
          return { ...prev, ...updates };
        });
      }
    } catch (_) {
      setLivePrice(null);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      // Only fetch live price if pair is valid and not already fetching
      if (form.pair) fetchLivePrice(form.pair);
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pair]); // Removed form.direction to prevent resetting SL/TP on direction change

  // ── Checklist update ──────────────────────────────────────
  const updateChecklist = (key: keyof typeof form.checklist, val: boolean) => {
    const next = { ...form.checklist, [key]: val };
    const score = Math.round((Object.values(next).filter(Boolean).length / CONFLUENCE_STEPS.length) * 100);
    setForm(prev => ({ ...prev, checklist: next, confluenceScore: score }));
  };

  const toggleEmotion = (type: 'basic' | 'complex', emo: string) => {
    const arr = form.preEmotions[type];
    const next = arr.includes(emo) ? arr.filter(e => e !== emo) : [...arr, emo];
    setForm(prev => ({ ...prev, preEmotions: { ...prev.preEmotions, [type]: next } }));
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (form.confluenceScore < 80) {
      alert('⚠️ Confluence below 80%. A Kingdom Minded Trader waits for confirmation.');
      return;
    }
    setIsSubmitting(true);
    try {
      const tradeObj = {
        pair: form.pair,
        direction: form.direction,
        entry: parseFloat(form.entry) || 0,
        stop: parseFloat(form.stop) || 0,
        target: parseFloat(form.target) || 0,
        lot_size: parseFloat(form.lotSize) || 0.01,
        setup: form.setup,
        timeframe: form.timeframe,
        confluence_score: form.confluenceScore,
        pre_emotions: form.preEmotions,
        post_emotions: form.postEmotions,
        outcome: form.outcome,
        tags: form.tags,
        wallet_address: address || 'Local User',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        on_chain_hash: '',
        created_at: new Date().toISOString(),
      };

      // Attempt to save to Supabase directly (no signature needed)
      // If it fails, kmfStorage.saveTrade will handle the local backup
      try {
        const { error: sbError } = await supabase.from('trades').insert(tradeObj);
        if (sbError) throw sbError;
      } catch (err) {
        console.warn('Supabase save failed, falling back to local storage:', err);
        kmfStorage.saveTrade(tradeObj);
      }

      // Success UI handling
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setForm(defaultForm());
        setLivePrice(null);
      }, 4000);

    } catch (err) {
      console.error('Final Submission Error:', err);
      alert('Error recording trade. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success Screen ────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div
            className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
            style={{ background: 'var(--gold-glow)', border: '1px solid var(--border-subtle)' }}
          >
            <CheckCircle className="w-12 h-12" style={{ color: 'var(--gold-bright)' }} />
          </div>
          <div>
            <h2 className="text-4xl font-bold font-heading gold-text">Trade Recorded!</h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              Your discipline is now sealed on-chain. The Kingdom never forgets.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => { setShowSuccess(false); setForm(defaultForm()); }}
              className="gold-button px-10 py-3.5 rounded-xl text-sm w-full sm:w-auto"
            >
              Record Another
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-10 py-3.5 rounded-xl text-sm font-bold uppercase transition-all w-full sm:w-auto flex items-center justify-center gap-2"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-panel)', color: 'var(--text-primary)' }}
            >
              <LayoutDashboard className="w-4 h-4" />
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Confluence ring color ─────────────────────────────────
  const confluenceColor = form.confluenceScore >= 80
    ? 'var(--green-win)'
    : form.confluenceScore >= 60
    ? 'var(--gold-mid)'
    : 'var(--red-loss)';

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-header">New Entry</div>
          <h1 className="text-3xl font-bold font-heading gold-text">KMF Journal</h1>
        </div>
        {/* Confluence Badge */}
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl w-fit"
          style={{
            background: `${confluenceColor}18`,
            border: `1px solid ${confluenceColor}40`,
          }}
        >
          <div>
            <p className="text-[0.65rem] tracking-widest uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Confluence</p>
            <p className="text-2xl font-bold font-mono" style={{ color: confluenceColor }}>
              {form.confluenceScore}%
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              background: `conic-gradient(${confluenceColor} ${form.confluenceScore * 3.6}deg, var(--bg-tertiary) 0deg)`,
            }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs"
              style={{ background: 'var(--bg-secondary)', color: confluenceColor }}
            >
              {CONFLUENCE_STEPS.filter(s => form.checklist[s.key as keyof typeof form.checklist]).length}/5
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SECTION 1 — Live Chart
          ════════════════════════════════════════════════════ */}
      <section className="kmf-panel p-0 overflow-hidden h-[400px] md:h-[680px]">
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--border-panel)' }}
        >
          <div className="section-header mb-0">Live Chart Analysis</div>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--green-win)' }}>
            <span className="live-dot" />
            {priceLoading ? 'Fetching price…' : livePrice ? `Market: ${livePrice}` : 'Live Feed'}
          </div>
        </div>
        <div style={{ height: 'calc(100% - 45px)' }}>
          <AdvancedRealTimeChart
            symbol={form.pair || 'EURUSD'}
            theme="dark"
            style="1"
            allow_symbol_change={true}
            save_image={false}
            hide_side_toolbar={false}
            autosize
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 2 — Trade Setup
          ════════════════════════════════════════════════════ */}
      <section className="kmf-panel">
        <div className="section-header">Trade Setup</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">

          {/* Pair */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Pair / Symbol
            </label>
            <div className="relative">
              <input
                type="text"
                list="tradable-pairs"
                value={form.pair}
                onChange={e => {
                  const v = e.target.value.toUpperCase();
                  setForm(prev => ({ ...prev, pair: v, stop: '', target: '' }));
                }}
                className="kmf-input font-mono font-bold tracking-wider text-sm pr-10"
                placeholder="e.g. EURUSD"
                style={{ color: 'var(--gold-bright)' }}
              />
              <button
                onClick={() => { setForm(prev => ({ ...prev, stop: '', target: '' })); fetchLivePrice(form.pair); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                title="Refresh live price"
              >
                <RefreshCw className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
              <datalist id="tradable-pairs">
                {TRADABLE_PAIRS.map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
          </div>

          {/* Direction */}
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Direction</label>
            <div className="flex gap-2">
              {(['long', 'short'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, direction: d }))}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all"
                  style={{
                    background: form.direction === d
                      ? d === 'long' ? 'var(--green-dim)' : 'var(--red-dim)'
                      : 'var(--bg-primary)',
                    borderColor: form.direction === d
                      ? d === 'long' ? 'var(--green-win)' : 'var(--red-loss)'
                      : 'var(--border-panel)',
                    color: form.direction === d
                      ? d === 'long' ? 'var(--green-win)' : 'var(--red-loss)'
                      : 'var(--text-muted)',
                  }}
                >
                  {d === 'long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Entry */}
          <div className="col-span-2 xl:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
              Entry
              {livePrice && <span className="ml-2 text-[0.6rem] font-normal" style={{ color: 'var(--green-win)' }}>● LIVE</span>}
            </label>
            <input type="number" step="any" value={form.entry}
              onChange={e => setForm(prev => ({ ...prev, entry: e.target.value }))}
              className="kmf-input font-mono" />
          </div>

          {/* Stop */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--red-loss)' }}>Stop</label>
            <input type="number" step="any" value={form.stop}
              onChange={e => setForm(prev => ({ ...prev, stop: e.target.value }))}
              className="kmf-input font-mono"
              style={{ borderColor: form.stop ? 'rgba(239,83,80,0.3)' : undefined }} />
          </div>

          {/* Target */}
          <div className="col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--green-win)' }}>Target</label>
            <input type="number" step="any" value={form.target}
              onChange={e => setForm(prev => ({ ...prev, target: e.target.value }))}
              className="kmf-input font-mono"
              style={{ borderColor: form.target ? 'rgba(38,166,154,0.3)' : undefined }} />
          </div>

          {/* RR display */}
          {rrRatio && (
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>RR Ratio</label>
              <div
                className="kmf-input flex items-center justify-center font-bold font-mono text-base"
                style={{ color: parseFloat(rrRatio) >= 2 ? 'var(--green-win)' : parseFloat(rrRatio) >= 1 ? 'var(--gold-mid)' : 'var(--red-loss)' }}
              >
                1 : {rrRatio}
              </div>
            </div>
          )}
        </div>

        {/* Setup details row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Lot Size</label>
            <input type="number" step="0.01" min="0.01" value={form.lotSize}
              onChange={e => setForm(prev => ({ ...prev, lotSize: e.target.value }))}
              className="kmf-input font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Timeframe</label>
            <select
              value={form.timeframe}
              onChange={e => setForm(prev => ({ ...prev, timeframe: e.target.value }))}
              className="kmf-input"
            >
              {['1M','5M','15M','30M','1H','4H','1D','1W'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Setup Name / Tag</label>
            <input type="text" value={form.setup}
              onChange={e => setForm(prev => ({ ...prev, setup: e.target.value }))}
              className="kmf-input" placeholder="e.g. OB Retest, Breakout Retest, Wyckoff Spring…" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 3 — Kingdom Confluence Checklist
          ════════════════════════════════════════════════════ */}
      <section className="kmf-panel">
        <div className="section-header">Kingdom Confluence Checklist</div>
        <div className="space-y-3">
          {CONFLUENCE_STEPS.map(({ key, label, desc, icon: Icon }) => {
            const checked = form.checklist[key as keyof typeof form.checklist];
            return (
              <div
                key={key}
                onClick={() => updateChecklist(key as keyof typeof form.checklist, !checked)}
                className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  background: checked ? 'rgba(212,175,55,0.07)' : 'var(--bg-primary)',
                  border: `1px solid ${checked ? 'var(--border-subtle)' : 'var(--border-panel)'}`,
                }}
              >
                {/* Checkbox */}
                <div
                  className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 transition-all"
                  style={{
                    background: checked ? 'var(--gold-mid)' : 'var(--bg-tertiary)',
                    border: `1.5px solid ${checked ? 'var(--gold-bright)' : 'var(--border-panel)'}`,
                  }}
                >
                  {checked && <CheckCircle className="w-3.5 h-3.5" style={{ color: '#000' }} />}
                </div>
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: checked ? 'var(--gold-glow)' : 'var(--bg-tertiary)', border: '1px solid var(--border-panel)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: checked ? 'var(--gold-bright)' : 'var(--text-faint)' }} />
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{desc}</p>
                </div>
                {checked && <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--gold-mid)' }} />}
              </div>
            );
          })}
        </div>

        {/* Confluence bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Confluence Score</span>
            <span style={{ color: confluenceColor, fontWeight: 700 }}>{form.confluenceScore}% — {form.confluenceScore >= 80 ? '✅ Kingdom Ready' : form.confluenceScore >= 60 ? '⚠️ Borderline' : '❌ Not Ready'}</span>
          </div>
          <div className="confluence-bar">
            <div className="confluence-bar-fill" style={{ width: `${form.confluenceScore}%`, background: confluenceColor }} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 4 — Pre-Trade Psychology
          ════════════════════════════════════════════════════ */}
      <section className="kmf-panel">
        <div className="section-header">
          <Brain className="w-3.5 h-3.5" />
          Pre-Trade Psychology
        </div>

        {/* Emotion slider */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--green-win)' }}>🟢 Kingdom Focused</span>
            <span className="font-mono text-base" style={{ color: 'var(--gold-bright)' }}>{form.preEmotions.level} / 10</span>
            <span style={{ color: 'var(--red-loss)' }}>🔴 Fleshly Impulse</span>
          </div>
          <Slider
            value={[form.preEmotions.level]}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : (v as number);
              setForm(prev => ({ ...prev, preEmotions: { ...prev.preEmotions, level: val } }));
            }}
            max={10} step={1}
          />
        </div>

        {/* Emotion tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Basic Emotions</p>
            <div className="flex flex-wrap gap-2">
              {BASIC_EMOTIONS.map(emo => (
                <button key={emo} onClick={() => toggleEmotion('basic', emo)}
                  className={`kmf-chip ${form.preEmotions.basic.includes(emo) ? 'active' : ''}`}>
                  {emo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--red-loss)' }}>⚠️ Dangerous Emotions</p>
            <div className="flex flex-wrap gap-2">
              {COMPLEX_EMOTIONS.map(emo => (
                <button key={emo} onClick={() => toggleEmotion('complex', emo)}
                  className={`kmf-chip danger ${form.preEmotions.complex.includes(emo) ? 'active' : ''}`}>
                  {emo}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pre-trade note */}
        <Textarea
          placeholder="Why am I taking this trade? Am I acting from Kingdom discipline or fleshly impulse?"
          value={form.preEmotions.note}
          onChange={e => setForm(prev => ({ ...prev, preEmotions: { ...prev.preEmotions, note: e.target.value } }))}
          className="mt-5 min-h-[90px] text-sm"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-panel)' }}
        />
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 5 — Post-Trade Reflection
          ════════════════════════════════════════════════════ */}
      <section className="kmf-panel">
        <div className="section-header">
          <Heart className="w-3.5 h-3.5" />
          Post-Trade Reflection
        </div>

        {/* Outcome selector */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Trade Outcome</p>
          <div className="flex flex-col sm:flex-row gap-3">
            {(['win', 'loss', 'breakeven'] as const).map(o => (
              <button
                key={o}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, outcome: o }))}
                className="flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all"
                style={{
                  background: form.outcome === o
                    ? o === 'win' ? 'var(--green-dim)' : o === 'loss' ? 'var(--red-dim)' : 'rgba(249,199,79,0.1)'
                    : 'var(--bg-primary)',
                  borderColor: form.outcome === o
                    ? o === 'win' ? 'var(--green-win)' : o === 'loss' ? 'var(--red-loss)' : 'var(--yellow-be)'
                    : 'var(--border-panel)',
                  color: form.outcome === o
                    ? o === 'win' ? 'var(--green-win)' : o === 'loss' ? 'var(--red-loss)' : 'var(--yellow-be)'
                    : 'var(--text-muted)',
                }}
              >
                {o === 'win' ? '▲ WIN' : o === 'loss' ? '▼ LOSS' : '■ BREAKEVEN'}
              </button>
            ))}
          </div>
        </div>

        {/* Post-trade emotion slider */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            <span>Post-Trade Emotional State</span>
            <span className="font-mono" style={{ color: 'var(--gold-bright)' }}>{form.postEmotions.level} / 10</span>
          </div>
          <Slider
            value={[form.postEmotions.level]}
            onValueChange={(v) => {
              const val = Array.isArray(v) ? v[0] : (v as number);
              setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, level: val } }));
            }}
            max={10} step={1}
          />
        </div>

        {/* Reflection fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>One Sentence Lesson</label>
            <Textarea
              placeholder="The most important lesson from this trade is…"
              value={form.postEmotions.lesson}
              onChange={e => setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, lesson: e.target.value } }))}
              className="min-h-[80px] text-sm"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-panel)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Kingdom Reflection</label>
            <Textarea
              placeholder="Did I trade with Kingdom discipline or fleshly impulse?"
              value={form.postEmotions.reflection}
              onChange={e => setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, reflection: e.target.value } }))}
              className="min-h-[80px] text-sm"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-panel)' }}
            />
          </div>
        </div>

        {/* Emotional interference toggle */}
        <div
          onClick={() => setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, interfered: !prev.postEmotions.interfered } }))}
          className="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl transition-all select-none"
          style={{
            background: form.postEmotions.interfered ? 'var(--red-dim)' : 'var(--bg-primary)',
            border: `1px solid ${form.postEmotions.interfered ? 'rgba(239,83,80,0.35)' : 'var(--border-panel)'}`,
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
            style={{
              background: form.postEmotions.interfered ? 'var(--red-loss)' : 'var(--bg-tertiary)',
              border: `1.5px solid ${form.postEmotions.interfered ? 'var(--red-loss)' : 'var(--border-panel)'}`,
            }}
          >
            {form.postEmotions.interfered && <AlertTriangle className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm" style={{ color: form.postEmotions.interfered ? 'var(--red-loss)' : 'var(--text-muted)' }}>
            Emotions interfered with my rules during this trade
          </span>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          SECTION 6 — Submit
          ════════════════════════════════════════════════════ */}
      <section>
        {/* Validation summary */}
        {form.confluenceScore < 80 && (
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-xl mb-4 text-sm"
            style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,83,80,0.3)', color: 'var(--red-loss)' }}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Confluence is <strong>{form.confluenceScore}%</strong>. You need ≥ 80% to submit. Complete more checklist steps.</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={form.confluenceScore < 80 || isSubmitting}
          className="gold-button w-full py-5 rounded-2xl text-base flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Recording Entry…
            </>
          ) : (
            <>
              <Flame className="w-5 h-5" />
              SAVE TO KMF LEDGER
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </section>

    </div>
  );
}