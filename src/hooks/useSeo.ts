import { useEffect } from "react";

interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, any>;
}

const BASE_TITLE = "Moviebay";
const DEFAULT_DESC = "Discover and stream the latest movies and TV series on Moviebay. Watch trending content, explore categories, and enjoy a premium streaming experience.";
const DEFAULT_OG_IMAGE = "https://premiere-point-web.lovable.app/icon-512.png";
const SITE_URL = "https://premiere-point-web.lovable.app";

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
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} – Stream Movies & Series`;
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
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    // OG URL
    const url = canonical || window.location.href;
    setMeta("property", "og:url", url);

    // Canonical link
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical ? `${SITE_URL}${canonical}` : url);

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
  title: string;
  description?: string;
  image_url?: string;
  year?: number;
  type: string;
  genres?: string[];
  certification?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": movie.type === "series" ? "TVSeries" : "Movie",
    name: movie.title,
    description: movie.description || `Watch ${movie.title} on Moviebay`,
    image: movie.image_url,
    datePublished: movie.year ? `${movie.year}` : undefined,
    genre: movie.genres,
    contentRating: movie.certification,
  };
}
