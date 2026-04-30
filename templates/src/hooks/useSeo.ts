import { useEffect } from "react";

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
}

const BASE_TITLE = "Moviebay";
const DEFAULT_DESC = "Watch and download the best Uganda translated movies. Stream blockbuster films with Luganda translation by VJ Junior, VJ Jingo, VJ Ice P, and more top VJs. Free streaming, no subscription.";
const DEFAULT_OG_IMAGE = "https://s-u.in/icon-512.png";
const SITE_URL = "https://s-u.in";

export function useSeo({
  title,
  description = DEFAULT_DESC,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
}: SeoProps = {}) {
  useEffect(() => {
    // Title
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : `Uganda Translated Movies – VJ Junior & More | ${BASE_TITLE}`;
    document.title = fullTitle;

    // Meta helpers
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:site_name", "Moviebay");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    // OG URL
    const url = canonical ? `${SITE_URL}${canonical}` : window.location.href;
    setMeta("property", "og:url", url);

    // Canonical link
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);

    // JSON-LD
    const existingLd = document.querySelector('script[data-seo-jsonld]');
    if (existingLd) existingLd.remove();

    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const ld = document.querySelector('script[data-seo-jsonld]');
      if (ld) ld.remove();
    };
  }, [title, description, canonical, ogImage, ogType, jsonLd]);
}

/**
 * Build JSON-LD for a Movie/Series detail page.
 */
export function buildMovieJsonLd(movie: {
  mobifliks_id?: string;
  title: string;
  description?: string;
  image_url?: string;
  backdrop_url?: string;
  year?: number;
  type: string;
  genres?: string[];
  certification?: string;
  vj_name?: string;
  cast?: Array<{ name: string; character?: string | null }>;
}) {
  const cleanVj = movie.vj_name?.replace(/^VJ\s+/i, "").trim();
  const typeSlug = movie.type === "series" ? "series" : "movie";
  const slugTitle = movie.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const slugParts = [slugTitle || "movie"];
  if (movie.year) slugParts.push(String(movie.year));
  if (movie.mobifliks_id) slugParts.push(movie.mobifliks_id);
  const canonicalUrl = `https://s-u.in/${typeSlug}/${slugParts.join("-")}`;
  const description = movie.description || `Watch ${movie.title}${cleanVj ? ` translated by VJ ${cleanVj}` : ""} in Luganda on Moviebay.`;
  const image = movie.image_url || movie.backdrop_url;

  return {
    "@context": "https://schema.org",
    "@type": movie.type === "series" ? "TVSeries" : "Movie",
    name: movie.title,
    alternateName: cleanVj ? `${movie.title} VJ ${cleanVj}` : movie.title,
    description,
    image,
    thumbnailUrl: image,
    datePublished: movie.year ? `${movie.year}-01-01` : undefined,
    genre: movie.genres,
    contentRating: movie.certification,
    inLanguage: "lg",
    countryOfOrigin: {
      "@type": "Country",
      name: "Uganda",
    },
    url: canonicalUrl,
    provider: {
      "@type": "Organization",
      name: "Moviebay",
      url: "https://s-u.in",
    },
    ...(movie.cast && movie.cast.length > 0 ? {
      actor: movie.cast.slice(0, 5).map(c => ({
        "@type": "Person",
        name: c.name,
      })),
    } : {}),
    ...(cleanVj ? {
      translator: {
        "@type": "Person",
        name: `VJ ${cleanVj}`,
      },
    } : {}),
  };
}
