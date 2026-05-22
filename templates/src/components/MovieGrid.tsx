"use client";
import type { Movie } from "@/types/movie";
import type { CSSProperties } from "react";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

interface MovieGridProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  isLoading?: boolean;
  appendSkeletonCount?: number;
  emptyMessage?: string;
  className?: string;
}

export function MovieGrid({ movies, onMovieClick, isLoading, appendSkeletonCount = 0, emptyMessage = "No content found", className }: MovieGridProps) {
  if (isLoading) {
    return (
      <div className={cn("movie-grid-cinematic grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 2xl:gap-5", className)}>
        {Array.from({ length: 16 }).map((_, i) => (
          <MovieCardSkeleton
            key={i}
            className="w-full browse-card-enter"
            style={{ "--card-index": i } as CSSProperties}
          />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <EmptyState
        icon="film"
        title="No content found"
        message={emptyMessage}
      />
    );
  }

  return (
    <div className={cn("movie-grid-cinematic grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 2xl:gap-5", className)}>
      {movies.map((movie, index) => (
        <MovieCard
          key={movie.mobifliks_id}
          movie={movie}
          onClick={onMovieClick}
          className="w-full browse-card-enter browse-card-depth"
          style={{ "--card-index": index % 24 } as CSSProperties}
          priority={index < 6}
          allowNewBadge={index < 15}
        />
      ))}
      {Array.from({ length: appendSkeletonCount }).map((_, i) => (
        <MovieCardSkeleton
          key={`append-skeleton-${i}`}
          className="w-full browse-card-enter"
          style={{ "--card-index": (movies.length + i) % 24 } as CSSProperties}
        />
      ))}
    </div>
  );
}
