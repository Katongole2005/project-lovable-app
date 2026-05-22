import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Update this to your actual custom domain when you have one
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-vercel-domain.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
