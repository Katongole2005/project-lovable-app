import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://s-u.in";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://qiwwokfqunzgnbmfvgxo.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_CLc5N9WUBLOAw5kFT_f-mQ_UzmUl_bV";

const PAGE_SIZE = 1000;
const MAX_URLS_PER_SITEMAP = 45000;
const publicDir = path.resolve(process.cwd(), "public");

function slugify(value) {
  return String(value || "movie")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toSlug(title, id, year) {
  const parts = [slugify(title)];
  if (year) parts.push(String(year));
  parts.push(encodeURIComponent(id));
  return parts.join("-");
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return char;
    }
  });
}

function formatDate(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10);
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function fetchContentByType(type) {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/movies`);
    url.searchParams.set(
      "select",
      "mobifliks_id,title,year,last_updated,created_at,type"
    );
    url.searchParams.set("type", `eq.${type}`);
    url.searchParams.set("order", "last_updated.desc.nullslast");

    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Supabase sitemap fetch failed for ${type}: ${response.status} ${body.slice(0, 200)}`
      );
    }

    const data = await response.json();
    rows.push(...data);

    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

function buildUrlEntries(contentRows, today) {
  const staticEntries = [
    { loc: `${BASE_URL}/`, lastmod: today, changefreq: "daily", priority: "1.0" },
    { loc: `${BASE_URL}/movies`, lastmod: today, changefreq: "daily", priority: "0.9" },
    { loc: `${BASE_URL}/series`, lastmod: today, changefreq: "daily", priority: "0.9" },
    { loc: `${BASE_URL}/originals`, lastmod: today, changefreq: "weekly", priority: "0.7" },
    { loc: `${BASE_URL}/privacy`, lastmod: today, changefreq: "yearly", priority: "0.3" },
    { loc: `${BASE_URL}/terms`, lastmod: today, changefreq: "yearly", priority: "0.3" },
  ];

  const contentEntries = contentRows
    .filter((item) => item.mobifliks_id && item.mobifliks_id !== "TEST_DELETE_ME")
    .map((item) => {
      const route = item.type === "series" ? "series" : "movie";
      const slug = toSlug(item.title, item.mobifliks_id, item.year);

      return {
        loc: `${BASE_URL}/${route}/${slug}`,
        lastmod: formatDate(item.last_updated || item.created_at, today),
        changefreq: "monthly",
        priority: "0.7",
      };
    });

  return [...staticEntries, ...contentEntries];
}

async function writeUrlSet(fileName, entries) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlEntry).join("\n")}
</urlset>
`;

  await writeFile(path.join(publicDir, fileName), xml, "utf8");
}

async function writeSitemapIndex(fileNames, today) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${fileNames
  .map(
    (fileName) => `  <sitemap>
    <loc>${BASE_URL}/${fileName}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>
`;

  await writeFile(path.join(publicDir, "sitemap.xml"), xml, "utf8");
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const [movies, series] = await Promise.all([
    fetchContentByType("movie"),
    fetchContentByType("series"),
  ]);

  const entries = buildUrlEntries([...movies, ...series], today);

  if (entries.length <= MAX_URLS_PER_SITEMAP) {
    await writeUrlSet("sitemap.xml", entries);
    console.log(`Generated sitemap.xml with ${entries.length.toLocaleString()} URLs.`);
    return;
  }

  const sitemapFiles = [];
  for (let index = 0; index < entries.length; index += MAX_URLS_PER_SITEMAP) {
    const fileName = `sitemap-${sitemapFiles.length + 1}.xml`;
    const chunk = entries.slice(index, index + MAX_URLS_PER_SITEMAP);
    await writeUrlSet(fileName, chunk);
    sitemapFiles.push(fileName);
  }

  await writeSitemapIndex(sitemapFiles, today);
  console.log(
    `Generated sitemap index with ${entries.length.toLocaleString()} URLs across ${sitemapFiles.length} files.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
