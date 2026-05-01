import { useEffect } from "react";

interface SEOProps {
  title?: string;
  vjName?: string;
  year?: number | string;
  description?: string;
  imageUrl?: string;
  genres?: string[];
  canonicalPath?: string;
  jsonLd?: Record<string, any>;
}

const BASE_URL = "https://www.s-u.in";
const DEFAULT_IMAGE = `${BASE_URL}/icon-512.png`;

const cleanVjName = (value?: string) => (value || "").replace(/^VJ\s+/i, "").trim();

const buildSeoTitle = (title: string, vjName?: string) => {
  const cleanVj = cleanVjName(vjName);
  return `${title}${cleanVj ? ` - VJ ${cleanVj}` : ""} | Luganda Translated Movies`;
};

const buildSeoDescription = (title: string, description?: string, vjName?: string) => {
  const cleanDescription = (description || "").replace(/\s+/g, " ").trim();
  if (cleanDescription) return cleanDescription.slice(0, 300);
  const cleanVj = cleanVjName(vjName);
  return `Watch ${title}${cleanVj ? ` translated by VJ ${cleanVj}` : ""} in Luganda on Moviebay. Stream and download Uganda translated movies with SD and FHD options.`;
};

export const useDocumentSEO = ({
  title,
  vjName,
  year,
  description,
  imageUrl,
  genres,
  canonicalPath,
  jsonLd,
}: SEOProps) => {
  useEffect(() => {
    if (!title && !jsonLd) return;

    const fullTitle = title ? buildSeoTitle(title, vjName) : "Moviebay | Luganda Translated Movies";
    const metaDescription = title
      ? buildSeoDescription(title, description, vjName)
      : "Watch and download Uganda translated movies in Luganda on Moviebay.";

    const cleanVj = cleanVjName(vjName);
    const metaKeywords = [
      title,
      `${title} vj ${cleanVj}`.trim(),
      `${title} luganda translated movie`,
      `${title} uganda translated`,
      cleanVj ? `vj ${cleanVj} movies` : "",
      title ? `watch ${title} online` : "",
      title ? `download ${title} luganda` : "",
      ...(genres || []).map((genre) => `${title} ${genre.toLowerCase()}`),
      "moviebay",
      "luganda translated movies",
    ].filter(Boolean).join(", ");

    const fullImageUrl = imageUrl || DEFAULT_IMAGE;
    const fullCanonicalUrl = `${BASE_URL}${canonicalPath || ""}`;
    const originalTitle = document.title;

    document.title = fullTitle;

    const updateMeta = (attr: string, key: string, value: string) => {
      const selector = `meta[${attr}="${key}"]`;
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    updateMeta("name", "description", metaDescription);
    updateMeta("name", "keywords", metaKeywords);
    updateMeta("name", "robots", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");

    updateMeta("property", "og:title", fullTitle);
    updateMeta("property", "og:description", metaDescription);
    updateMeta("property", "og:image", fullImageUrl);
    updateMeta("property", "og:image:alt", fullTitle);
    updateMeta("property", "og:url", fullCanonicalUrl);
    updateMeta("property", "og:type", "video.movie");
    updateMeta("property", "og:site_name", "Moviebay");
    updateMeta("property", "og:locale", "en_UG");

    updateMeta("name", "twitter:card", "summary_large_image");
    updateMeta("name", "twitter:title", fullTitle);
    updateMeta("name", "twitter:description", metaDescription);
    updateMeta("name", "twitter:image", fullImageUrl);
    updateMeta("name", "twitter:image:alt", fullTitle);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", fullCanonicalUrl);

    const existingLd = document.querySelector("script[data-seo-jsonld]");
    if (existingLd) existingLd.remove();

    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.title = originalTitle;
      const ld = document.querySelector("script[data-seo-jsonld]");
      if (ld) ld.remove();
    };
  }, [title, vjName, year, description, imageUrl, genres, canonicalPath, jsonLd]);
};
