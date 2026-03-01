import { ChevronRight, SlidersHorizontal, Filter } from "lucide-react";
import { useRef, forwardRef } from "react";
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
  onFilterClick?: () => void;
  className?: string;
}

export const MovieRow = forwardRef<HTMLElement, MovieRowProps>(function MovieRow({ 
  title, 
  movies, 
  onMovieClick, 
  onViewAll, 
  isLoading, 
  showFilters = false,
  onFilterClick,
  className 
}, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <section ref={ref} className={cn("py-4", className)}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg md:text-xl font-display font-semibold text-foreground tracking-tight">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <MovieCardSkeleton key={i} className="w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return (
    <section ref={ref} className={cn("py-4", className)}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg md:text-xl font-display font-semibold text-foreground tracking-tight">{title}</h2>
        
        <div className="flex items-center gap-2">
          {/* Mobile filter button */}
          {showFilters && onFilterClick && (
            <button
              onClick={onFilterClick}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 active:scale-95"
              style={{ backgroundColor: '#4ade80' }}
            >
              <SlidersHorizontal className="w-4 h-4 text-black" />
            </button>
          )}

          {/* Desktop filter buttons */}
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
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group press-effect"
            >
              View All
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {movies.slice(0, 24).map((movie, index) => (
          <MovieCard
            key={movie.mobifliks_id}
            movie={movie}
            onClick={onMovieClick}
            className={cn(
              "w-full",
              "opacity-0 animate-scale-in",
              `stagger-${Math.min((index % 8) + 1, 8)}`
            )}
            priority={index < 4}
          />
        ))}
      </div>
    </section>
  );
});
