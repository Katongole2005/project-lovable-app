import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qiwwokfqunzgnbmfvgxo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CLc5N9WUBLOAw5kFT_f-mQ_UzmUl_bV";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BAD_ARTWORK_PATTERNS = [
  "placehold.co",
  "placeholder",
  "no+poster",
  "no-poster",
  "no_backdrop",
  "no-backdrop",
  "default",
];

export function isUsableArtworkUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return false;
  const lowered = url.toLowerCase();
  return !BAD_ARTWORK_PATTERNS.some((pattern) => lowered.includes(pattern));
}

async function test() {
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("type", "movie")
    .not("backdrop_url", "is", null)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(1);
    
  console.log("Data length:", data?.length);
  if (data?.length) {
    const movie = data[0];
    console.log("backdrop:", movie.backdrop_url);
    console.log("isUsable:", isUsableArtworkUrl(movie.backdrop_url));
  }
}

test();
