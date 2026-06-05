import { readFile } from "node:fs/promises";
import path from "node:path";

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://s-u.in";
const INDEXNOW_API = `${BASE_URL}/api/indexnow`;
const ADMIN_SECRET = process.env.INDEXNOW_ADMIN_SECRET || "moviebay-seo-indexnow-secret-2026";
const MAX_URLS = 5000; // Limit per batch (safe size under IndexNow's 10,000 limit)

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

  // 3. Filter/select URLs (prioritize movie/series detail pages)
  const prioritizedUrls = urls.filter(u => u.includes("/movie/") || u.includes("/series/"));
  const finalUrls = prioritizedUrls.length > 0 ? prioritizedUrls : urls;

  console.log(`📦 Preparing to submit ${finalUrls.length} URLs to IndexNow in batches of ${MAX_URLS}...`);
  console.log(`🔗 Target Gateway Endpoint: ${INDEXNOW_API}`);

  // 4. Send POST requests to /api/indexnow in batches
  for (let i = 0; i < finalUrls.length; i += MAX_URLS) {
    const batch = finalUrls.slice(i, i + MAX_URLS);
    const batchNum = Math.floor(i / MAX_URLS) + 1;
    const totalBatches = Math.ceil(finalUrls.length / MAX_URLS);
    console.log(`📤 Sending batch ${batchNum}/${totalBatches} (${batch.length} URLs)...`);

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
        console.log(`   ✅ Batch ${batchNum} submitted successfully!`);
        console.log(`   Message: ${data.message}`);
        console.log(`   Status: ${data.status}`);
      } else {
        console.error(`   ❌ Batch ${batchNum} submission failed:`);
        console.error(`   Status Code: ${response.status}`);
        console.error(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error(`   ❌ Network or server error during batch ${batchNum} submission:`, err);
    }

    // Wait 1 second between batches to avoid overloading the API gateway
    if (i + MAX_URLS < finalUrls.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
