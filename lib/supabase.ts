import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Local Storage Fallback Layer ────────────────────────────
const KMF_STORAGE_KEY = 'kmf_local_trades';

export const kmfStorage = {
  getTrades: (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(KMF_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
  saveTrade: (trade: any) => {
    if (typeof window === 'undefined') return;
    try {
      const trades = kmfStorage.getTrades();
      const newTrade = { 
        id: crypto.randomUUID(), 
        ...trade, 
        created_at: trade.created_at || new Date().toISOString() 
      };
      localStorage.setItem(KMF_STORAGE_KEY, JSON.stringify([newTrade, ...trades]));
      return { data: newTrade, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }
};
