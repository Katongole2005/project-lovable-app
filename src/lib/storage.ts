import type { ContinueWatching, RecentMovie, Movie } from "@/types/movie";

const RECENT_KEY = "recentMovies";
const CONTINUE_KEY = "continueWatching";
const SEARCH_KEY = "recentSearches";

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
  const list = getContinueWatching().filter(m => m.id !== item.id);
  if (item.progress > 0 && item.progress < item.duration - 30) {
    list.unshift(item);
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
