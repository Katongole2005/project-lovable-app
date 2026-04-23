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

    const title = movie.title || 'Untitled'
    const year = movie.year || ""
    const vjRaw = movie.vj_name ? movie.vj_name.replace(/^VJ\s+/i, '') : ""
    const vj = vjRaw ? `VJ ${vjRaw}` : ""
    const isSeriesType = type === 'series' || movie.type === 'series'
    const schemaType = isSeriesType ? 'TVSeries' : 'Movie'
    const typeSlug = isSeriesType ? 'series' : 'movie'

    const fullTitle = `${title} ${year ? `(${year})` : ""} ${vj ? `– ${vj} Luganda Translation` : "– Luganda Translated"} | Moviebay`
    
    const description = `Watch ${title} ${year ? `(${year})` : ""} in Luganda, translated by ${vj || "top VJs"} on Moviebay. ${movie.description ? movie.description.split('.')[0] + '.' : ""} Free streaming, no subscription required.`
    
    const keywords = [
      title,
      `${title} ${vj}`.trim(),
      `${title} luganda`,
      `${title} translated`,
      `${title} uganda`,
      `${vj} movies`.trim(),
      `watch ${title} online`,
      `download ${title} translated`,
      `${title} full movie luganda`,
      ...(movie.genres || []).map((g: string) => `${title} ${g.toLowerCase()}`),
      "moviebay",
      "uganda movies",
    ].filter(Boolean).join(", ")
    
    const imageUrl = movie.backdrop_url || movie.image_url || `${BASE_URL}/icon-512.png`
    const canonicalUrl = `${BASE_URL}/${typeSlug}/${id}`
    const genres = movie.genres || []
    const cast = movie.cast || []

    // Escape HTML special characters for the template
    const esc = (str: string) => str.replace(/[&<>"']/g, (m: string) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m] || m))

    // Build rich JSON-LD
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "name": title,
      "description": movie.description || description,
      "image": imageUrl,
      "genre": genres,
      "inLanguage": "lg",
      "countryOfOrigin": {
        "@type": "Country",
        "name": "Uganda"
      },
      "url": canonicalUrl,
      "provider": {
        "@type": "Organization",
        "name": "Moviebay",
        "url": BASE_URL
      }
    }

    // Only add datePublished if year is valid
    if (year && typeof year === 'number' && year > 1900) {
      jsonLd["datePublished"] = `${year}-01-01`
    }

    // Add translator if VJ exists
    if (vjRaw) {
      jsonLd["translator"] = {
        "@type": "Person",
        "name": `VJ ${vjRaw}`
      }
    }

    // Add cast/actors
    if (cast.length > 0) {
      jsonLd["actor"] = cast.slice(0, 8).map((c: { name: string }) => ({
        "@type": "Person",
        "name": c.name
      }))
    }

    // Build rich HTML body with internal links for link juice
    const castHtml = cast.length > 0 
      ? `<h2>Cast</h2><ul>${cast.slice(0, 10).map((c: { name: string; character?: string }) => 
          `<li>${esc(c.name)}${c.character ? ` as ${esc(c.character)}` : ''}</li>`
        ).join('')}</ul>` 
      : ''

    const genreHtml = genres.length > 0
      ? `<h2>Genres</h2><ul>${genres.map((g: string) => `<li>${esc(g)}</li>`).join('')}</ul>`
      : ''

    const vjLinkHtml = vjRaw 
      ? `<p>More movies translated by <a href="${BASE_URL}/vj/${encodeURIComponent(vjRaw.toLowerCase())}">VJ ${esc(vjRaw)}</a></p>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="keywords" content="${esc(keywords)}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <link rel="canonical" href="${canonicalUrl}">
    
    <!-- Geo -->
    <meta name="geo.region" content="UG">
    <meta name="geo.placename" content="Uganda">

    <!-- Hreflang -->
    <link rel="alternate" hreflang="en-UG" href="${canonicalUrl}">
    <link rel="alternate" hreflang="lg" href="${canonicalUrl}">
    
    <!-- Open Graph -->
    <meta property="og:site_name" content="Moviebay">
    <meta property="og:title" content="${esc(fullTitle)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:alt" content="${esc(title)} - Moviebay">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="video.movie">
    <meta property="og:locale" content="en_UG">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(fullTitle)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:alt" content="${esc(title)} - Moviebay">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd)}
    </script>
</head>
<body>
    <header>
      <nav>
        <a href="${BASE_URL}/">Home</a> |
        <a href="${BASE_URL}/movies">Movies</a> |
        <a href="${BASE_URL}/series">Series</a> |
        <a href="${BASE_URL}/search">Search</a>
      </nav>
    </header>

    <main>
      <article>
        <h1>${esc(fullTitle)}</h1>
        <img src="${imageUrl}" alt="${esc(title)} poster" width="300">
        
        <section>
          <h2>About ${esc(title)}</h2>
          <p>${esc(description)}</p>
          ${movie.description ? `<p>${esc(movie.description)}</p>` : ''}
        </section>

        <section>
          <h2>Details</h2>
          <ul>
              ${year ? `<li><strong>Year:</strong> ${year}</li>` : ''}
              ${vj ? `<li><strong>Translated by:</strong> ${esc(vj)}</li>` : ''}
              <li><strong>Language:</strong> Luganda Translation</li>
              <li><strong>Type:</strong> ${isSeriesType ? 'TV Series' : 'Movie'}</li>
          </ul>
        </section>

        ${genreHtml}
        ${castHtml}
        ${vjLinkHtml}
      </article>
    </main>

    <footer>
      <nav>
        <h3>Browse More</h3>
        <ul>
          <li><a href="${BASE_URL}/movies">All Movies</a></li>
          <li><a href="${BASE_URL}/series">All Series</a></li>
          <li><a href="${BASE_URL}/vj/junior">VJ Junior Movies</a></li>
          <li><a href="${BASE_URL}/vj/jingo">VJ Jingo Movies</a></li>
          <li><a href="${BASE_URL}/vj/ice%20p">VJ Ice P Movies</a></li>
          <li><a href="${BASE_URL}/vj/emmy">VJ Emmy Movies</a></li>
        </ul>
      </nav>
      <p>&copy; ${new Date().getFullYear()} Moviebay - Uganda's #1 Translated Movie Platform</p>
    </footer>
</body>
</html>`

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
