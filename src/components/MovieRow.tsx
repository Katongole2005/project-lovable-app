import { ChevronRight, SlidersHorizontal, Filter } from "lucide-react";
import { useRef } from "react";
import type { Movie } from "@/types/movie";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";
import { cn } from "@/lib/utils";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onViewAll?: () => void;
  isLoading?: boolean;
  showFilters?: boolean;
  className?: string;
}

export function MovieRow({ 
  title, 
  movies, 
  onMovieClick, 
  onViewAll, 
  isLoading, 
  showFilters = false,
  className 
}: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <section className={cn("py-4", className)}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg md:text-xl font-display font-semibold text-foreground tracking-tight">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MovieCardSkeleton key={i} className="w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return (
    <section className={cn("py-4", className)}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg md:text-xl font-display font-semibold text-foreground tracking-tight">{title}</h2>
        
        <div className="flex items-center gap-2">
          {showFilters && (
            <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-foreground">
              <button className="p-2 rounded-full text-background hover:bg-background/10 transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-full text-background hover:bg-background/10 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          )}
          
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
            >
              View All
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {movies.slice(0, 6).map((movie, index) => (
          <MovieCard
            key={movie.mobifliks_id}
            movie={movie}
            onClick={onMovieClick}
            className={cn(
              "w-full",
              "opacity-0 animate-slide-up",
              index < 6 && `stagger-${Math.min(index + 1, 5)}`
            )}
            priority={index < 4}
          />
        ))}
      </div>
    </section>
  );
}
