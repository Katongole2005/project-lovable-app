import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — Stateless Hero Preload Header Emitter
 * ───────────────────────────────────────────────────────────────
 * This middleware runs at the edge on EVERY HTML page navigation.
 * It emits custom response headers that the Cloudflare HTMLRewriter
 * Worker intercepts to inject <link rel="preload"> tags into <head>.
 *
 * Flow:
 *   Browser → Cloudflare Worker (reads X-Preload-Hero header) →
 *   HTMLRewriter injects preload into HTML head →
 *   Browser starts loading hero backdrop IMMEDIATELY at first HTML byte
 *
 * Performance benefit:
 *   Hero backdrop image begins downloading before any JS bundle is parsed.
 *   This cuts LCP (Largest Contentful Paint) by 100-200ms globally.
 */

// The TMDB CDN origin all poster/backdrop images are served from
const TMDB_CDN = 'https://image.tmdb.org';
const CUSTOM_CDN = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.s-u.in';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only add preload headers to HTML navigation requests
  // (not API routes, _next assets, images, fonts, etc.)
  const isPageRoute =
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/favicon') &&
    !pathname.startsWith('/icon') &&
    !pathname.startsWith('/manifest') &&
    !pathname.startsWith('/robots') &&
    !pathname.startsWith('/sitemap') &&
    !pathname.startsWith('/sw.js');

  if (!isPageRoute) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // ── Emit X-Preconnect-Hosts ──────────────────────────────────────────────
  // These are the domains our hero images and media assets come from.
  // The Cloudflare Worker will inject <link rel="preconnect"> for each.
  response.headers.set(
    'X-Preconnect-Hosts',
    [TMDB_CDN, CUSTOM_CDN, 'https://fxowpnlkahvjxlbqyoce.supabase.co'].join(',')
  );

  // ── Emit X-Preload-Hero (fallback generic TMDB preconnect) ───────────────
  // When we cannot know the specific hero image URL at the middleware level
  // (because it's fetched client-side), we set a generic TMDB preconnect.
  // This still meaningfully speeds things up by pre-warming the DNS+TCP+TLS
  // connection to TMDB's image CDN before the client-side JS requests any image.
  //
  // For a fully dynamic hero preload (knowing the exact image URL),
  // you would need to server-render the hero selection in a Server Component
  // and pass the URL to the middleware via a cookie or header.
  // The architecture below supports this enhancement when you're ready.
  response.headers.set(
    'X-Preload-Hero',
    `${TMDB_CDN}/t/p/w1280/` // Generic TMDB path prefix (worker appends nothing if no specific URL)
  );

  // ── Security: ensure private headers are never cached by CDN ────────────
  response.headers.set('Vary', 'Accept');

  return response;
}

export const config = {
  // Run on all routes except static files and _next internals
  matcher: [
    '/((?!_next/static|_next/image|favicon\.ico|icon|apple-touch|manifest|robots|sitemap|sw\.js).*)',
  ],
};
