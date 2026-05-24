import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/indexnow — Automated Search Indexing Gateway
 * ────────────────────────────────────────────────
 * Accept POST requests containing an array of URLs to submit to the IndexNow protocol
 * (supported by Bing, Yandex, Seznam, and other major search engines).
 *
 * It validates requests using an administrative secret key, compiles the standard
 * IndexNow JSON payload, and posts it to the global indexnow API gateway.
 *
 * Flow:
 *  New upload/update -> Ping /api/indexnow (with URLs + secret) ->
 *  IndexNow forces immediate Googlebot-style crawler range requests to your URLs (within 5 minutes)
 */

const INDEXNOW_KEY = '5f6cb327d463432a81fc696598da5dbd';
const INDEXNOW_KEY_LOCATION = `https://s-u.in/${INDEXNOW_KEY}.txt`;
const INDEXNOW_GATEWAY = 'https://api.indexnow.org/indexnow';

// Admin authentication token to protect endpoint from public abuse.
// Configured in environment variables. Falls back to a safe default if none is set.
const ADMIN_SECRET = process.env.INDEXNOW_ADMIN_SECRET || 'moviebay-seo-indexnow-secret-2026';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls, secret } = body;

    // ── 1. Validate Secret ───────────────────────────────────────────────────
    if (!secret || secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing administrative secret token.' },
        { status: 401 }
      );
    }

    // ── 2. Validate URLs ─────────────────────────────────────────────────────
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request. "urls" must be a non-empty array of strings.' },
        { status: 400 }
      );
    }

    const host = process.env.NEXT_PUBLIC_SITE_URL 
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname 
      : 's-u.in';

    // Normalize URLs to ensure they contain the correct host
    const normalizedUrls = urls.map((u) => {
      const trimmed = String(u).trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      // If it's a relative path (e.g. /movie/inception), prepend the base domain
      return `https://${host}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    });

    // ── 3. Post to IndexNow Gateway ──────────────────────────────────────────
    const indexNowPayload = {
      host: host,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: normalizedUrls,
    };

    console.log('[indexnow] Submitting payload to IndexNow:', indexNowPayload);

    const gatewayResponse = await fetch(INDEXNOW_GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(indexNowPayload),
    });

    const status = gatewayResponse.status;

    if (status === 200 || status === 202) {
      return NextResponse.json({
        success: true,
        status: status,
        message: 'URLs submitted successfully to IndexNow. Crawler indexing has been scheduled.',
        submittedUrls: normalizedUrls,
      }, { status: 200 });
    }

    // Capture errors from IndexNow gateway
    let errorDetails = '';
    try {
      errorDetails = await gatewayResponse.text();
    } catch (_) {}

    console.warn(`[indexnow] Gateway returned status ${status}:`, errorDetails);

    return NextResponse.json({
      success: false,
      status: status,
      error: `IndexNow Gateway rejected submission with status ${status}.`,
      detail: errorDetails,
    }, { status: 502 });

  } catch (err) {
    console.error('[indexnow] Unexpected exception during submission:', err);
    return NextResponse.json(
      { error: 'Internal Server Error. Exception thrown during processing.', detail: String(err) },
      { status: 500 }
    );
  }
}
