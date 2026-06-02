import { MetadataRoute } from 'next'

/**
 * Dynamic robots.ts Route Handler
 * ──────────────────────────────
 * Generates custom crawler instructions dynamically.
 * Helps prevent duplicate content indexing by mirroring environment domain targets,
 * while cleanly disallowing heavy asset folders and service worker cache-bust URLs
 * to save valuable crawl budget.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://s-u.in'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/', '/video-proxy-server/', '/admin/', '/*?sw=*'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
