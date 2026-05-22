"use client";

import { useState, useEffect } from "react";
import { fetchTrending } from "@/lib/api";

export default function DebugSupabase() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    fetchTrending()
      .then(res => setData(res))
      .catch(err => setError(err.toString()));
  }, []);

  return (
    <div className="p-5 text-white">
      <h1>Supabase Debug</h1>
      {error && <div className="text-red-500">Error: {error}</div>}
      {data && <div>Data length: {data.length}</div>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
