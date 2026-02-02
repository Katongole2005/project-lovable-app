import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = Deno.env.get("EXTERNAL_API_BASE") || "https://api.s-u.in/api";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "";
    const targetUrl = `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;

    console.log(`[api-proxy] Proxying request to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
    });

    const data = await response.text();
    console.log(`[api-proxy] Response status: ${response.status}`);

    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[api-proxy] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Proxy request failed", details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
