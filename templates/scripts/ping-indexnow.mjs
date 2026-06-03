import { readFile } from "node:fs/promises";
import path from "node:path";

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.s-u.in";
const INDEXNOW_API = `${BASE_URL}/api/indexnow`;
const ADMIN_SECRET = process.env.INDEXNOW_ADMIN_SECRET || "moviebay-seo-indexnow-secret-2026";
const MAX_URLS = 1000; // Limit per batch

async function main() {
  console.log("🚀 Starting IndexNow URL Submission...");
  
  // 1. Read sitemap
  const sitemapPath = path.resolve(process.cwd(), "public", "sitemap.xml");
  let sitemapContent;
  try {
    sitemapContent = await readFile(sitemapPath, "utf8");
  } catch (err) {
    console.error(`❌ Error: Could not read sitemap at ${sitemapPath}. Please run 'npm run sitemap' first.`);
    process.exit(1);
  }

  // 2. Extract URLs
  const urlRegex = /<loc>(.*?)<\/loc>/g;
  const urls = [];
  let match;
  while ((match = urlRegex.exec(sitemapContent)) !== null) {
    if (match[1]) {
      urls.push(match[1]);
    }
  }

  if (urls.length === 0) {
    console.log("⚠️ No URLs found in sitemap.xml");
    return;
  }

  console.log(`✓ Found ${urls.length} URLs in sitemap.`);

  // 3. Filter/select URLs (prioritize movie/series detail pages, limit to batch size)
  const prioritizedUrls = urls.filter(u => u.includes("/movie/") || u.includes("/series/"));
  const finalUrls = prioritizedUrls.length > 0 ? prioritizedUrls : urls;
  const batch = finalUrls.slice(0, MAX_URLS);

  console.log(`📦 Preparing to submit ${batch.length} URLs to IndexNow...`);
  console.log(`🔗 Target Gateway Endpoint: ${INDEXNOW_API}`);

  // 4. Send POST request to /api/indexnow
  try {
    const response = await fetch(INDEXNOW_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: ADMIN_SECRET,
        urls: batch,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("✅ Success!");
      console.log(`Message: ${data.message}`);
      console.log(`Status: ${data.status}`);
      console.log(`Submitted URLs count: ${data.submittedUrls?.length}`);
    } else {
      console.error("❌ IndexNow submission failed:");
      console.error(`Status Code: ${response.status}`);
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("❌ Network or server error during submission:", err);
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
