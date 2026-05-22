import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qiwwokfqunzgnbmfvgxo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_CLc5N9WUBLOAw5kFT_f-mQ_UzmUl_bV";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from("movies").select("*").limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
