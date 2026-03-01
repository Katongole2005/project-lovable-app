import type { ContinueWatching, RecentMovie, Movie } from "@/types/movie";

const RECENT_KEY = "recentMovies";
const CONTINUE_KEY = "continueWatching";
const SEARCH_KEY = "recentSearches";
const WATCHLIST_KEY = "watchlist";
const RATINGS_KEY = "userRatings";

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
    return JSON.parse(localStorage.getItem(CONTINUE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function updateContinueWatching(item: ContinueWatching): void {
  const existing = getContinueWatching().find((m) => m.id === item.id);
  const list = getContinueWatching().filter((m) => m.id !== item.id);

  const safeDuration = Number.isFinite(item.duration) && item.duration > 0
    ? item.duration
    : (existing?.duration ?? 0);

  const safeProgress = Number.isFinite(item.progress) && item.progress > 0
    ? item.progress
    : 0;

  // Prevent regressions (e.g. accidental 0:00 overwrite during player init/close race)
  const mergedProgress = Math.max(existing?.progress ?? 0, safeProgress);

  const mergedItem: ContinueWatching = {
    ...(existing ?? item),
    ...item,
    duration: safeDuration,
    progress: mergedProgress,
  };

  if (mergedItem.duration > 0 && mergedItem.progress > 0 && mergedItem.progress < mergedItem.duration - 30) {
    list.unshift(mergedItem);
  }

  localStorage.setItem(CONTINUE_KEY, JSON.stringify(list.slice(0, 10)));
}

export function removeContinueWatching(id: string): void {
  const list = getContinueWatching().filter(m => m.id !== id);
  localStorage.setItem(CONTINUE_KEY, JSON.stringify(list));
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
