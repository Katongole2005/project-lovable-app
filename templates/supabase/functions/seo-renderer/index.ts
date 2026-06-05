// @ts-nocheck
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
}

const BASE_URL = "https://s-u.in"
const DEFAULT_IMAGE = `${BASE_URL}/icon-512.png`

const BAD_ARTWORK_PATTERNS = [
  "placehold.co",
  "placeholder",
  "no+poster",
  "no-poster",
  "no_backdrop",
  "no-backdrop",
  "default",
]

function isUsableArtworkUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return false
  const lowered = url.toLowerCase()
  return !BAD_ARTWORK_PATTERNS.some((pattern) => lowered.includes(pattern))
}

function getOptimizedImageUrl(url?: string | null): string {
  if (!isUsableArtworkUrl(url) || !url) return DEFAULT_IMAGE
  return url.replace("/original/", "/w500/")
}

function cleanVjName(value?: string | null): string {
  return (value || "").replace(/^VJ\s+/i, "").trim()
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function toSlug(title: string, id: string, year?: number | null): string {
  const parts = [slugify(title || "movie")]
  if (year) parts.push(String(year))
  parts.push(encodeURIComponent(id))
  return parts.join("-")
}

function buildSeoTitle(title: string, vjRaw: string): string {
  return `${title}${vjRaw ? ` - VJ ${vjRaw}` : ""} | Luganda Translated Movies`
}

function buildSeoDescription(movie: Record<string, any>, title: string, vjRaw: string): string {
  const description = String(movie.description || "").replace(/\s+/g, " ").trim()
  if (description) return description.slice(0, 300)
  return `Watch ${title}${vjRaw ? ` translated by VJ ${vjRaw}` : ""} in Luganda on Moviebay. Stream and download Uganda translated movies with SD and FHD options.`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char))
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const type = url.searchParams.get("type")
    const rawId = url.searchParams.get("id")
    if (!rawId) return new Response("Missing ID", { status: 400 })

    const encodedId = rawId.includes("-") ? rawId.split("-").pop() || rawId : rawId
    const id = decodeURIComponent(encodedId)
    const parsedId = parseInt(id, 10)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    let query = supabase.from("movies").select("*")
    if (!isNaN(parsedId) && String(parsedId) === id) {
      query = query.eq("id", parsedId)
    } else {
      query = query.eq("mobifliks_id", id)
    }

    const { data: movie, error } = await query.single()

    if (error || !movie) return new Response("Not Found", { status: 404 })

    const title = movie.title || "Untitled"
    const year = typeof movie.year === "number" ? movie.year : undefined
    const vjRaw = cleanVjName(movie.vj_name)
    const vj = vjRaw ? `VJ ${vjRaw}` : ""
    const isSeriesType = type === "series" || movie.type === "series"
    const schemaType = isSeriesType ? "TVSeries" : "Movie"
    const typeSlug = isSeriesType ? "series" : "movie"
    const fullTitle = buildSeoTitle(title, vjRaw)
    const description = buildSeoDescription(movie, title, vjRaw)
    const imageUrl = getOptimizedImageUrl(movie.image_url || movie.backdrop_url)
    const canonicalUrl = `${BASE_URL}/${typeSlug}/${toSlug(title, movie.mobifliks_id || String(movie.id), year)}`
    const genres = Array.isArray(movie.genres) ? movie.genres : []
    const cast = Array.isArray(movie.cast) ? movie.cast : []
    const releaseDate = movie.release_date || (year ? `${year}-01-01` : undefined)

    const keywords = [
      title,
      `${title} ${vj}`.trim(),
      `${title} luganda translated movie`,
      `${title} uganda translated`,
      `${vj} movies`.trim(),
      `watch ${title} online`,
      `download ${title} luganda`,
      ...genres.map((genre: string) => `${title} ${genre.toLowerCase()}`),
      "moviebay",
      "luganda translated movies",
    ].filter(Boolean).join(", ")

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": schemaType,
      name: title,
      alternateName: vjRaw ? `${title} VJ ${vjRaw}` : title,
      description,
      image: imageUrl,
      thumbnailUrl: imageUrl,
      genre: genres,
      inLanguage: "lg",
      datePublished: releaseDate,
      url: canonicalUrl,
      countryOfOrigin: { "@type": "Country", name: "Uganda" },
      provider: { "@type": "Organization", name: "Moviebay", url: BASE_URL },
    }

    if (vjRaw) {
      jsonLd.translator = { "@type": "Person", name: `VJ ${vjRaw}` }
    }

    if (cast.length > 0) {
      jsonLd.actor = cast.slice(0, 8).map((person: { name: string }) => ({
        "@type": "Person",
        name: person.name,
      }))
    }

    const videoLd = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `Watch ${title} in Luganda ${vj ? `(Translated by ${vj})` : ""}`,
      description,
      thumbnailUrl: imageUrl,
      uploadDate: releaseDate || "2026-01-01",
      embedUrl: canonicalUrl,
    }

    const castHtml = cast.length
      ? `<h2>Cast</h2><ul class="cast-list">${cast.slice(0, 8).map((person: { name: string; character?: string }) =>
          `<li><strong>${escapeHtml(person.name)}</strong>${person.character ? ` as ${escapeHtml(person.character)}` : ""}</li>`
        ).join("")}</ul>`
      : ""

    const genreHtml = genres.length
      ? `<h2>Genres</h2><ul class="genres-list">${genres.map((genre: string) => `<li>${escapeHtml(genre)}</li>`).join("")}</ul>`
      : ""

    const html = `<!DOCTYPE html>
<html lang="en-UG">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="keywords" content="${escapeAttr(keywords)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="en-UG" href="${canonicalUrl}">
  <link rel="alternate" hreflang="lg" href="${canonicalUrl}">
  <link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
  <meta name="geo.region" content="UG">
  <meta name="geo.placename" content="Uganda">
  <meta name="content-language" content="en-UG">
  <meta property="og:site_name" content="Moviebay">
  <meta property="og:title" content="${escapeAttr(fullTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="${isSeriesType ? "video.tv_show" : "video.movie"}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:alt" content="${escapeAttr(fullTitle)}">
  <meta property="og:locale" content="en_UG">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(fullTitle)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:alt" content="${escapeAttr(fullTitle)}">
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(videoLd)}</script>
  
  <style>
    :root {
      --bg-gradient: radial-gradient(circle at top, #0f0f16 0%, #050508 100%);
      --card-bg: rgba(255, 255, 255, 0.03);
      --border-color: rgba(255, 255, 255, 0.07);
      --text-primary: #ffffff;
      --text-secondary: rgba(255, 255, 255, 0.7);
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.35);
    }
    
    body {
      margin: 0;
      padding: 0;
      background: var(--bg-gradient);
      color: var(--text-primary);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    main {
      width: 100%;
      max-width: 1000px;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    
    article {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 40px;
      backdrop-filter: blur(16px);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 40px;
      align-items: start;
    }
    
    .poster-container {
      display: flex;
      justify-content: center;
    }
    
    .poster-img {
      width: 320px;
      height: 480px;
      aspect-ratio: 2/3;
      object-fit: cover;
      border-radius: 16px;
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .poster-img:hover {
      transform: scale(1.02);
      box-shadow: 0 20px 40px var(--accent-glow);
    }
    
    .info-container {
      display: flex;
      flex-direction: column;
    }
    
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .badge {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.9);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }
    
    .badge.accent {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.25);
      color: #60a5fa;
    }
    
    h1 {
      font-size: 2.2rem;
      font-weight: 800;
      margin: 0 0 16px 0;
      background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.25;
    }
    
    h2 {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 24px 0 12px 0;
      color: #f1f5f9;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 6px;
    }
    
    .description {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--text-secondary);
      margin: 0 0 20px 0;
    }
    
    .watch-info p {
      font-size: 0.95rem;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }
    
    .genres-list, .cast-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0;
      margin: 0;
      list-style: none;
    }
    
    .genres-list li, .cast-list li {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    
    .cast-list li strong {
      color: #ffffff;
    }
    
    .details-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 0;
      margin: 0;
      list-style: none;
    }
    
    .details-list li {
      font-size: 0.95rem;
      color: var(--text-secondary);
    }
    
    .details-list li strong {
      color: #f8fafc;
    }
    
    .actions {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 30px;
    }
    
    .cta-button {
      display: inline-block;
      background: #2563eb;
      color: #ffffff;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px var(--accent-glow);
      text-align: center;
      max-width: fit-content;
    }
    
    .cta-button:hover {
      background: #3b82f6;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px var(--accent-glow);
    }
    
    .vj-more-link {
      margin: 0;
    }
    
    .vj-link {
      color: #60a5fa;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      transition: color 0.2s;
    }
    
    .vj-link:hover {
      color: #93c5fd;
      text-decoration: underline;
    }
    
    @media (max-width: 768px) {
      article {
        grid-template-columns: 1fr;
        padding: 24px;
        gap: 28px;
      }
      
      .poster-img {
        width: 100%;
        max-width: 280px;
        height: auto;
      }
      
      h1 {
        font-size: 1.8rem;
      }
      
      .cta-button {
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <main>
    <article>
      <div class="poster-container">
        <img src="${imageUrl}" alt="${escapeAttr(fullTitle)}" class="poster-img" width="320" height="480">
      </div>
      <div class="info-container">
        <div class="badges">
          ${vj ? `<span class="badge accent">Translated by ${escapeHtml(vj)}</span>` : ""}
          ${year ? `<span class="badge">${year}</span>` : ""}
          <span class="badge">Luganda Translated</span>
          <span class="badge">${isSeriesType ? "TV Series" : "Movie"}</span>
        </div>
        
        <h1>Watch ${escapeHtml(title)}${vj ? ` Translated by ${escapeHtml(vj)}` : " Luganda Translated"}</h1>
        <p class="description">${escapeHtml(description)}</p>
        
        <section class="watch-info">
          <h2>Stream & Download</h2>
          <p>Looking to watch ${escapeHtml(title)} translated in Luganda? You can stream the full ${isSeriesType ? "series" : "movie"} online on Moviebay or get rapid direct downloads in high quality. Enjoy premium video playback, optimized for all mobile and desktop devices.</p>
        </section>
        
        <h2>Details</h2>
        <ul class="details-list">
          ${year ? `<li><strong>Year:</strong> ${year}</li>` : ""}
          ${vj ? `<li><strong>Translated by:</strong> ${escapeHtml(vj)}</li>` : ""}
          <li><strong>Language:</strong> Luganda</li>
          <li><strong>Category:</strong> Luganda Translated ${isSeriesType ? "Series" : "Movies"}</li>
        </ul>
        
        ${genreHtml}
        ${castHtml}
        
        <div class="actions">
          <a href="${canonicalUrl}" class="cta-button">Watch ${escapeHtml(title)} Now</a>
          ${vjRaw ? `<p class="vj-more-link"><a href="${BASE_URL}/vj/${encodeURIComponent(vjRaw.toLowerCase())}" class="vj-link">View all VJ ${escapeHtml(vjRaw)} movies</a></p>` : ""}
        </div>
      </div>
    </article>
  </main>
</body>
</html>`

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=1800, s-maxage=3600",
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
