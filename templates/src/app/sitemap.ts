import { MetadataRoute } from 'next'
import { supabase } from '@/integrations/supabase/client'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The production domain for the site
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://s-u.in'

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/movies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/series`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/originals`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [];
  let hasMore = true;
  let page = 0;
  const limit = 1000;

  try {
    // Fetch all movies/series, up to 40,000 to stay within sitemap limits safely
    while (hasMore && dynamicRoutes.length < 40000) {
      const { data, error } = await supabase
        .from('movies')
        .select('mobifliks_id, type, last_updated, created_at')
        .not('mobifliks_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      data.forEach(item => {
        if (item.mobifliks_id) {
          const isSeries = item.type === 'series' || item.type === 'tv';
          const typeSlug = isSeries ? 'series' : 'movie';
          const lastMod = item.last_updated ? new Date(item.last_updated) : item.created_at ? new Date(item.created_at) : new Date();
          
          // Ensure valid date
          const validDate = isNaN(lastMod.getTime()) ? new Date() : lastMod;

          dynamicRoutes.push({
            url: `${baseUrl}/${typeSlug}/${encodeURIComponent(item.mobifliks_id)}`,
            lastModified: validDate,
            changeFrequency: 'monthly',
            priority: 0.7,
          });
        }
      });

      if (data.length < limit) {
        hasMore = false;
      }
      page++;
    }
  } catch (e) {
    console.error("Failed to generate dynamic sitemap routes", e);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
