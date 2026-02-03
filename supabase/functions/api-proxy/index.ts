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
    
    // Build target URL - ensure proper path handling
    let targetUrl = API_BASE;
    if (path) {
      // Remove leading slash if API_BASE already ends with one
      const cleanPath = path.startsWith("/") ? path : "/" + path;
      targetUrl = API_BASE.endsWith("/") 
        ? API_BASE.slice(0, -1) + cleanPath 
        : API_BASE + cleanPath;
    }

    console.log(`[api-proxy] Proxying request to: ${targetUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          "Accept": "application/json",
        },
        body: req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.text();
      console.log(`[api-proxy] Response status: ${response.status}, URL: ${targetUrl}`);
      console.log(`[api-proxy] Response length: ${data.length} chars`);

      return new Response(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[api-proxy] Request timed out for:", targetUrl);
        return new Response(
          JSON.stringify({ error: "Request timed out", url: targetUrl }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    }
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
