import { supabase } from "@/integrations/supabase/client";

export default async function DebugSupabaseServer() {
  const { data, error } = await supabase.from("movies").select("*").limit(1);

  return (
    <div className="p-5 text-white">
      <h1>Supabase Server Debug</h1>
      {error && <div className="text-red-500">Error: {JSON.stringify(error)}</div>}
      {data && <div>Data length: {data.length}</div>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
