import { getImageUrl, getOptimizedBackdropUrl, isUsableArtworkUrl } from "@/lib/api";
import type { Movie } from "@/types/movie";

export function getHeroBackdropUrl(movie: Movie | undefined, preferHighRes: boolean): string | null {
  if (!movie) return null;

  if (movie.backdrop_url && isUsableArtworkUrl(movie.backdrop_url)) {
    // Always request the highest available quality for the hero banner.
    // w1280 is the largest standard TMDB size; swap out any lower-res variants.
    return movie.backdrop_url
      .replace("/w780/", "/w1280/")
      .replace("/w500/", "/w1280/")
      .replace("/w300/", "/w1280/");
  }

  if (movie.image_url && isUsableArtworkUrl(movie.image_url)) {
    return getImageUrl(movie.image_url);
  }

  return null;
}

export function getHeroPosterUrl(movie: Movie | undefined): string | null {
  if (!movie?.image_url || !isUsableArtworkUrl(movie.image_url)) return null;
  return getImageUrl(movie.image_url);
}

export function preloadHeroImage(url: string | null | undefined): void {
  if (!url || typeof window === "undefined") return;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

export function preloadHeroMovies(movies: Movie[], preferHighRes: boolean, count = 4): void {
  movies.slice(0, count).forEach((movie) => {
    preloadHeroImage(getHeroBackdropUrl(movie, preferHighRes));
    preloadHeroImage(getHeroPosterUrl(movie));
  });
}
