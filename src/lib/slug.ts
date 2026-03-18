/**
 * Generate a URL-friendly slug from a movie/series title + id.
 * e.g. "Inception" + "10281" + 2010 → "inception-2010-10281"
 */
export function toSlug(title: string, id: string, year?: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-")          // spaces → hyphens
    .replace(/-+/g, "-")           // collapse multiple hyphens
    .replace(/^-|-$/g, "");        // trim leading/trailing hyphens

  const parts = [base];
  if (year) parts.push(String(year));
  parts.push(id);

  return parts.join("-");
}

/**
 * Extract the mobifliks_id from a slug.
 * The ID is always the last segment after the final hyphen.
 * Also handles raw IDs (e.g. "10281") for backwards compatibility.
 */
export function fromSlug(slug: string): string {
  // If it's purely numeric, it's a raw ID
  if (/^\d+$/.test(slug)) return slug;

  // The ID is the last hyphen-separated segment
  const parts = slug.split("-");
  return parts[parts.length - 1];
}
