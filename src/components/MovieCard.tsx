import { Play, Star, Heart, TrendingUp, Sparkles } from "lucide-react";
import type { Movie } from "@/types/movie";
import { getImageUrl, preloadMovieBackdrop } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCallback, useState, useEffect, forwardRef } from "react";
import { isInWatchlist, toggleWatchlist } from "@/lib/storage";

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  showProgress?: number;
  className?: string;
  priority?: boolean;
  onWatchlistChange?: () => void;
}

/** Check if movie was released within last 30 days */
function isNewRelease(movie: Movie): boolean {
  if (!movie.release_date) return false;
  const released = new Date(movie.release_date);
  const daysAgo = (Date.now() - released.getTime()) / (1000 * 60 * 60 * 24);
  return daysAgo >= 0 && daysAgo <= 30;
}

/** Check if movie is trending (high views) */
function isTrending(movie: Movie): boolean {
  return (movie.views ?? 0) >= 5000;
}

export const MovieCard = forwardRef<HTMLDivElement, MovieCardProps>(function MovieCard({ movie, onClick, showProgress, className, priority, onWatchlistChange }, ref) {
  const rating = movie.views 
    ? Math.min(8.5, Math.max(6.0, (movie.views / 10000) + 6)).toFixed(1)
    : (6.0 + Math.random() * 2.5).toFixed(1);

  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    setInWatchlist(isInWatchlist(movie.mobifliks_id));
  }, [movie.mobifliks_id]);

  const handleMouseEnter = useCallback(() => {
    preloadMovieBackdrop(movie);
  }, [movie]);

  const handleWatchlistToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggleWatchlist(movie);
    setInWatchlist(added);
    onWatchlistChange?.();
  }, [movie, onWatchlistChange]);

  const isNew = isNewRelease(movie);
  const trending = isTrending(movie);

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex-shrink-0 cursor-pointer press-effect",
        className
      )}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-card shadow-card card-hover hover-glow">
        <img
          src={getImageUrl(movie.image_url)}
          alt={movie.title}
          className="w-full h-full object-cover card-image-zoom"
          loading={priority ? "eager" : "lazy"}
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-background/90 backdrop-blur flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg">
            <Play className="w-5 h-5 text-primary fill-current ml-0.5" />
          </div>
        </div>

        {/* Badges row */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {isNew && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[hsl(142,71%,45%)] text-white flex items-center gap-0.5 animate-pulse shadow-md">
              <Sparkles className="w-2.5 h-2.5" />
              NEW
            </span>
          )}
          {trending && !isNew && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[hsl(25,95%,53%)] text-white flex items-center gap-0.5 shadow-md">
              <TrendingUp className="w-2.5 h-2.5" />
              HOT
            </span>
          )}
          {movie.type === "series" && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-secondary text-secondary-foreground">
              SERIES
            </span>
          )}
        </div>

        {/* Watchlist heart */}
        <button
          onClick={handleWatchlistToggle}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10",
            inWatchlist 
              ? "bg-primary/90 text-primary-foreground scale-100" 
              : "bg-background/60 backdrop-blur text-foreground opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart className={cn("w-4 h-4", inWatchlist && "fill-current")} />
        </button>

        {/* Progress bar */}
        {showProgress !== undefined && showProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${showProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <h3 className="font-medium text-sm leading-snug text-foreground line-clamp-1 group-hover:text-primary transition-colors tracking-normal">
          {movie.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rating-badge font-semibold">
            <Star className="w-3 h-3 fill-current" />
            {rating}
          </span>
          {movie.year && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="font-medium">{movie.year}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export function MovieCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex-shrink-0", className)}>
      <div className="aspect-[2/3] rounded-2xl bg-card overflow-hidden relative">
        <div className="absolute inset-0 shimmer" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-muted/30 rounded-lg shimmer w-3/4" />
        <div className="h-3 bg-muted/30 rounded-lg shimmer w-1/2" />
      </div>
    </div>
  );
}
