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

const BASE_URL = "https://s-u.in";

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

    const vj = vjName ? `VJ ${vjName.replace(/^VJ\s+/i, "")}` : "";
    const fullTitle = `${title} ${year ? `(${year})` : ""} ${
      vj ? `– ${vj} Luganda Translation` : "– Luganda Translated"
    } | Moviebay`;

    const metaDescription = `Watch ${title} ${
      year ? `(${year})` : ""
    } in Luganda, translated by ${
      vjName || "top VJs"
    } on Moviebay. ${description ? description.split(".")[0] + "." : ""} Free streaming, no subscription required.`;

    const metaKeywords = [
      title,
      `${title} vj ${vjName || ""}`.trim(),
      `${title} luganda`,
      `${title} translated`,
      `${title} uganda`,
      `vj ${vjName || ""} movies`.trim(),
      `watch ${title} online`,
      `download ${title} translated`,
      `${title} full movie luganda`,
      ...(genres || []).map(g => `${title} ${g.toLowerCase()}`),
      "moviebay",
      "uganda movies",
    ].filter(Boolean).join(", ");

    const fullImageUrl = imageUrl || `${BASE_URL}/icon-512.png`;
    const fullCanonicalUrl = `${BASE_URL}${canonicalPath || ""}`;

    // Store original values to restore on cleanup
    const originalTitle = document.title;
    
    // Update Title
    document.title = fullTitle;

    // Update Meta Tags
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
    
    // Open Graph
    updateMeta("property", "og:title", fullTitle);
    updateMeta("property", "og:description", metaDescription);
    updateMeta("property", "og:image", fullImageUrl);
    updateMeta("property", "og:url", fullCanonicalUrl);
    updateMeta("property", "og:type", "video.movie");
    updateMeta("property", "og:site_name", "Moviebay");
    updateMeta("property", "og:locale", "en_UG");
    
    // Twitter
    updateMeta("name", "twitter:card", "summary_large_image");
    updateMeta("name", "twitter:title", fullTitle);
    updateMeta("name", "twitter:description", metaDescription);
    updateMeta("name", "twitter:image", fullImageUrl);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", fullCanonicalUrl);

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

    // Cleanup: Restore default SEO on component unmount
    return () => {
      document.title = originalTitle;
      const ld = document.querySelector('script[data-seo-jsonld]');
      if (ld) ld.remove();
    };
  }, [title, vjName, year, description, imageUrl, genres, canonicalPath, jsonLd]);
};
