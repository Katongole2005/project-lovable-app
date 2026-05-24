"use client";
import { Play, Heart, TrendingUp, Sparkles } from "lucide-react";
import type { Movie } from "@/types/movie";
import { buildMediaUrl, getImageUrl, preloadImage, preloadMovieBackdrop, primeMediaAvailability } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import { useCallback, useState, useEffect, forwardRef, memo, useRef } from "react";
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
  style?: CSSProperties;
}

function isNewRelease(movie: Movie): boolean {
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  if (movie.release_date) {
    const releaseDate = new Date(movie.release_date);
    if (!Number.isNaN(releaseDate.getTime())) {
      const daysAgo = (now - releaseDate.getTime()) / dayMs;
      if (daysAgo >= 0 && daysAgo <= 60) return true;
    }
  }

  if (movie.created_at) {
    const addedAt = new Date(movie.created_at);
    if (!Number.isNaN(addedAt.getTime())) {
      const daysSinceAdded = (now - addedAt.getTime()) / dayMs;
      const movieYear = parseInt(movie.year?.toString() || "0");
      const currentYear = new Date().getFullYear();

      if (daysSinceAdded >= 0 && daysSinceAdded <= 14 && movieYear >= currentYear - 1) {
        return true;
      }
    }
  }

  return false;
}

function isTrending(movie: Movie): boolean {
  return (movie.views ?? 0) >= 5000;
}

function getVjDetail(movie: Movie): string | null {
  const versionCount = movie.vj_count ?? movie.vj_versions?.length ?? 0;
  if (versionCount > 1) return `${versionCount} VJ`;
  if (movie.vj_name?.trim()) return `VJ ${movie.vj_name.trim()}`;
  return null;
}

const MovieCardBase = forwardRef<HTMLDivElement, MovieCardProps>(function MovieCard({ movie, onClick, showProgress, className, priority, allowNewBadge = false, onWatchlistChange, style }, ref) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref) return;
    if (typeof ref === "function") {
      ref(cardRef.current);
    } else {
      (ref as any).current = cardRef.current;
    }
  }, [ref]);

  useEffect(() => {
    if (typeof window === "undefined" || !cardRef.current) return;

    // Use a rootMargin of 400px to prefetch ahead of scroll
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          const cardImage = getImageUrl(movie.image_url);
          preloadImage(cardImage).catch(() => {});
          preloadMovieBackdrop(movie);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [movie]);

  useEffect(() => {
    setInWatchlist(isInWatchlist(movie.mobifliks_id));
  }, [movie.mobifliks_id]);

  const primePlayback = useCallback(() => {
    const targetUrl = movie.server2_url || movie.download_url;
    if (!targetUrl) return;
    void buildMediaUrl({
      url: targetUrl,
      title: movie.title,
      detailsUrl: movie.video_page_url || movie.details_url,
      mobifliksId: movie.mobifliks_id,
      play: true,
    }).then(primeMediaAvailability);
  }, [movie]);

  const handleMouseEnter = useCallback(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;
    preloadMovieBackdrop(movie);
    window.requestAnimationFrame(primePlayback);
  }, [movie, primePlayback]);

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
  const vjDetail = getVjDetail(movie);
  const isPlayable = Boolean(movie.server2_url || movie.download_url);

  return (
    <div
      ref={cardRef}
      style={style}
      className={cn(
        "group relative flex-shrink-0 cursor-pointer overflow-visible touch-manipulation hardware-accelerated-card",
        className
      )}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onTouchStart={primePlayback}
      onFocus={primePlayback}
      data-testid={`card-movie-${movie.mobifliks_id}`}
    >
      <div
        className={cn(
          "movie-card-lift relative isolate aspect-[2/3] overflow-hidden rounded-[18px] bg-card border border-black/[0.03] shadow-card card-rim-light card-premium-shadow active:scale-[0.98]"
        )}
      >
        <BlurImage
          src={getImageUrl(movie.image_url)}
          alt={movie.title}
          className="relative z-0 card-image-zoom"
          loading={priority || isNearViewport ? "eager" : "lazy"}
        />

        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none md:group-hover:opacity-100 card-gloss-effect" />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 md:group-hover:opacity-100" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 md:group-hover:opacity-100">
          <div className="play-ring-pulse w-12 h-12 rounded-full bg-white/95 dark:bg-white/90 flex items-center justify-center scale-90 transition-transform duration-200 md:group-hover:scale-100 shadow-[0_0_24px_hsl(210_100%_60%/0.4)]">
            <Play className="w-5 h-5 text-primary fill-current ml-0.5" data-testid="icon-play" />
          </div>
        </div>

        {movie.genres && movie.genres.length > 0 && (
          <div className="absolute bottom-2 left-0 right-0 hidden md:flex flex-wrap justify-center gap-1 px-2 pointer-events-none opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            {movie.genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="px-2.5 py-0.5 text-[9px] font-semibold rounded-full bg-neutral-900/95 text-white/90 border border-white/10 tracking-wide uppercase"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 max-w-[80%]">
          {isNew && (
            <span className="flex items-center gap-0.5 rounded-full border border-amber-200/30 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] font-black text-black shadow-[0_0_18px_rgba(246,196,83,0.28)]">
              <Sparkles className="w-2.5 h-2.5" />
              NEW
            </span>
          )}
          {trending && !isNew && (
            <span className="flex items-center gap-0.5 rounded-full border border-red-400/20 bg-red-600/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-[0_0_16px_rgba(220,38,38,0.3)]">
              <TrendingUp className="w-2.5 h-2.5" />
              HOT
            </span>
          )}
          {movie.type === "series" && (
            <span className="rounded-full border border-red-400/20 bg-red-600/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-[0_0_16px_rgba(220,38,38,0.25)]">
              SERIES
            </span>
          )}
        </div>

        <button
          onClick={handleWatchlistToggle}
          aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          data-testid={`button-watchlist-${movie.mobifliks_id}`}
          className={cn(
            "absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-opacity duration-200 z-10 shadow-sm",
            inWatchlist
              ? "bg-primary text-primary-foreground scale-100"
              : "bg-black/60 text-white/90 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/80",
            heartFlip && "animate-heart-flip"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", inWatchlist && "fill-current")} />
        </button>

        {showProgress !== undefined && showProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <div className="progress-bar">
              <div className="progress-bar-fill progress-fill-dynamic" style={{ width: `${showProgress}%` } as React.CSSProperties} />
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-3 space-y-1.5">
        <div className="h-5 flex items-center">
          {movie.logo_url ? (
            <img
              src={movie.logo_url}
              alt={movie.title}
              className="h-full w-auto max-w-full object-contain object-left opacity-90 group-hover:opacity-100 transition-opacity duration-200"
            />
          ) : (
            <h3 className="font-display font-bold text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-200 tracking-tight" data-testid={`text-title-${movie.mobifliks_id}`}>
              {movie.title}
            </h3>
          )}
        </div>
        <div className="flex min-h-[22px] flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          {movie.year && (
            <span className="font-semibold text-muted-foreground/80">{movie.year}</span>
          )}
          {vjDetail && (
            <span className="rounded-md border border-red-400/18 bg-gradient-to-b from-red-500/13 to-white/[0.035] px-1.5 py-0.5 font-semibold leading-none text-red-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {vjDetail}
            </span>
          )}
          {isPlayable && (
            <span className="rounded-md border border-white/10 bg-white/[0.055] px-1.5 py-0.5 font-semibold leading-none text-muted-foreground/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              HD
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export const MovieCard = memo(MovieCardBase);

export function MovieCardSkeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("flex-shrink-0", className)} style={style}>
      <div className="aspect-[2/3] rounded-2xl bg-card/95 md:bg-card/95 border border-white/[0.06] overflow-hidden relative card-premium-shadow">
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
