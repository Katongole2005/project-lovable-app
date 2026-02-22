import { Play, Star } from "lucide-react";
import type { Movie } from "@/types/movie";
import { getImageUrl, preloadMovieBackdrop } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  showProgress?: number;
  className?: string;
  priority?: boolean;
}

export function MovieCard({ movie, onClick, showProgress, className, priority }: MovieCardProps) {
  // Generate a random rating between 6.0 and 8.5 for demo
  const rating = movie.views 
    ? Math.min(8.5, Math.max(6.0, (movie.views / 10000) + 6)).toFixed(1)
    : (6.0 + Math.random() * 2.5).toFixed(1);

  // Preload backdrop on hover for instant modal loading
  const handleMouseEnter = useCallback(() => {
    preloadMovieBackdrop(movie);
  }, [movie]);

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 cursor-pointer press-effect",
        className
      )}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
    >
      {/* Image container */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-card shadow-card card-hover hover-glow">
        <img
          src={getImageUrl(movie.image_url)}
          alt={movie.title}
          className="w-full h-full object-cover card-image-zoom"
          loading={priority ? "eager" : "lazy"}
        />
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 rounded-full bg-background/90 backdrop-blur flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg">
            <Play className="w-5 h-5 text-primary fill-current ml-0.5" />
          </div>
        </div>

        {/* Badges */}
        {movie.type === "series" && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-secondary text-secondary-foreground">
              SERIES
            </span>
          </div>
        )}

        {/* Progress bar for continue watching */}
        {showProgress !== undefined && showProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${showProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Card body - below the image */}
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
}

export function MovieCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex-shrink-0", className)}>
      <div className="aspect-[2/3] rounded-2xl bg-card shimmer" />
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-muted/30 rounded shimmer w-3/4" />
        <div className="h-3 bg-muted/30 rounded shimmer w-1/2" />
      </div>
    </div>
  );
}
