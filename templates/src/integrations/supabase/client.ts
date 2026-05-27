import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const FALLBACK_SUPABASE_URL = "https://qiwwokfqunzgnbmfvgxo.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_CLc5N9WUBLOAw5kFT_f-mQ_UzmUl_bV";

const SUPABASE_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/_supabase`
    : (process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL);

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    persistSession: true,
    autoRefreshToken: true,
  }
});
