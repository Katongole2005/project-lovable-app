import { Play, Star, Heart, TrendingUp, Sparkles } from "lucide-react";
import type { Movie } from "@/types/movie";
import { buildMediaUrl, getImageUrl, preloadMovieBackdrop, primeMediaAvailability } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCallback, useState, useEffect, forwardRef, memo } from "react";
import { isInWatchlist, toggleWatchlist } from "@/lib/storage";
import { BlurImage } from "./BlurImage";

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  showProgress?: number;
  className?: string;
  priority?: boolean;
  allowNewBadge?: boolean;
  onWatchlistChange?: () => void;
}

function isNewRelease(movie: Movie): boolean {
  const newestKnownDate = movie.created_at || movie.release_date;
  if (!newestKnownDate) return false;

  const addedAt = new Date(newestKnownDate);
  if (Number.isNaN(addedAt.getTime())) return false;

  const daysAgo = (Date.now() - addedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysAgo >= 0 && daysAgo <= 30;
}

function isTrending(movie: Movie): boolean {
  return (movie.views ?? 0) >= 5000;
}

function getStableRating(movie: Movie): string {
  if (movie.views) {
    return Math.min(8.5, Math.max(6.0, (movie.views / 10000) + 6)).toFixed(1);
  }

  const hash = movie.mobifliks_id.split("").reduce((acc, char) => {
    acc = (acc << 5) - acc + char.charCodeAt(0);
    return acc & acc;
  }, 0);

  return (6 + (Math.abs(hash) % 26) / 10).toFixed(1);
}

const MovieCardBase = forwardRef<HTMLDivElement, MovieCardProps>(function MovieCard({ movie, onClick, showProgress, className, priority, allowNewBadge = false, onWatchlistChange }, ref) {
  const rating = getStableRating(movie);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setInWatchlist(isInWatchlist(movie.mobifliks_id));
  }, [movie.mobifliks_id]);

  const primePlayback = useCallback(async () => {
    const targetUrl = movie.server2_url || movie.download_url;
    if (!targetUrl) return;
    const mediaUrl = await buildMediaUrl({
      url: targetUrl,
      title: movie.title,
      detailsUrl: movie.video_page_url || movie.details_url,
      mobifliksId: movie.mobifliks_id,
      play: true,
    });
    primeMediaAvailability(mediaUrl);
  }, [movie]);

  const handleMouseEnter = useCallback(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;
    preloadMovieBackdrop(movie);
    primePlayback();
    setHovered(true);
  }, [movie, primePlayback]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const [heartFlip, setHeartFlip] = useState(false);

  const handleWatchlistToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggleWatchlist(movie);
    setInWatchlist(added);
    setHeartFlip(true);
    setTimeout(() => setHeartFlip(false), 400);
    onWatchlistChange?.();
  }, [movie, onWatchlistChange]);

  const isNew = allowNewBadge && isNewRelease(movie);
  const trending = isTrending(movie);
  const hasMultipleVjs = (movie.vj_versions?.length ?? 0) > 1;

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex-shrink-0 cursor-pointer overflow-visible touch-manipulation",
        className
      )}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onTouchStart={primePlayback}
      onFocus={primePlayback}
      onMouseLeave={handleMouseLeave}
      data-testid={`card-movie-${movie.mobifliks_id}`}
    >
      <div
        className={cn(
          "relative aspect-[2/3] overflow-hidden rounded-[2rem] bg-card border border-black/[0.03] shadow-card card-rim-light card-premium-shadow transition-transform duration-300 active:scale-[0.98] md:hover:-translate-y-2 md:hover:scale-[1.02] md:backdrop-blur-sm",
          typeof window !== "undefined" && window.innerWidth >= 768 && "will-change-transform"
        )}
      >
        <BlurImage
          src={getImageUrl(movie.image_url)}
          alt={movie.title}
          className="card-image-zoom"
          loading={priority ? "eager" : "lazy"}
        />

        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none md:group-hover:opacity-100 card-gloss-effect"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 md:group-hover:opacity-100">
          <div className="play-ring-pulse w-12 h-12 rounded-full bg-white/95 dark:bg-white/90 flex items-center justify-center scale-75 transition-transform duration-300 shadow-[0_0_24px_hsl(210_100%_60%/0.4)] md:group-hover:scale-100 md:backdrop-blur-md">
            <Play className="w-5 h-5 text-primary fill-current ml-0.5" data-testid="icon-play" />
          </div>
        </div>

        {hovered && movie.genres && movie.genres.length > 0 && (
          <div className="absolute bottom-2 left-0 right-0 hidden md:flex flex-wrap justify-center gap-1 px-2 pointer-events-none animate-fade-in">
            {movie.genres.slice(0, 2).map(g => (
              <span
                key={g}
                className="px-2.5 py-0.5 text-[9px] font-semibold rounded-full bg-black/70 text-white/90 border border-white/10 tracking-wide uppercase md:backdrop-blur-sm"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
          {isNew && (
            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-500 text-white flex items-center gap-0.5 shadow-sm">
              <Sparkles className="w-2.5 h-2.5" />
              NEW
            </span>
          )}
          {trending && !isNew && (
            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-orange-500 text-white flex items-center gap-0.5 shadow-sm">
              <TrendingUp className="w-2.5 h-2.5" />
              HOT
            </span>
          )}
          {hasMultipleVjs && (
            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-sky-500/90 text-white shadow-sm">
              {movie.vj_versions?.length} VJs
            </span>
          )}
          {movie.type === "series" && (
            <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-primary text-primary-foreground shadow-sm">
              SERIES
            </span>
          )}
        </div>

        <button
          onClick={handleWatchlistToggle}
          aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          data-testid={`button-watchlist-${movie.mobifliks_id}`}
          className={cn(
            "absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 z-10 shadow-sm",
            inWatchlist
              ? "bg-primary text-primary-foreground scale-100"
              : "bg-black/30 text-white/90 backdrop-blur-md opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/50",
            heartFlip && "animate-heart-flip"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5 transition-transform", inWatchlist && "fill-current")} />
        </button>

        {showProgress !== undefined && showProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="progress-bar">
              <div className="progress-bar-fill progress-fill-dynamic" style={{ width: `${showProgress}%` } as React.CSSProperties} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="h-5 flex items-center">
          {movie.logo_url ? (
            <img
              src={movie.logo_url}
              alt={movie.title}
              className="h-full w-auto max-w-full object-contain object-left opacity-90 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            <h3 className="font-display font-bold text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors tracking-tight" data-testid={`text-title-${movie.mobifliks_id}`}>
              {movie.title}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rating-badge font-semibold" data-testid={`text-rating-${movie.mobifliks_id}`}>
            <Star className="w-3 h-3 fill-current" />
            {rating}
          </span>
          {movie.year && (
            <>
              <span className="text-muted-foreground/30">•</span>
              <span className="font-medium text-muted-foreground/80">{movie.year}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export const MovieCard = memo(MovieCardBase);

export function MovieCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex-shrink-0", className)}>
      <div className="aspect-[2/3] rounded-2xl bg-card/95 md:bg-card/80 border border-white/[0.06] overflow-hidden relative card-premium-shadow md:backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40 animate-pulse" />
        <div className="absolute inset-0 shimmer opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          <div className="h-3 bg-muted/40 rounded-full w-2/3 shimmer" />
          <div className="h-2 bg-muted/30 rounded-full w-1/3 shimmer animate-delay-300" />
        </div>
        <div className="absolute top-2 left-2 h-4 w-10 rounded-full bg-muted/30 shimmer animate-delay-150" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-muted/30 rounded-lg shimmer w-4/5" />
        <div className="flex gap-2">
          <div className="h-3 bg-muted/20 rounded-lg shimmer w-10 animate-delay-100" />
          <div className="h-3 bg-muted/20 rounded-lg shimmer w-8 animate-delay-200" />
        </div>
      </div>
    </div>
  );
}
