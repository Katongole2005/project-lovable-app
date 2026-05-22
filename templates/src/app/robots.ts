import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // The production domain for the site
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://s-u.in'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
