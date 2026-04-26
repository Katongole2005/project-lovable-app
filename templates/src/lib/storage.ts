import type { ContinueWatching, RecentMovie, Movie } from "@/types/movie";

const RECENT_KEY = "recentMovies";
const CONTINUE_KEY = "continueWatching";
const CONTINUE_EVENT = "moviebay:continue-watching";
const SEARCH_KEY = "recentSearches";
const WATCHLIST_KEY = "watchlist";
const RATINGS_KEY = "userRatings";
let continueWatchingSnapshotRaw = "[]";
let continueWatchingSnapshot: ContinueWatching[] = [];

function emitContinueWatchingChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CONTINUE_EVENT));
  }
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toNonNegativeNumber(value: unknown, fallback = 0): number {
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) && next >= 0 ? next : fallback;
}

function toPositiveInteger(value: unknown): number | undefined {
  const next = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(next) || next <= 0) return undefined;
  return Math.trunc(next);
}

function stripContinueWatchingPrefix(id: string): string {
  return id.replace(/^(movie|series):/i, "");
}

function parseEpisodeInfo(episodeInfo?: string): { seasonNumber?: number; episodeNumber?: number } {
  if (!episodeInfo) return {};
  const match = episodeInfo.match(/S(\d+)\s*:\s*E(\d+)/i);
  if (!match) return {};
  return {
    seasonNumber: parseInt(match[1], 10),
    episodeNumber: parseInt(match[2], 10),
  };
}

function formatEpisodeInfo(seasonNumber?: number, episodeNumber?: number): string | undefined {
  if (!seasonNumber || !episodeNumber) return undefined;
  return `S${seasonNumber}:E${episodeNumber}`;
}

function buildContinueWatchingId(
  type: "movie" | "series",
  contentId: string,
  seriesId?: string
): string {
  if (type === "series") {
    return `series:${seriesId || contentId}`;
  }
  return `movie:${contentId}`;
}

function normalizeContinueWatchingItem(raw: unknown): ContinueWatching | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Partial<ContinueWatching> & {
    season_number?: number;
    episode_number?: number;
  };
  const type: "movie" | "series" = source.type === "series" ? "series" : "movie";
  const legacyId = typeof source.id === "string" ? source.id.trim() : "";
  const contentId =
    (typeof source.contentId === "string" && source.contentId.trim()) ||
    stripContinueWatchingPrefix(legacyId);
  const title = typeof source.title === "string" ? source.title.trim() : "";
  const image = typeof source.image === "string" ? source.image : "";
  const url = typeof source.url === "string" ? source.url : "";

  if (!contentId || !title || !url) return null;

  const seriesId = type === "series"
    ? (
      (typeof source.seriesId === "string" && source.seriesId.trim()) ||
      contentId
    )
    : undefined;
  const parsedEpisode = parseEpisodeInfo(source.episodeInfo);
  const seasonNumber = toPositiveInteger(
    source.seasonNumber ?? source.season_number ?? parsedEpisode.seasonNumber
  );
  const episodeNumber = toPositiveInteger(
    source.episodeNumber ?? source.episode_number ?? parsedEpisode.episodeNumber
  );
  const duration = toNonNegativeNumber(source.duration, 0);
  const progress = Math.min(
    toNonNegativeNumber(source.progress, 0),
    duration > 0 ? duration : Number.MAX_SAFE_INTEGER
  );
  const episodeInfo = formatEpisodeInfo(seasonNumber, episodeNumber) ?? source.episodeInfo;

  return {
    id: buildContinueWatchingId(type, contentId, seriesId),
    contentId,
    title,
    image,
    type,
    progress,
    duration,
    url,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
    seriesId,
    episodeId: typeof source.episodeId === "string" ? source.episodeId : undefined,
    episodeTitle: typeof source.episodeTitle === "string" ? source.episodeTitle : undefined,
    seasonNumber,
    episodeNumber,
    episodeInfo,
  };
}

function parseContinueWatchingSnapshot(raw: string): ContinueWatching[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const normalized: ContinueWatching[] = [];

    for (const item of parsed) {
      const next = normalizeContinueWatchingItem(item);
      if (!next || seen.has(next.id)) continue;
      seen.add(next.id);
      normalized.push(next);
    }

    return normalized;
  } catch {
    return [];
  }
}

function updateContinueWatchingSnapshot(list: ContinueWatching[]): string {
  continueWatchingSnapshot = list;
  continueWatchingSnapshotRaw = JSON.stringify(list);
  return continueWatchingSnapshotRaw;
}

function writeContinueWatching(list: ContinueWatching[]): void {
  const nextList = list.slice(0, 10);
  const raw = updateContinueWatchingSnapshot(nextList);
  localStorage.setItem(CONTINUE_KEY, raw);
  emitContinueWatchingChange();
}

export function subscribeContinueWatching(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CONTINUE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CONTINUE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CONTINUE_EVENT, onStoreChange);
  };
}

export function getRecentlyViewed(): RecentMovie[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToRecent(movie: Movie): void {
  const recent = getRecentlyViewed().filter(m => m.id !== movie.mobifliks_id);
  recent.unshift({
    id: movie.mobifliks_id,
    title: movie.title,
    image: movie.image_url || "",
    type: movie.type,
    time: new Date().toISOString(),
  });
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 20)));
}

export function getContinueWatching(): ContinueWatching[] {
  try {
    const raw = localStorage.getItem(CONTINUE_KEY) || "[]";
    if (raw === continueWatchingSnapshotRaw) {
      return continueWatchingSnapshot;
    }

    const normalized = parseContinueWatchingSnapshot(raw);
    continueWatchingSnapshotRaw = raw;
    continueWatchingSnapshot = normalized;
    return normalized;
  } catch {
    continueWatchingSnapshotRaw = "[]";
    continueWatchingSnapshot = [];
    return [];
  }
}

export function updateContinueWatching(item: ContinueWatching): void {
  const normalizedItem = normalizeContinueWatchingItem({
    ...item,
    updatedAt: new Date().toISOString(),
  });
  if (!normalizedItem) return;

  const all = getContinueWatching();
  const existing = all.find((m) => m.id === normalizedItem.id);
  const list = all.filter((m) => m.id !== normalizedItem.id);

  const safeDuration = isPositiveNumber(normalizedItem.duration)
    ? normalizedItem.duration
    : (existing?.duration ?? 0);

  const safeProgress = Number.isFinite(normalizedItem.progress) && normalizedItem.progress >= 0
    ? normalizedItem.progress
    : (existing?.progress ?? 0);

  if (safeProgress === 0 && existing && existing.progress > 5) {
    list.unshift({ ...existing, duration: safeDuration || existing.duration });
    writeContinueWatching(list);
    return;
  }

  const mergedItem: ContinueWatching = {
    ...(existing ?? normalizedItem),
    ...normalizedItem,
    duration: safeDuration,
    progress: safeProgress,
  };

  if (mergedItem.duration > 0 && mergedItem.progress > 0 && mergedItem.progress < mergedItem.duration - 30) {
    list.unshift(mergedItem);
  }

  writeContinueWatching(list);
}

export function removeContinueWatching(id: string): void {
  const rawId = stripContinueWatchingPrefix(id);
  const list = getContinueWatching().filter(
    (item) => item.id !== id && item.contentId !== rawId && item.seriesId !== rawId
  );
  writeContinueWatching(list);
}

export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const cleaned = query.trim();
  if (!cleaned) return;
  const searches = getRecentSearches().filter(s => s.toLowerCase() !== cleaned.toLowerCase());
  searches.unshift(cleaned);
  localStorage.setItem(SEARCH_KEY, JSON.stringify(searches.slice(0, 10)));
}

// ===== WATCHLIST =====
export interface WatchlistItem {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series';
  addedAt: string;
}

export function getWatchlist(): WatchlistItem[] {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

export function isInWatchlist(id: string): boolean {
  return getWatchlist().some(item => item.id === id);
}

export function toggleWatchlist(movie: Movie): boolean {
  const list = getWatchlist();
  const exists = list.findIndex(item => item.id === movie.mobifliks_id);
  if (exists >= 0) {
    list.splice(exists, 1);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    return false; // removed
  } else {
    list.unshift({
      id: movie.mobifliks_id,
      title: movie.title,
      image: movie.image_url || "",
      type: movie.type,
      addedAt: new Date().toISOString(),
    });
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list.slice(0, 50)));
    return true; // added
  }
}

// ===== RATINGS =====
export interface UserRating {
  id: string;
  rating: number; // 1-5
  ratedAt: string;
}

export function getUserRatings(): UserRating[] {
  try {
    return JSON.parse(localStorage.getItem(RATINGS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getUserRating(id: string): number | null {
  const rating = getUserRatings().find(r => r.id === id);
  return rating ? rating.rating : null;
}

export function setUserRating(id: string, rating: number): void {
  const list = getUserRatings().filter(r => r.id !== id);
  list.unshift({ id, rating, ratedAt: new Date().toISOString() });
  localStorage.setItem(RATINGS_KEY, JSON.stringify(list.slice(0, 200)));
}

export function clearAllStorageData(): void {
  localStorage.removeItem(RECENT_KEY);
  localStorage.removeItem(CONTINUE_KEY);
  localStorage.removeItem(SEARCH_KEY);
  localStorage.removeItem(WATCHLIST_KEY);
  localStorage.removeItem(RATINGS_KEY);
  emitContinueWatchingChange();
}
