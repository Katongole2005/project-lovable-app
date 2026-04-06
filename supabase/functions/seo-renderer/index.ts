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
    const url = new URL(req.url)
    const type = url.searchParams.get('type') // 'movie' or 'series'
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response("Missing ID", { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch movie/series details
    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('mobifliks_id', id)
      .single()

    if (error || !movie) {
      return new Response("Not Found", { status: 404 })
    }

    const title = movie.title
    const year = movie.year || ""
    const vj = movie.vj_name ? `VJ ${movie.vj_name.replace(/^VJ\s+/i, '')}` : ""
    const fullTitle = `${title} ${year ? `(${year})` : ""} ${vj ? `– ${vj} Luganda Translation` : "– Luganda Translated"} | Moviebay`
    
    const description = `Watch ${title} ${year ? `(${year})` : ""} in Luganda, translated by ${movie.vj_name || "top VJs"} on Moviebay. ${movie.description ? movie.description.split('.')[0] + '.' : ""} Free streaming, no subscription required.`
    
    const keywords = `${title}, ${title} vj ${movie.vj_name || ""}, ${title} luganda, ${title} translated, ${title} uganda, vj ${movie.vj_name || ""} movies, download ${title} translated, moviebay`
    
    const imageUrl = movie.image_url || "https://moviebay.ug/icon-512.png"
    const canonicalUrl = `https://moviebay.ug/${type || 'movie'}/${id}`

    // Escape HTML special characters for the template
    const esc = (str: string) => str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m] || m));

    // Construct the SEO-optimized HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="keywords" content="${esc(keywords)}">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${esc(fullTitle)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="video.movie">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(fullTitle)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Movie",
      "name": "${esc(title)}",
      "description": "${esc(description)}",
      "image": "${imageUrl}",
      "datePublished": "${year}-01-01",
      "genre": ${JSON.stringify(movie.genres || [])},
      "inLanguage": "lg",
      "subtitleLanguage": "lg",
      "countryOfOrigin": "UG"
    }
    </script>
</head>
<body>
    <h1>${esc(fullTitle)}</h1>
    <p>${esc(description)}</p>
    <img src="${imageUrl}" alt="${esc(title)}">
    <div>
        <h2>Details</h2>
        <ul>
            <li>Year: ${year}</li>
            <li>VJ: ${movie.vj_name || "N/A"}</li>
            <li>Genres: ${(movie.genres || []).join(', ')}</li>
        </ul>
    </div>
    <hr>
    <p>This page is optimized for search engines. To watch the movie, visit <a href="${canonicalUrl}">${canonicalUrl}</a></p>
</body>
</html>`

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
