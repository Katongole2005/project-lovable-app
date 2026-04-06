import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apiKey, content-type',
}

const BASE_URL = 'https://s-u.in'

serve(async (req: Request) => {
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
      .select('mobifliks_id, title, updated_at, type, vj_name')
      .order('updated_at', { ascending: false })

    if (error) {
      throw error
    }

    // Get unique VJs (for vj landing pages)
    const vjSet = new Set<string>()
    for (const m of (movies || [])) {
      if (m.vj_name && m.vj_name.trim()) {
        vjSet.add(m.vj_name.trim().replace(/^VJ\s+/i, '').toLowerCase())
      }
    }
    const uniqueVjs = Array.from(vjSet)

    const today = new Date().toISOString().split('T')[0]

    // Find the most recent update date for VJ pages
    const getLatestUpdateForVj = (vjNameLower: string): string => {
      for (const m of (movies || [])) {
        if (m.vj_name && m.vj_name.trim().replace(/^VJ\s+/i, '').toLowerCase() === vjNameLower) {
          return (m.updated_at || today).split('T')[0]
        }
      }
      return today
    }

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/movies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/series</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${BASE_URL}/search</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>

  <!-- VJ Translator Pages -->
${uniqueVjs.map(vj => `  <url>
    <loc>${BASE_URL}/vj/${encodeURIComponent(vj)}</loc>
    <lastmod>${getLatestUpdateForVj(vj)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}

  <!-- Movies & Series -->
${(movies || []).map((movie: { mobifliks_id: string; type: string; updated_at?: string }) => `  <url>
    <loc>${BASE_URL}/${movie.type === 'series' ? 'series' : 'movie'}/${movie.mobifliks_id}</loc>
    <lastmod>${(movie.updated_at || today).split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`

    return new Response(sitemap, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
