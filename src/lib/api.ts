import type { Movie, Series, SearchResult } from "@/types/movie";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const fallbackPoster = "https://placehold.co/300x450/1a1a2e/ffffff?text=No+Poster";

export const getImageUrl = (url?: string) => url || fallbackPoster;

/**
 * Optimize TMDB image URL by using a smaller size for faster loading.
 * Converts w1280 -> w780 for backdrops (2x faster, still good quality on most screens).
 * Also converts 'original' to appropriate sizes.
 */
export const getOptimizedBackdropUrl = (url?: string): string => {
  if (!url) return fallbackPoster;
  
  // Convert large backdrop sizes to smaller ones for faster loading
  // w1280 -> w780 (saves ~50% bandwidth, loads 2-3x faster)
  // original -> w780 (even bigger savings)
  return url
    .replace('/w1280/', '/w780/')
    .replace('/original/', '/w780/');
};

/**
 * Preload an image in the background.
 * Returns a promise that resolves when the image is loaded.
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
    img.src = url;
  });
};

/**
 * Preload backdrop for a movie (used on hover for instant modal opening).
 */
export const preloadMovieBackdrop = (movie: { backdrop_url?: string | null; image_url?: string }): void => {
  const backdropUrl = movie.backdrop_url;
  if (backdropUrl) {
    const optimizedUrl = getOptimizedBackdropUrl(backdropUrl);
    // Fire and forget - we don't need to wait
    preloadImage(optimizedUrl).catch(() => {
      // Silently fail - the modal will show a shimmer instead
    });
  }
};

// Helper to fetch via the edge function proxy
const fetchViaProxy = async (path: string, timeout = 8000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/api-proxy?path=${encodeURIComponent(path)}`,
      {
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
        },
      }
    );
    
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const normalizeList = (items: Movie[]) =>
  Array.isArray(items) ? items.filter((m) => m && (m.type === "movie" || m.type === "series")) : [];

export async function fetchTrending(): Promise<Movie[]> {
  try {
    const response = await fetchViaProxy("/recent?content_type=movie&limit=50&page=1");
    if (!response.ok) throw new Error("Failed to fetch trending");
    const data = await response.json();
    return normalizeList(data);
  } catch (error) {
    console.error("Error fetching trending:", error);
    return [];
  }
}

export async function fetchRecent(
  contentType: string = "movie",
  limit: number = 20,
  page: number = 1
): Promise<Movie[]> {
  try {
    const response = await fetchViaProxy(
      `/recent?content_type=${encodeURIComponent(contentType)}&limit=${limit}&page=${page}`
    );
    if (!response.ok) throw new Error("Failed to fetch recent");
    const data = await response.json();
    return normalizeList(data);
  } catch (error) {
    console.error("Error fetching recent:", error);
    return [];
  }
}

export async function fetchSeries(limit: number = 20, page: number = 1, language?: string): Promise<Movie[]> {
  try {
    const langParam = language ? `&language=${encodeURIComponent(language)}` : "";
    const response = await fetchViaProxy(`/series?limit=${limit}&page=${page}${langParam}`);
    if (!response.ok) throw new Error("Failed to fetch series");
    const data = await response.json();
    return normalizeList(data);
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
}

export async function searchMovies(query: string, page: number = 1, limit: number = 20): Promise<SearchResult> {
  try {
    const response = await fetchViaProxy(
      `/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&title_only=true&content_type=all`
    );
    if (!response.ok) throw new Error("Failed to search");
    const data = await response.json();
    return {
      results: normalizeList(data.results || []),
      total_results: data.total_results || 0,
      page: data.page || page,
    };
  } catch (error) {
    console.error("Error searching:", error);
    return { results: [], total_results: 0, page };
  }
}

export async function searchAll(query: string, page: number = 1, limit: number = 100): Promise<Movie[]> {
  try {
    const response = await fetchViaProxy(
      `/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}&title_only=false&content_type=all`
    );
    if (!response.ok) throw new Error("Failed to search all");
    const data = await response.json();
    return normalizeList(data.results || []);
  } catch (error) {
    console.error("Error searching all:", error);
    return [];
  }
}

export async function fetchMovieDetails(id: string): Promise<Movie | null> {
  try {
    const response = await fetchViaProxy(`/movie/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("Failed to fetch movie");
    return await response.json();
  } catch (error) {
    console.error("Error fetching movie:", error);
    return null;
  }
}

export async function fetchSeriesDetails(id: string): Promise<Series | null> {
  try {
    const response = await fetchViaProxy(`/series/${id}?include_episodes=true`);
    if (!response.ok) throw new Error("Failed to fetch series");
    return await response.json();
  } catch (error) {
    console.error("Error fetching series:", error);
    return null;
  }
}

export async function fetchSuggestions(query: string): Promise<Movie[]> {
  try {
    const response = await fetchViaProxy(
      `/search?q=${encodeURIComponent(query)}&limit=10&page=1&title_only=true&content_type=all`
    );
    if (!response.ok) throw new Error("Failed to fetch suggestions");
    const data = await response.json();
    return normalizeList(data.results || []);
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
}

export async function fetchStats(): Promise<{ popular_searches: string[] }> {
  try {
    const response = await fetchViaProxy("/stats");
    if (!response.ok) throw new Error("Failed to fetch stats");
    return await response.json();
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { popular_searches: [] };
  }
}

export async function fetchOriginals(limit: number = 50, page: number = 1): Promise<Movie[]> {
  try {
    const response = await fetchViaProxy(`/originals?limit=${limit}&page=${page}`);
    if (!response.ok) throw new Error("Failed to fetch originals");
    const data = await response.json();
    return normalizeList(data);
  } catch (error) {
    console.error("Error fetching originals:", error);
    return [];
  }
}

export async function fetchByGenre(
  genre: string,
  contentType: "movie" | "series" | "all" = "movie",
  limit: number = 40
): Promise<Movie[]> {
  try {
    const response = await fetchViaProxy(
      `/movies/by-genre/${encodeURIComponent(genre)}?limit=${limit}&content_type=${contentType}`
    );
    if (!response.ok) throw new Error("Failed to fetch by genre");
    const data = await response.json();
    return normalizeList(data);
  } catch (error) {
    console.error("Error fetching by genre:", error);
    return [];
  }
}
