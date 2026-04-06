import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all movies and series
    const { data: movies, error } = await supabase
      .from('movies')
      .select('mobifliks_id, title, updated_at, type')
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    // Get VJs (for vj landing pages)
    const { data: vjs, error: vjsError } = await supabase
      .from('movies')
      .select('vj_name')
      .not('vj_name', 'is', null)

    const uniqueVjs = [...new Set((vjs || []).map(v => v.vj_name.toLowerCase().trim().replace(/^VJ\s+/i, '')))]

    const baseUrl = 'https://moviebay.ug'
    const today = new Date().toISOString().split('T')[0]

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/movies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/series</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- VJ Pages -->
  ${uniqueVjs.map(vj => `
  <url>
    <loc>${baseUrl}/vj/${vj}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}

  <!-- Dynamic Content (Movies & Series) -->
  ${(movies || []).map(movie => `
  <url>
    <loc>${baseUrl}/${movie.type === 'series' ? 'series' : 'movie'}/${movie.mobifliks_id}</loc>
    <lastmod>${(movie.updated_at || today).split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`

    return new Response(sitemap, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
