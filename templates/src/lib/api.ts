import type { Movie, Series, Episode, SearchResult } from "@/types/movie";
import { supabase } from "@/integrations/supabase/client";
import { generateSecureToken } from "./crypto";

const fallbackPoster = "https://placehold.co/300x450/1a1a2e/ffffff?text=No+Poster";
const DEFAULT_API_BASE = import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "/api";
export const API_BASE = (import.meta.env.VITE_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
export const CLOUDFLARE_WORKER_URL = "https://cdn.s-u.in";

const movieDetailsCache = new Map<string, Movie | null>();
const movieDetailsRequests = new Map<string, Promise<Movie | null>>();
const seriesDetailsCache = new Map<string, Series | null>();
const seriesDetailsRequests = new Map<string, Promise<Series | null>>();
const genreQueryCache = new Map<string, Movie[]>();
const genreQueryRequests = new Map<string, Promise<Movie[]>>();
const mediaAvailabilityCache = new Map<string, MediaAvailability>();
const mediaAvailabilityRequests = new Map<string, Promise<MediaAvailability>>();
const preconnectedOrigins = new Set<string>();
const warmedMediaUrls = new Set<string>();

// ─── Bounded-cache helpers ────────────────────────────────────────────────────
const MAX_DETAIL_CACHE = 60;
const MAX_GENRE_CACHE  = 8;
const MAX_MEDIA_CACHE  = 100;
const MAX_WARM_URLS    = 150;

function boundedSet<T>(set: Set<T>, max: number): void {
  if (set.size <= max) return;
  const iter = set.values();
  let n = set.size - max;
  while (n-- > 0) set.delete(iter.next().value);
}

function boundedMap<K, V>(map: Map<K, V>, max: number): void {
  if (map.size <= max) return;
  const iter = map.keys();
  let n = map.size - max;
  while (n-- > 0) map.delete(iter.next().value);
}

function getUrlBase(): string {
  return typeof window !== "undefined" ? window.location.origin : "http://localhost";
}

function createUrl(url: string): URL | null {
  try {
    return new URL(url, getUrlBase());
  } catch {
    return null;
  }
}

function buildApiEndpoint(path: string): URL | null {
  if (!API_BASE) return null;
  return createUrl(`${API_BASE}${path}`);
}

export const getImageUrl = (url?: string) => {
  if (!url) return fallbackPoster;
  return url.replace('/original/', '/w500/');
};

export const getOptimizedBackdropUrl = (url?: string): string => {
  if (!url) return fallbackPoster;
  return url.replace('/w1280/', '/w780/').replace('/original/', '/w780/');
};

export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) { resolve(); return; }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
    img.src = url;
  });
};

export const preloadMovieBackdrop = (movie?: { backdrop_url?: string | null; image_url?: string } | null): void => {
  const backdropUrl = movie?.backdrop_url;
  if (backdropUrl) {
    const optimizedUrl = getOptimizedBackdropUrl(backdropUrl);
    preloadImage(optimizedUrl).catch(() => { });
  }
};

function preconnectOrigin(url?: string | null): void {
  if (!url || typeof document === "undefined") return;

  try {
    const parsed = createUrl(url);
    if (!parsed) return;
    const origin = parsed.origin;
    if (preconnectedOrigins.has(origin)) return;

    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    preconnectedOrigins.add(origin);
  } catch {
    // Ignore malformed URLs.
  }
}

function warmMediaElement(url?: string | null): void {
  if (!url || typeof document === "undefined" || warmedMediaUrls.has(url)) return;

  try {
    preconnectOrigin(url);

    if (shouldProxyMediaUrl(url)) {
      preconnectOrigin(CLOUDFLARE_WORKER_URL);
    }

    warmedMediaUrls.add(url);
    boundedSet(warmedMediaUrls, MAX_WARM_URLS);
  } catch {
    // Ignore warmup failures.
  }
}

function unwrapLegacyWorkerUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!/cdn\.s-u\.in$/i.test(parsed.hostname)) return url;
    return parsed.searchParams.get("url") || url;
  } catch {
    return url;
  }
}

function shouldUseDirectPlayback(url?: string): boolean {
  if (!url) return false;
  const normalized = unwrapLegacyWorkerUrl(url);
  return (
    /b-cdn\.net/i.test(normalized) ||
    /bunnycdn\.com/i.test(normalized) ||
    /storage\.googleapis\.com/i.test(normalized) ||
    /\.(mp4|m4v|webm)(\?|$)/i.test(normalized)
  );
}

async function buildWorkerPlaybackUrl(targetUrl: string, title: string): Promise<string | null> {
  if (!CLOUDFLARE_WORKER_URL) {
    return null;
  }

  const endpoint = createUrl(CLOUDFLARE_WORKER_URL);
  if (!endpoint) {
    return null;
  }

  const token = await generateSecureToken(targetUrl, title);
  if (token) {
    endpoint.searchParams.set("token", token);
  } else {
    endpoint.searchParams.set("url", targetUrl);
    endpoint.searchParams.set("name", title || "video");
  }
  endpoint.searchParams.set("play", "1");
  return endpoint.toString();
}

function buildApiPlaybackUrl(
  targetUrl: string,
  title: string,
  detailsUrl?: string | null,
  mobifliksId?: string | null,
): string | null {
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

export function shouldProxyMediaUrl(url?: string): boolean {
  if (!url) return false;
  const normalized = unwrapLegacyWorkerUrl(url);
  return (
    /mobifliks\.(info|com)/i.test(normalized) ||
    /zflix\.(click|com)/i.test(normalized) ||
    /download(mp4|serie|video|mp3)\.php/i.test(normalized) ||
    /\/watch\/(mp4|serie|video|file)\//i.test(normalized) ||
    /\/download\/(mp4|serie|video|file)\//i.test(normalized) ||
    /b-cdn\.net/i.test(normalized) ||
    /pearlpix\.xyz/i.test(normalized) ||
    /bunnycdn\.com/i.test(normalized) ||
    /storage\.googleapis\.com/i.test(normalized) ||
    /\.(mp4|m4v|webm|m3u8|mov|avi|mkv)(\?|$)/i.test(normalized) ||
    /munoserver/i.test(normalized) ||
    /munotech/i.test(normalized)
  );
}

export async function fetchMediaSize(url: string, title?: string, mobifliksId?: string): Promise<string | null> {
  if (!url) return null;
  
  // Try Cloudflare worker first (it's faster if the link is alive)
  if (CLOUDFLARE_WORKER_URL) {
    try {
      const workerUrl = new URL(CLOUDFLARE_WORKER_URL);
      workerUrl.searchParams.set("url", url);
      workerUrl.searchParams.set("size", "1");
      if (title) workerUrl.searchParams.set("name", title);

      const response = await fetch(workerUrl.toString());
      if (response.ok) {
        const data = await response.json();
        if (data.size && data.size !== "unknown") {
          return formatBytes(parseInt(data.size));
        }
      }
    } catch (e) {
      console.warn("Cloudflare size fetch failed, trying backend fallback:", e);
    }
  }

  // Fallback to Python backend with re-resolution support
  try {
    const backendUrl = new URL(`${DEFAULT_API_BASE}/media-info`);
    backendUrl.searchParams.set("url", url);
    if (title) backendUrl.searchParams.set("title", title);
    if (mobifliksId) backendUrl.searchParams.set("mobifliks_id", mobifliksId);

    const response = await fetch(backendUrl.toString());
    if (response.ok) {
      const data = await response.json();
      if (data.size) {
        return formatBytes(parseInt(data.size));
      }
    }
  } catch (e) {
    console.error("Backend size fetch failed:", e);
  }

  return null;
}

function formatBytes(bytes: number): string | null {
  if (isNaN(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export async function buildMediaUrl({
  url,
  title,
  detailsUrl,
  mobifliksId,
  play = false,
}: {
  url: string;
  title: string;
  detailsUrl?: string | null;
  mobifliksId?: string | null;
  play?: boolean;
}): Promise<string> {
  const normalizedUrl = unwrapLegacyWorkerUrl(url);
  if (play) {
    if (shouldProxyMediaUrl(normalizedUrl)) {
      const workerPlaybackUrl = await buildWorkerPlaybackUrl(normalizedUrl, title);
      if (workerPlaybackUrl) {
        preconnectOrigin(CLOUDFLARE_WORKER_URL);
        return workerPlaybackUrl;
      }

      const apiPlaybackUrl = buildApiPlaybackUrl(normalizedUrl, title, detailsUrl, mobifliksId);
      if (apiPlaybackUrl) {
        preconnectOrigin(API_BASE);
        return apiPlaybackUrl;
      }
    }

    preconnectOrigin(normalizedUrl);
    return normalizedUrl;
  }

  if (!shouldProxyMediaUrl(normalizedUrl)) {
    preconnectOrigin(normalizedUrl);
    return normalizedUrl;
  }

  if (CLOUDFLARE_WORKER_URL) {
    preconnectOrigin(CLOUDFLARE_WORKER_URL);
    const endpoint = createUrl(CLOUDFLARE_WORKER_URL);
    if (!endpoint) {
      preconnectOrigin(normalizedUrl);
      return normalizedUrl;
    }
    
    const token = await generateSecureToken(normalizedUrl, title);
    if (token) {
      endpoint.searchParams.set("token", token);
    } else {
      endpoint.searchParams.set("url", normalizedUrl);
      endpoint.searchParams.set("name", title || "video");
    }
    
    if (play) {
      endpoint.searchParams.set("play", "1");
    } else {
      endpoint.searchParams.set("download", "1");
    }
    return endpoint.toString();
  }

  const apiPlaybackUrl = buildApiPlaybackUrl(normalizedUrl, title, detailsUrl, mobifliksId);
  if (!apiPlaybackUrl) {
    preconnectOrigin(normalizedUrl);
    return normalizedUrl;
  }

  preconnectOrigin(API_BASE);
  return apiPlaybackUrl;
}

export interface MediaAvailability {
  available: boolean;
  resolved_url: string | null;
  candidate_urls: string[];
}

export function buildResolveMediaUrl(mediaUrl: string): string | null {
  const resolveEndpoint = buildApiEndpoint("/resolve-media");
  if (!resolveEndpoint) {
    return null;
  }

  try {
    const parsed = createUrl(mediaUrl);
    if (!parsed) return null;
    
    const workerUrl = CLOUDFLARE_WORKER_URL ? createUrl(CLOUDFLARE_WORKER_URL) : null;
    if (workerUrl && parsed.hostname === workerUrl.hostname) {
      const targetUrl = parsed.searchParams.get("url");
      if (!targetUrl) return null;
      resolveEndpoint.searchParams.set("url", targetUrl);
      return resolveEndpoint.toString();
    }

    if (shouldProxyMediaUrl(mediaUrl)) {
      resolveEndpoint.searchParams.set("url", mediaUrl);
      return resolveEndpoint.toString();
    }

    if (!parsed.pathname.endsWith("/media")) {
      return null;
    }
    parsed.pathname = parsed.pathname.replace(/\/media$/, "/resolve-media");
    parsed.searchParams.delete("title");
    parsed.searchParams.delete("play");
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildPlaybackRecoveryUrl(
  mediaUrl: string, 
  title: string,
  mobifliksId?: string,
  detailsUrl?: string
): string | null {
  const parsed = createUrl(mediaUrl);
  if (!parsed) {
    return null;
  }

  const workerUrl = CLOUDFLARE_WORKER_URL ? createUrl(CLOUDFLARE_WORKER_URL) : null;

  if (parsed.pathname.endsWith("/media")) {
    const targetUrl = parsed.searchParams.get("url");
    if (!targetUrl) {
      return null;
    }
    return buildWorkerPlaybackUrl(targetUrl, title) ?? targetUrl;
  }

  if (workerUrl && parsed.hostname === workerUrl.hostname) {
    const targetUrl = parsed.searchParams.get("url");
    if (!targetUrl) {
      return null;
    }
    return buildApiPlaybackUrl(targetUrl, title, detailsUrl, mobifliksId) ?? targetUrl;
  }

  if (!shouldProxyMediaUrl(mediaUrl)) {
    return null;
  }

  return buildApiPlaybackUrl(mediaUrl, title, detailsUrl, mobifliksId) ?? mediaUrl;
}

export async function resolveMediaAvailability(mediaUrl: string): Promise<MediaAvailability> {
  const cached = mediaAvailabilityCache.get(mediaUrl);
  if (cached) {
    return cached;
  }

  const inFlight = mediaAvailabilityRequests.get(mediaUrl);
  if (inFlight) {
    return inFlight;
  }

  const resolveUrl = buildResolveMediaUrl(mediaUrl);
  const request = (async (): Promise<MediaAvailability> => {
    if (!resolveUrl) {
      const fallback = {
        available: true,
        resolved_url: mediaUrl,
        candidate_urls: [mediaUrl],
      };
      mediaAvailabilityCache.set(mediaUrl, fallback);
      preconnectOrigin(mediaUrl);
      return fallback;
    }

    preconnectOrigin(resolveUrl);

    try {
      const response = await fetch(resolveUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        const fallback = {
          available: true,
          resolved_url: mediaUrl,
          candidate_urls: [mediaUrl],
        };
        mediaAvailabilityCache.set(mediaUrl, fallback);
        preconnectOrigin(mediaUrl);
        return fallback;
      }

      const data = await response.json() as Partial<MediaAvailability>;
      const resolved = {
        available: Boolean(data.available),
        resolved_url: data.resolved_url ?? null,
        candidate_urls: Array.isArray(data.candidate_urls) ? data.candidate_urls : [mediaUrl],
      };
      mediaAvailabilityCache.set(mediaUrl, resolved);
      boundedMap(mediaAvailabilityCache, MAX_MEDIA_CACHE);
      preconnectOrigin(resolved.resolved_url ?? mediaUrl);
      resolved.candidate_urls.forEach((candidate) => preconnectOrigin(candidate));
      return resolved;
    } catch {
      const fallback = {
        available: true,
        resolved_url: mediaUrl,
        candidate_urls: [mediaUrl],
      };
      mediaAvailabilityCache.set(mediaUrl, fallback);
      boundedMap(mediaAvailabilityCache, MAX_MEDIA_CACHE);
      preconnectOrigin(mediaUrl);
      return fallback;
    }
  })();

  mediaAvailabilityRequests.set(mediaUrl, request);

  try {
    return await request;
  } finally {
    mediaAvailabilityRequests.delete(mediaUrl);
  }
}

export function getCachedMediaAvailability(mediaUrl?: string | null): MediaAvailability | null {
  if (!mediaUrl) return null;
  return mediaAvailabilityCache.get(mediaUrl) ?? null;
}

export function primeMediaAvailability(mediaUrl?: string | null): void {
  if (!mediaUrl) return;
  preconnectOrigin(mediaUrl);
  warmMediaElement(mediaUrl);
  if (mediaAvailabilityCache.has(mediaUrl) || mediaAvailabilityRequests.has(mediaUrl)) {
    return;
  }
  if (!API_BASE) {
    mediaAvailabilityCache.set(mediaUrl, {
      available: true,
      resolved_url: mediaUrl,
      candidate_urls: [mediaUrl],
    });
    boundedMap(mediaAvailabilityCache, MAX_MEDIA_CACHE);
    return;
  }
  void resolveMediaAvailability(mediaUrl);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const cleanTitle = (title: string): string => {
  if (!title) return title;
  return title
    .replace(/mobifliks\.com\s*[-–—|:]\s*/gi, "")
    .replace(/\s*[-–—|:]\s*mobifliks\.com/gi, "")
    .replace(/mobifliks\.com/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const fixYear = (year?: number): number | undefined => {
  if (!year) return year;
  const currentYear = new Date().getFullYear();
  return year > currentYear ? currentYear : year;
};

const fixReleaseDate = (dateStr?: string): string | undefined => {
  if (!dateStr) return dateStr;
  try {
    const d = new Date(dateStr);
    const currentYear = new Date().getFullYear();
    if (d.getFullYear() > currentYear) {
      d.setFullYear(currentYear);
      return d.toISOString().split("T")[0];
    }
  } catch (e) { }
  return dateStr;
};

const normalize = (items: unknown[]): Movie[] =>
  Array.isArray(items)
    ? (items as Movie[])
      .filter((m) => m && (m.type === "movie" || m.type === "series"))
      .map((m) => ({
        ...m,
        title: cleanTitle(m.title ?? ""),
        year: fixYear(m.year),
        release_date: fixReleaseDate(m.release_date),
        logo_url: (m as any).raw_data?.tmdb?.details?.logo_url || m.logo_url,
      }))
    : [];

function compareOptionalDateDesc(left?: string | null, right?: string | null): number {
  if (left && right) {
    if (left > right) return -1;
    if (left < right) return 1;
  }
  if (left && !right) return -1;
  if (!left && right) return 1;
  return 0;
}

function compareMoviePriority(left: Movie, right: Movie): number {
  const viewsDiff = (right.views ?? 0) - (left.views ?? 0);
  if (viewsDiff !== 0) return viewsDiff;
  const releaseDiff = compareOptionalDateDesc(left.release_date, right.release_date);
  if (releaseDiff !== 0) return releaseDiff;
  const createdDiff = compareOptionalDateDesc(left.created_at, right.created_at);
  if (createdDiff !== 0) return createdDiff;
  return left.title.localeCompare(right.title);
}

function getVariantTitle(movie: Movie): string {
  return movie.type === "series" ? getSeriesBaseName(movie.title) : cleanTitle(movie.title);
}

function getVariantGroupKey(movie: Movie): string {
  const translationBucket = movie.vj_name?.trim() ? "translated" : "original";
  const titleKey = getVariantTitle(movie).toLowerCase();
  const yearKey = movie.year ?? movie.release_date?.slice(0, 4) ?? "unknown";
  return `${movie.type}:${translationBucket}:${titleKey}:${yearKey}`;
}

function stripVariantMetadata(movie: Movie): Movie {
  const { vj_versions, vj_count, ...rest } = movie;
  return { ...rest };
}

function attachVariantVersions(movies: Movie[]): Movie[] {
  const groups = new Map<string, { items: Movie[]; firstIndex: number }>();
  const result: Array<{ item: Movie; index: number }> = [];

  movies.forEach((movie, index) => {
    const key = getVariantGroupKey(movie);
    const group = groups.get(key);
    if (group) {
      group.items.push(movie);
      return;
    }
    groups.set(key, { items: [movie], firstIndex: index });
  });

  groups.forEach(({ items, firstIndex }) => {
    const sortedVariants = [...items].sort(compareMoviePriority).map(stripVariantMetadata);
    const primary = sortedVariants[0];
    result.push({
      item: {
        ...primary,
        vj_count: sortedVariants.length > 1 ? sortedVariants.length : undefined,
        vj_versions: sortedVariants.length > 1 ? sortedVariants : undefined,
      },
      index: firstIndex,
    });
  });

  return result.sort((a, b) => a.index - b.index).map((entry) => entry.item);
}

function finalizeBrowseResults(movies: Movie[], limit?: number): Movie[] {
  const grouped = attachVariantVersions(groupSeriesList(movies));
  return typeof limit === "number" ? grouped.slice(0, limit) : grouped;
}

async function fetchMovieVariants(movie: Movie): Promise<Movie[]> {
  const safeTitle = getVariantTitle(movie).replace(/[%_\\]/g, (char) => `\\${char}`);
  let query = supabase
    .from("movies")
    .select("*")
    .eq("type", movie.type)
    .ilike("title", `%${safeTitle}%`)
    .order("views", { ascending: false })
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(movie.type === "series" ? 60 : 20);

  if (movie.year) {
    query = query.eq("year", movie.year);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchMovieVariants error:", error);
    return [];
  }

  return normalize(data ?? [])
    .filter((candidate) => getVariantGroupKey(candidate) === getVariantGroupKey(movie))
    .sort(compareMoviePriority)
    .map(stripVariantMetadata);
}

// ─── Series Grouping ─────────────────────────────────────────────────────────

const seasonPattern = /\s*[-–—]?\s*Season\s*\d+/i;

export function getSeriesBaseName(title: string): string {
  return title
    .replace(seasonPattern, "")
    .replace(/\s*\(?\d{4}\s*[-–—].*\)\s*$/i, "")
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .trim();
}

function extractSeasonNumber(title: string): number {
  const match = title.match(/Season\s*(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

function splitEpisodesByGap(episodes: any[]): any[][] {
  if (episodes.length <= 1) return [episodes];
  const chunks: any[][] = [[episodes[0]]];
  for (let i = 1; i < episodes.length; i++) {
    const gap = (episodes[i].episode_number ?? 0) - (episodes[i - 1].episode_number ?? 0);
    if (gap > 20) {
      chunks.push([episodes[i]]);
    } else {
      chunks[chunks.length - 1].push(episodes[i]);
    }
  }
  return chunks;
}

function groupSeriesList(movies: Movie[]): Movie[] {
  const seriesGroups = new Map<string, { items: Movie[]; firstIndex: number }>();
  const result: { item: Movie; index: number }[] = [];

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    if (m.type !== "series") {
      result.push({ item: m, index: i });
      continue;
    }
    const baseName = getSeriesBaseName(m.title);
    if (!seriesGroups.has(baseName)) {
      seriesGroups.set(baseName, { items: [], firstIndex: i });
    }
    seriesGroups.get(baseName)!.items.push(m);
  }

  for (const [, group] of seriesGroups) {
    if (group.items.length === 1) {
      result.push({ item: group.items[0], index: group.firstIndex });
      continue;
    }
    const sorted = group.items.sort((a, b) => extractSeasonNumber(a.title) - extractSeasonNumber(b.title));
    const primary = sorted.reduce((best, cur) => ((cur.views ?? 0) > (best.views ?? 0) ? cur : best), sorted[0]);
    const totalViews = group.items.reduce((sum, s) => sum + (s.views ?? 0), 0);
    const relatedIds = sorted.map((s) => s.mobifliks_id);
    const baseName = getSeriesBaseName(primary.title);
    result.push({
      item: {
        ...primary,
        title: baseName,
        views: totalViews,
        relatedSeasonIds: relatedIds,
      } as Movie,
      index: group.firstIndex,
    });
  }

  return result.sort((a, b) => a.index - b.index).map((r) => r.item);
}

export interface FilterOptions {
  vj?: string | null;
  year?: number | null;
  genre?: string | null;
}

function applyFilters(query: any, filters?: FilterOptions) {
  if (!filters) return query;
  if (filters.vj) query = query.eq("vj_name", filters.vj);
  if (filters.year) query = query.eq("year", filters.year);
  if (filters.genre) query = query.filter("genres", "cs", JSON.stringify([filters.genre]));
  return query;
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

export async function fetchTrending(filters?: FilterOptions): Promise<Movie[]> {
  const targetLimit = filters?.vj || filters?.year ? 60 : 30;
  let query = supabase
    .from("movies")
    .select("*")
    .eq("type", "movie")
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(Math.min(targetLimit * 2, 120));
  query = applyFilters(query, filters);
  const { data, error } = await query;
  if (error) { console.error("fetchTrending error:", error); return []; }
  return finalizeBrowseResults(normalize(data ?? []), targetLimit);
}

export async function fetchRecent(contentType: string = "movie", limit: number = 20, page: number = 1): Promise<Movie[]> {
  const fetchLimit = contentType === "series" ? Math.min(limit * 2, 200) : limit;
  const offset = (page - 1) * limit;
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .eq("type", contentType)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + fetchLimit - 1);
  if (error) { console.error("fetchRecent error:", error); return []; }
  return finalizeBrowseResults(normalize(data ?? []), limit);
}

export async function fetchMoviesSorted(contentType: string = "movie", limit: number = 20, page: number = 1, filters?: FilterOptions, offsetOverride?: number): Promise<Movie[]> {
  const fetchLimit = contentType === "series" ? Math.min(limit * 2, 200) : limit;
  const offset = offsetOverride ?? ((page - 1) * limit);
  let query = supabase
    .from("movies")
    .select("*")
    .eq("type", contentType)
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + fetchLimit - 1);
  query = applyFilters(query, filters);
  const { data, error } = await query;
  if (error) { console.error("fetchMoviesSorted error:", error); return []; }
  return finalizeBrowseResults(normalize(data ?? []), limit);
}

export async function fetchSeries(limit: number = 20, page: number = 1, language?: string, filters?: FilterOptions, offsetOverride?: number): Promise<Movie[]> {
  const fetchLimit = Math.min(limit * 2, 200);
  const offset = offsetOverride ?? ((page - 1) * fetchLimit);
  let query = supabase
    .from("movies")
    .select("*")
    .eq("type", "series")
    .order("release_date", { ascending: false, nullsFirst: false })
    .order("views", { ascending: false })
    .range(offset, offset + fetchLimit - 1);
  query = applyFilters(query, filters);
  if (language) query = query.eq("language", language);
  const { data, error } = await query;
  if (error) { console.error("fetchSeries error:", error); return []; }
  return finalizeBrowseResults(normalize(data ?? []), limit);
}

export async function searchMovies(query: string, page: number = 1, limit: number = 20): Promise<SearchResult> {
  const fetchLimit = Math.min(limit * 2, 200);
  const offset = (page - 1) * limit;
  const safeQuery = query.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error, count } = await supabase
    .from("movies")
    .select("*", { count: "exact" })
    .in("type", ["movie", "series"])
    .ilike("title", `%${safeQuery}%`)
    .order("views", { ascending: false })
    .range(offset, offset + fetchLimit - 1);
  if (error) { console.error("searchMovies error:", error); return { results: [], total_results: 0, page }; }
  const grouped = finalizeBrowseResults(normalize(data ?? []));
  return { results: grouped.slice(0, limit), total_results: count ?? 0, page };
}

export async function searchAll(query: string, page: number = 1, limit: number = 100): Promise<Movie[]> {
  const fetchLimit = Math.min(limit * 2, 200);
  const offset = (page - 1) * limit;
  const safeQuery = query.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .in("type", ["movie", "series"])
    .or(`title.ilike.%${safeQuery}%,director.ilike.%${safeQuery}%,vj_name.ilike.%${safeQuery}%`)
    .order("views", { ascending: false })
    .range(offset, offset + fetchLimit - 1);
  if (error) { console.error("searchAll error:", error); return []; }
  return finalizeBrowseResults(normalize(data ?? []), limit);
}

export async function fetchMovieDetails(id: string): Promise<Movie | null> {
  if (movieDetailsCache.has(id)) return movieDetailsCache.get(id) ?? null;
  const inFlight = movieDetailsRequests.get(id);
  if (inFlight) return inFlight;

  const request = (async () => {
    const { data, error } = await supabase.from("movies").select("*").eq("mobifliks_id", id).single();
    if (error) { console.error("fetchMovieDetails error:", error); return null; }
    const movie = normalize([data])[0];
    if (!movie) return null;
    const versions = await fetchMovieVariants(movie);
    const detailedMovie = {
      ...movie,
      vj_count: versions.length > 1 ? versions.length : undefined,
      vj_versions: versions.length > 1 ? versions : undefined,
    };
    movieDetailsCache.set(id, detailedMovie);
    boundedMap(movieDetailsCache, MAX_DETAIL_CACHE);
    return detailedMovie;
  })();

  movieDetailsRequests.set(id, request);
  try { return await request; } finally { movieDetailsRequests.delete(id); }
}

export async function fetchSeriesDetails(id: string): Promise<Series | null> {
  if (seriesDetailsCache.has(id)) return seriesDetailsCache.get(id) ?? null;
  const inFlight = seriesDetailsRequests.get(id);
  if (inFlight) return inFlight;

  const request = (async () => {
    const { data, error } = await supabase.from("movies").select("*").eq("mobifliks_id", id).eq("type", "series").single();
    if (error || !data) { console.error("fetchSeriesDetails error:", error); return null; }
    const series = normalize([data])[0];
    if (!series) return null;
    const baseName = getSeriesBaseName(series.title);
    const { data: allRelated } = await supabase.from("movies").select("mobifliks_id, title").eq("type", "series").ilike("title", `${baseName.replace(/[%_\\]/g, (c: string) => `\\${c}`)}%`).order("title", { ascending: true });
    const seasonEntries = (allRelated ?? []).filter((r) => getSeriesBaseName(r.title) === baseName).sort((a, b) => extractSeasonNumber(a.title) - extractSeasonNumber(b.title));
    const seasonIds = seasonEntries.length > 1 ? seasonEntries.map((s) => s.mobifliks_id) : [id];
    const assignedSeasons = new Set<number>();
    const seasonNumbers: number[] = [];
    for (const entry of seasonEntries) {
      let sNum = extractSeasonNumber(entry.title);
      while (assignedSeasons.has(sNum)) sNum++;
      assignedSeasons.add(sNum);
      seasonNumbers.push(sNum);
    }
    const allEpisodes: Episode[] = [];
    let maxSeasonUsed = 0;
    for (let i = 0; i < seasonIds.length; i++) {
      const baseSeason = seasonEntries.length > 1 ? seasonNumbers[i] : 1;
      const { data: eps } = await supabase.from("movies").select("*").eq("series_id", seasonIds[i]).eq("type", "episode").order("episode_number", { ascending: true });
      if (eps?.length) {
        const chunks = splitEpisodesByGap(eps);
        for (let c = 0; c < chunks.length; c++) {
          const seasonNum = c === 0 ? baseSeason : maxSeasonUsed + 1 + c;
          chunks[c].forEach((ep: any, idx: number) => {
            allEpisodes.push({ ...ep, season_number: seasonNum, episode_number: idx + 1 } as Episode);
          });
        }
        maxSeasonUsed = Math.max(maxSeasonUsed, baseSeason + chunks.length - 1);
      }
    }
    const details = { ...series, title: baseName, episodes: allEpisodes, total_episodes: allEpisodes.length, relatedSeasonIds: seasonIds.length > 1 ? seasonIds : undefined } as Series;
    seriesDetailsCache.set(id, details);
    boundedMap(seriesDetailsCache, MAX_DETAIL_CACHE);
    return details;
  })();

  seriesDetailsRequests.set(id, request);
  try { return await request; } finally { seriesDetailsRequests.delete(id); }
}

export function getCachedSeriesDetails(id: string): Series | null { return seriesDetailsCache.get(id) ?? null; }
export function hasPendingSeriesDetailsRequest(id: string): boolean { return seriesDetailsRequests.has(id); }

export async function fetchSuggestions(query: string): Promise<Movie[]> {
  const safeQuery = query.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error } = await supabase.from("movies").select("*").in("type", ["movie", "series"]).ilike("title", `%${safeQuery}%`).order("views", { ascending: false }).limit(20);
  if (error) { console.error("fetchSuggestions error:", error); return []; }
  return finalizeBrowseResults(normalize(data ?? []), 10);
}

export async function fetchStats(): Promise<{ popular_searches: string[] }> {
  const { data, error } = await supabase.from("search_history").select("query").order("search_time", { ascending: false }).limit(10);
  if (error) return { popular_searches: [] };
  return { popular_searches: (data ?? []).map((r: { query: string }) => r.query) };
}

export async function fetchOriginals(limit: number = 50, page: number = 1): Promise<Movie[]> {
  const offset = (page - 1) * limit;
  const { data, error } = await supabase.from("movies").select("*").eq("type", "movie").is("vj_name", null).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) { console.error("fetchOriginals error:", error); return []; }
  return normalize(data ?? []);
}

export async function fetchByGenre(genre: string, contentType: "movie" | "series" | "all" = "movie", limit: number = 40, filters?: FilterOptions, page: number = 1, offsetOverride?: number): Promise<Movie[]> {
  const cacheKey = JSON.stringify({ genre, contentType, limit, page, offset: offsetOverride ?? null, vj: filters?.vj ?? null, year: filters?.year ?? null });
  if (genreQueryCache.has(cacheKey)) return genreQueryCache.get(cacheKey) ?? [];
  const inFlight = genreQueryRequests.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const fetchLimit = contentType === "series" ? Math.min(limit * 2, 200) : limit;
    const offset = offsetOverride ?? ((page - 1) * fetchLimit);
    let query = supabase.from("movies").select("*").filter("genres", "cs", JSON.stringify([genre])).order("release_date", { ascending: false, nullsFirst: false }).order("views", { ascending: false, nullsFirst: false }).order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).range(offset, offset + fetchLimit - 1);
    if (contentType !== "all") query = query.eq("type", contentType);
    query = applyFilters(query, { vj: filters?.vj, year: filters?.year });
    const { data, error } = await query;
    if (error) { console.error("fetchByGenre error:", error); return []; }
    const results = normalize(data ?? []);
    const groupedResults = finalizeBrowseResults(results, limit);
    genreQueryCache.set(cacheKey, groupedResults);
    return groupedResults;
  })();

  genreQueryRequests.set(cacheKey, request);
  try { return await request; } finally { genreQueryRequests.delete(cacheKey); }
}
