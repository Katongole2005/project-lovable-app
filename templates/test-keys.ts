import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://qiwwokfqunzgnbmfvgxo.supabase.co", "sb_publishable_CLc5N9WUBLOAw5kFT_f-mQ_UzmUl_bV");
async function test() {
  const { data } = await supabase.from("movies").select("*").limit(1);
  if (data?.length) {
    console.log(Object.keys(data[0]));
  }
}
test();
