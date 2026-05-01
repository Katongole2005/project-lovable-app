import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
}

const BASE_URL = "https://www.s-u.in"
const DEFAULT_IMAGE = `${BASE_URL}/icon-512.png`

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { data: movie, error } = await supabase
      .from("movies")
      .select("*")
      .eq("mobifliks_id", id)
      .single()

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
    const imageUrl = movie.image_url || movie.backdrop_url || DEFAULT_IMAGE
    const canonicalUrl = `${BASE_URL}/${typeSlug}/${toSlug(title, id, year)}`
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

    const castHtml = cast.length
      ? `<h2>Cast</h2><ul>${cast.slice(0, 10).map((person: { name: string; character?: string }) =>
          `<li>${escapeHtml(person.name)}${person.character ? ` as ${escapeHtml(person.character)}` : ""}</li>`
        ).join("")}</ul>`
      : ""

    const genreHtml = genres.length
      ? `<h2>Genres</h2><ul>${genres.map((genre: string) => `<li>${escapeHtml(genre)}</li>`).join("")}</ul>`
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
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <main>
    <article>
      <h1>${escapeHtml(fullTitle)}</h1>
      <img src="${imageUrl}" alt="${escapeAttr(fullTitle)}" width="360">
      <p>${escapeHtml(description)}</p>
      <ul>
        ${year ? `<li><strong>Year:</strong> ${year}</li>` : ""}
        ${vj ? `<li><strong>Translated by:</strong> ${escapeHtml(vj)}</li>` : ""}
        <li><strong>Language:</strong> Luganda</li>
        <li><strong>Category:</strong> Luganda Translated ${isSeriesType ? "Series" : "Movies"}</li>
      </ul>
      ${genreHtml}
      ${castHtml}
      ${vjRaw ? `<p><a href="${BASE_URL}/vj/${encodeURIComponent(vjRaw.toLowerCase())}">More VJ ${escapeHtml(vjRaw)} movies</a></p>` : ""}
      <p><a href="${canonicalUrl}">Watch ${escapeHtml(title)} on Moviebay</a></p>
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
