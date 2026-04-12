// app/dashboard/journal/page.tsx

'use client';
import { useState } from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/supabase';
import { Crown, ShieldCheck, LogOut } from 'lucide-react';

const emotionsBasic = ['Calm', 'Excited', 'Focused', 'Fearful'];
const emotionsComplex = ['FOMO', 'Revenge', 'Overconfidence', 'Hesitation', 'Anxiety', 'Greed'];

export default function KMFJournalPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [form, setForm] = useState({
    pair: 'EURUSD',
    direction: 'long' as 'long' | 'short',
    entry: '',
    stop: '',
    target: '',
    checklist: {
      marketDirection: false,
      wyckoff: false,
      priceAction: false,
      mss: false,
      poiOb: false,
    },
    preEmotions: {
      level: 5,
      basic: [] as string[],
      complex: [] as string[],
      note: '',
    },
    postEmotions: {
      level: 5,
      lesson: '',
      reflection: '',
      interfered: false,
    },
    confluenceScore: 0,
    outcome: 'win' as 'win' | 'loss' | 'breakeven',
  });

  const updateChecklist = (key: keyof typeof form.checklist, checked: boolean) => {
    const newChecklist = { ...form.checklist, [key]: checked };
    const checkedCount = Object.values(newChecklist).filter(Boolean).length;
    const score = Math.round((checkedCount / 5) * 100);
    setForm(prev => ({ ...prev, checklist: newChecklist, confluenceScore: score }));
  };

  const toggleEmotion = (type: 'basic' | 'complex', emotion: string) => {
    const key = type === 'basic' ? 'basic' : 'complex';
    const current = form.preEmotions[key];
    const newList = current.includes(emotion)
      ? current.filter(e => e !== emotion)
      : [...current, emotion];
    setForm(prev => ({
      ...prev,
      preEmotions: { ...prev.preEmotions, [key]: newList }
    }));
  };

  const handleSubmit = async () => {
    if (form.confluenceScore < 80) {
      alert("⚠️ Low Confluence! A Kingdom Minded Trader realigns before entering.");
      return;
    }
    if (!isConnected) {
      alert("Please connect your wallet to journal on-chain.");
      return;
    }

    const message = `KMF Trade Entry - ${form.pair} ${new Date().toISOString()}`;
    const signature = await signMessageAsync({ message });

    const { error } = await supabase.from('trades').insert({
      pair: form.pair,
      direction: form.direction,
      entry: parseFloat(form.entry) || 0,
      stop: parseFloat(form.stop) || 0,
      target: parseFloat(form.target) || 0,
      confluence_score: form.confluenceScore,
      pre_emotions: form.preEmotions,
      post_emotions: form.postEmotions,
      outcome: form.outcome,
      wallet_address: address,
      on_chain_hash: signature,
      created_at: new Date().toISOString(),
    });

    if (!error) {
      alert("✅ Trade successfully journaled in the KMF Ledger! Your discipline is now recorded eternally. 👑");
      // Optional: Reset form after successful submission
      // setForm({ ...initialFormState });
    } else {
      alert("Error saving trade. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F1A] py-8">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <Crown className="w-12 h-12 text-[#FFD700]" />
            <div>
              <h1 className="text-5xl font-bold tracking-tighter" style={{ color: '#FFD700' }}>
                KMF LEDGER
              </h1>
              <p className="text-[#E5E4E2] text-xl">Kingdom Minded Financial • Journal Entry</p>
            </div>
          </div>

          {isConnected && (
            <Button
              onClick={() => disconnect()}
              variant="outline"
              className="border-[#E5E4E2]/50 text-[#E5E4E2] hover:bg-[#E5E4E2]/10"
            >
              Disconnect Wallet
            </Button>
          )}
        </div>

        <div className="glass-card rounded-3xl p-10 space-y-12 royal-shine">

          {/* Trade Basics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <Label className="text-[#FFD700] text-lg">Pair</Label>
              <input
                type="text"
                value={form.pair}
                onChange={(e) => setForm({ ...form, pair: e.target.value })}
                className="w-full bg-[#1A1A2E] border border-[#E5E4E2]/40 rounded-2xl p-4 text-white mt-2 focus:border-[#FFD700]"
              />
            </div>
            <div>
              <Label className="text-[#FFD700] text-lg">Direction</Label>
              <select
                value={form.direction}
                onChange={(e) => setForm({ ...form, direction: e.target.value as 'long' | 'short' })}
                className="w-full bg-[#1A1A2E] border border-[#E5E4E2]/40 rounded-2xl p-4 text-white mt-2 focus:border-[#FFD700]"
              >
                <option value="long">LONG (Bullish)</option>
                <option value="short">SHORT (Bearish)</option>
              </select>
            </div>
            <div>
              <Label className="text-[#FFD700] text-lg">Entry Price</Label>
              <input
                type="number"
                value={form.entry}
                onChange={(e) => setForm({ ...form, entry: e.target.value })}
                className="w-full bg-[#1A1A2E] border border-[#E5E4E2]/40 rounded-2xl p-4 text-white mt-2 focus:border-[#FFD700]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#FFD700] text-lg">Stop</Label>
                <input type="number" value={form.stop} onChange={(e) => setForm({ ...form, stop: e.target.value })} className="w-full bg-[#1A1A2E] border border-[#E5E4E2]/40 rounded-2xl p-4 text-white mt-2 focus:border-[#FFD700]" />
              </div>
              <div>
                <Label className="text-[#FFD700] text-lg">Target</Label>
                <input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="w-full bg-[#1A1A2E] border border-[#E5E4E2]/40 rounded-2xl p-4 text-white mt-2 focus:border-[#FFD700]" />
              </div>
            </div>
          </div>

          {/* 5-Step Confluence Checklist */}
          <div>
            <h2 className="text-3xl font-bold mb-6" style={{ color: '#FFD700' }}>5-STEP KINGDOM CONFLUENCE CHECKLIST</h2>
            <div className="space-y-5">
              {[
                { key: 'marketDirection', label: '1. Market Direction — Higher TF Bias Confirmed' },
                { key: 'wyckoff', label: '2. Wyckoff Phase — Accumulation/Distribution + Spring/Upthrust' },
                { key: 'priceAction', label: '3. Price Action — Reversal/Continuation Candle' },
                { key: 'mss', label: '4. Market Structure Shift (MSS)' },
                { key: 'poiOb', label: '5. POI + Order Block / FVG — Fresh Institutional Zone' },
              ].map((item) => (
                <div key={item.key} className="glass-card p-6 rounded-2xl flex items-center gap-5 hover:border-[#FFD700]">
                  <Checkbox
                    checked={form.checklist[item.key as keyof typeof form.checklist]}
                    onCheckedChange={(checked) => updateChecklist(item.key as keyof typeof form.checklist, !!checked)}
                    className="scale-125 accent-[#FFD700]"
                  />
                  <Label className="text-lg cursor-pointer text-[#E5E4E2]">{item.label}</Label>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <div className="inline-block glass-card px-12 py-5 rounded-3xl text-4xl font-bold tracking-widest" style={{ color: '#FFD700' }}>
                CONFLUENCE SCORE: {form.confluenceScore}%
              </div>
            </div>
          </div>

          {/* Pre-Trade Emotions */}
          <div className="glass-card p-8 rounded-3xl">
            <h2 className="text-3xl font-bold mb-6" style={{ color: '#FFD700' }}>PRE-TRADE EMOTIONS</h2>

            <div className="mb-8">
              <div className="flex justify-between text-sm mb-3 text-[#E5E4E2]">
                <span>Kingdom Focused</span>
                <span>Fleshly Impulse</span>
              </div>
              <Slider
                value={[form.preEmotions.level]}
                onValueChange={(v) => setForm(prev => ({ ...prev, preEmotions: { ...prev.preEmotions, level: v[0] } }))}
                max={10}
                className="accent-[#FFD700]"
              />
              <div className="text-center mt-3 text-2xl font-mono" style={{ color: '#FFD700' }}>
                {form.preEmotions.level}/10
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[#E5E4E2] mb-4">Basic Emotions</p>
                <div className="flex flex-wrap gap-3">
                  {emotionsBasic.map(emo => (
                    <button
                      key={emo}
                      onClick={() => toggleEmotion('basic', emo)}
                      className={`px-6 py-3 rounded-2xl border transition-all text-sm ${form.preEmotions.basic.includes(emo) ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'border-[#E5E4E2]/50 hover:border-[#FFD700]'}`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[#E5E4E2] mb-4">Complex / Dangerous Emotions</p>
                <div className="flex flex-wrap gap-3">
                  {emotionsComplex.map(emo => (
                    <button
                      key={emo}
                      onClick={() => toggleEmotion('complex', emo)}
                      className={`px-6 py-3 rounded-2xl border transition-all text-sm ${form.preEmotions.complex.includes(emo) ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'border-[#E5E4E2]/50 hover:border-[#FFD700]'}`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Textarea
              placeholder="Why do I feel this way right now? Am I trading with Kingdom discipline?"
              value={form.preEmotions.note}
              onChange={(e) => setForm(prev => ({ ...prev, preEmotions: { ...prev.preEmotions, note: e.target.value } }))}
              className="mt-8 bg-[#1A1A2E] border-[#E5E4E2]/40 min-h-[100px]"
            />
          </div>

          {/* Post-Trade Reflection */}
          <div className="glass-card p-8 rounded-3xl">
            <h2 className="text-3xl font-bold mb-6" style={{ color: '#FFD700' }}>POST-TRADE REFLECTION</h2>

            <div className="mb-8">
              <Label className="text-[#FFD700]">Trade Outcome</Label>
              <div className="flex gap-4 mt-3">
                {(['win', 'loss', 'breakeven'] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => setForm(prev => ({ ...prev, outcome: o }))}
                    className={`px-8 py-4 rounded-2xl border transition-all font-medium ${form.outcome === o ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'border-[#E5E4E2]/50 hover:border-[#FFD700]'}`}
                  >
                    {o.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-sm mb-3 text-[#E5E4E2]">
                <span>Post-Trade Emotion Level</span>
                <span>{form.postEmotions.level}/10</span>
              </div>
              <Slider
                value={[form.postEmotions.level]}
                onValueChange={(v) => setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, level: v[0] } }))}
                max={10}
                className="accent-[#E5E4E2]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-[#FFD700]">One Sentence Lesson</Label>
                <Textarea
                  placeholder="The most important lesson from this trade is..."
                  value={form.postEmotions.lesson}
                  onChange={(e) => setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, lesson: e.target.value } }))}
                  className="mt-3 min-h-[90px] bg-[#1A1A2E] border-[#E5E4E2]/40"
                />
              </div>
              <div>
                <Label className="text-[#FFD700]">Kingdom Reflection</Label>
                <Textarea
                  placeholder="Did I trade with Kingdom discipline or fleshly impulse? What would the King version of me have done?"
                  value={form.postEmotions.reflection}
                  onChange={(e) => setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, reflection: e.target.value } }))}
                  className="mt-3 min-h-[90px] bg-[#1A1A2E] border-[#E5E4E2]/40"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 mt-8 cursor-pointer">
              <Checkbox
                checked={form.postEmotions.interfered}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, postEmotions: { ...prev.postEmotions, interfered: !!checked } }))}
              />
              <span className="text-[#E5E4E2]">Emotions interfered with my rules</span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!isConnected}
            className="gold-button w-full py-10 text-3xl rounded-3xl flex items-center justify-center gap-4 royal-shine"
          >
            <ShieldCheck className="w-9 h-9" />
            SIGN WITH WALLET & JOURNAL IN KMF LEDGER
          </Button>

          <p className="text-center text-[#E5E4E2]/60 text-sm mt-4">
            Every entry is signed on-chain • Eternal record of Kingdom discipline
          </p>
        </div>
      </div>
    </div>
  );
}