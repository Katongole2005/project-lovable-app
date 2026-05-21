const API_BASE = "http://127.0.0.1:8000/api";
const CLOUDFLARE_WORKER_URL = "https://cdn.s-u.in";

function getUrlBase() {
  return "http://localhost:5001";
}

function createUrl(url) {
  try {
    return new URL(url, getUrlBase());
  } catch {
    return null;
  }
}

function buildApiEndpoint(path) {
  if (!API_BASE) return null;
  return createUrl(`${API_BASE}${path}`);
}

function buildApiPlaybackUrl(targetUrl, title, detailsUrl, mobifliksId) {
  const apiMediaEndpoint = buildApiEndpoint("/media");
  if (!apiMediaEndpoint) {
    return null;
  }

  apiMediaEndpoint.searchParams.set("url", targetUrl);
  apiMediaEndpoint.searchParams.set("title", title || "video");
  if (detailsUrl) {
    apiMediaEndpoint.searchParams.set("details_url", detailsUrl);
  }
  if (mobifliksId) {
    apiMediaEndpoint.searchParams.set("mobifliks_id", mobifliksId);
  }
  apiMediaEndpoint.searchParams.set("play", "true");
  return apiMediaEndpoint.toString();
}

function buildPlaybackRecoveryUrl(mediaUrl, title, mobifliksId, detailsUrl) {
  const parsed = createUrl(mediaUrl);
  if (!parsed) {
    return null;
  }

  const workerUrl = CLOUDFLARE_WORKER_URL ? createUrl(CLOUDFLARE_WORKER_URL) : null;

  if (workerUrl && parsed.hostname === workerUrl.hostname) {
    const targetUrl = parsed.searchParams.get("url");
    if (!targetUrl) {
      return null;
    }
    return buildApiPlaybackUrl(targetUrl, title, detailsUrl, mobifliksId) ?? targetUrl;
  }

  return "fallback";
}

const mediaUrl = "https://cdn.s-u.in/?url=https%3A%2F%2Fmunotek-vault.b-cdn.net%2Fstw42%2Ffya%2FMy.Dearest.Assassin.2026.1080p.WEB.h264-EDITH.mp4&name=My+Dearest+Assassin&play=1";
console.log(buildPlaybackRecoveryUrl(mediaUrl, "My Dearest Assassin"));
