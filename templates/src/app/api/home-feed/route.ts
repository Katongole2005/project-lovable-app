import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * /api/home-feed — Consolidated Home Page Data Endpoint
 * ──────────────────────────────────────────────────────
 * Runs all critical home-page Supabase queries in PARALLEL (Promise.all)
 * server-side, bundles them into a single JSON response, and sets
 * Cache-Control headers so Cloudflare/Vercel edges cache the result.
 *
 * Benefits:
 *  - Cuts browser→Supabase round trips from 4+ to 1
 *  - Edge-cached for 5 minutes → subsequent visitors get a ~0ms response
 *  - Moves query fan-out from the browser to the server (lower latency,
 *    no CORS overhead, no Supabase anon key exposed in network waterfall)
 */

// ── Supabase server-side client ───────────────────────────────────────────────
// We use the service role key here (server-side only — never exposed to browser).
// Falls back to the anon key so it works without extra env setup.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://qiwwokfqunzgnbmfvgxo.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_CLc5N9WUBLOAw5kFT_f-mQ_UzmUl_bV';

// Cache duration constants
const EDGE_CACHE_SECONDS = 300;   // 5 minutes — Cloudflare/Vercel edge cache
const BROWSER_CACHE_SECONDS = 60; // 1 minute — browser cache (stale-while-revalidate)
const SWR_SECONDS = 3600;         // 1 hour — stale-while-revalidate window

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const heroLimit   = Math.min(parseInt(searchParams.get('hero')   || '12'), 24);
    const moviesLimit = Math.min(parseInt(searchParams.get('movies') || '32'), 80);
    const seriesLimit = Math.min(parseInt(searchParams.get('series') || '32'), 80);

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    const BROWSE_SELECT = '*';

    // ── Run all queries in parallel ───────────────────────────────────────────
    const [heroResult, trendingResult, moviesResult, seriesResult] =
      await Promise.all([
        // [1] Hero carousel — recent movies with backdrop images
        supabase
          .from('movies')
          .select(BROWSE_SELECT)
          .eq('type', 'movie')
          .not('backdrop_url', 'is', null)
          .order('release_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(Math.min(heroLimit * 2, 48)),

        // [2] Trending — recent movies sorted by date + views
        supabase
          .from('movies')
          .select(BROWSE_SELECT)
          .eq('type', 'movie')
          .order('release_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(60),

        // [3] Movies browse
        supabase
          .from('movies')
          .select(BROWSE_SELECT)
          .eq('type', 'movie')
          .order('release_date', { ascending: false, nullsFirst: false })
          .order('year', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(Math.min(Math.round(moviesLimit * 4), 200)),

        // [4] Series browse
        supabase
          .from('movies')
          .select(BROWSE_SELECT)
          .eq('type', 'series')
          .order('release_date', { ascending: false, nullsFirst: false })
          .order('views', { ascending: false })
          .limit(Math.min(Math.round(seriesLimit * 2.5), 200)),
      ]);

    // ── Build response payload ────────────────────────────────────────────────
    const payload = {
      hero:     heroResult.data    ?? [],
      trending: trendingResult.data ?? [],
      movies:   moviesResult.data   ?? [],
      series:   seriesResult.data   ?? [],
      // Metadata for debugging
      meta: {
        generatedAt: new Date().toISOString(),
        limits: { hero: heroLimit, movies: moviesLimit, series: seriesLimit },
        errors: {
          hero:     heroResult.error?.message    ?? null,
          trending: trendingResult.error?.message ?? null,
          movies:   moviesResult.error?.message   ?? null,
          series:   seriesResult.error?.message   ?? null,
        },
      },
    };

    // ── Set aggressive caching headers ────────────────────────────────────────
    // s-maxage: Cloudflare/Vercel edge caches this for 5 minutes
    // max-age:  Browser caches for 1 minute
    // stale-while-revalidate: Serve stale content for 1 hour while refreshing in background
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${EDGE_CACHE_SECONDS}, max-age=${BROWSER_CACHE_SECONDS}, stale-while-revalidate=${SWR_SECONDS}`,
        'CDN-Cache-Control': `public, max-age=${EDGE_CACHE_SECONDS}`,
        'Vercel-CDN-Cache-Control': `public, max-age=${EDGE_CACHE_SECONDS}`,
        'Vary': 'Accept-Encoding',
        'X-Feed-Generated': new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[home-feed] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', hero: [], trending: [], movies: [], series: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// Opt out of static generation — this is a dynamic API route
export const dynamic = 'force-dynamic';
// Set a generous timeout for the parallel Supabase queries
export const maxDuration = 15;
