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

    const baseUrl = "https://moviebay.ug";
    const vj = vjName ? `VJ ${vjName.replace(/^VJ\s+/i, "")}` : "";
    const fullTitle = `${title} ${year ? `(${year})` : ""} ${
      vj ? `– ${vj} Luganda Translation` : "– Luganda Translated"
    } | Moviebay`;

    const metaDescription = `Watch ${title} ${
      year ? `(${year})` : ""
    } in Luganda, translated by ${
      vjName || "top VJs"
    } on Moviebay. ${description ? description.split(".")[0] + "." : ""} Free streaming, no subscription required.`;

    const metaKeywords = `${title}, ${title} vj ${
      vjName || ""
    }, ${title} luganda, ${title} translated, ${title} uganda, vj ${
      vjName || ""
    } movies, download ${title} translated, moviebay`;

    const fullImageUrl = imageUrl || `${baseUrl}/icon-512.png`;
    const fullCanonicalUrl = `${baseUrl}${canonicalPath || ""}`;

    // Store original values to restore on cleanup
    const originalTitle = document.title;
    
    // Update Title
    document.title = fullTitle;

    // Update Meta Tags
    const updateMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        if (selector.startsWith('meta[name')) {
            (el as HTMLMetaElement).name = selector.split('"')[1];
        } else {
            (el as HTMLMetaElement).setAttribute(selector.split('[')[1].split('=')[0], selector.split('"')[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    updateMeta('meta[name="description"]', "content", metaDescription);
    updateMeta('meta[name="keywords"]', "content", metaKeywords);
    
    // Open Graph
    updateMeta('meta[property="og:title"]', "content", fullTitle);
    updateMeta('meta[property="og:description"]', "content", metaDescription);
    updateMeta('meta[property="og:image"]', "content", fullImageUrl);
    updateMeta('meta[property="og:url"]', "content", fullCanonicalUrl);
    
    // Twitter
    updateMeta('meta[name="twitter:title"]', "content", fullTitle);
    updateMeta('meta[name="twitter:description"]', "content", metaDescription);
    updateMeta('meta[name="twitter:image"]', "content", fullImageUrl);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
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
