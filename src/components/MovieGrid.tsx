import type { Movie } from "@/types/movie";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

interface MovieGridProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function MovieGrid({ movies, onMovieClick, isLoading, emptyMessage = "No content found", className }: MovieGridProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4", className)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <MovieCardSkeleton key={i} className="w-full" />
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
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4", className)}>
      {movies.map((movie, index) => (
        <MovieCard
          key={movie.mobifliks_id}
          movie={movie}
          onClick={onMovieClick}
          className={cn(
            "w-full",
            "opacity-0 animate-scale-in",
            `stagger-${Math.min((index % 8) + 1, 8)}`
          )}
          priority={index < 6}
        />
      ))}
    </div>
  );
}
