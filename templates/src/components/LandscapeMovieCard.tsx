"use client";
import { Play, Heart, TrendingUp, Sparkles } from "lucide-react";
import type { Movie } from "@/types/movie";
import { buildMediaUrl, getImageUrl, getOptimizedBackdropUrl, preloadImage, preloadMovieBackdrop, primeMediaAvailability } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import { useCallback, useState, useEffect, forwardRef, memo, useRef } from "react";
import { isInWatchlist, toggleWatchlist } from "@/lib/storage";
import { BlurImage } from "./BlurImage";

interface LandscapeMovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
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

const LandscapeMovieCardBase = forwardRef<HTMLDivElement, LandscapeMovieCardProps>(function LandscapeMovieCard({ movie, onClick, className, priority, allowNewBadge = false, onWatchlistChange, style }, ref) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [heartFlip, setHeartFlip] = useState(false);
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
          const cardImage = movie.backdrop_url ? getOptimizedBackdropUrl(movie.backdrop_url) : getImageUrl(movie.image_url);
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

  const cardImage = movie.backdrop_url ? getOptimizedBackdropUrl(movie.backdrop_url) : getImageUrl(movie.image_url);

  return (
    <div
      ref={cardRef}
      style={style}
      className={cn(
        "group relative flex-shrink-0 cursor-pointer overflow-visible touch-manipulation will-change-transform hardware-accelerated-card",
        className
      )}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onTouchStart={primePlayback}
      onFocus={primePlayback}
      data-testid={`card-landscape-${movie.mobifliks_id}`}
    >
      <div
        className={cn(
          "movie-card-lift relative isolate aspect-video overflow-hidden rounded-[18px] bg-card border border-white/[0.04] shadow-card card-rim-light card-premium-shadow active:scale-[0.98] transition-all duration-300"
        )}
      >
        <BlurImage
          src={cardImage}
          alt={movie.title}
          className="relative z-0 card-image-zoom w-full h-full object-cover"
          loading={priority || isNearViewport ? "eager" : "lazy"}
        />

        {/* Ambient Gradient overlay always visible at bottom to guarantee logo/title readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-black/25 to-black/10 transition-opacity duration-300" />

        {/* Overlay content inside card */}
        <div className="absolute inset-0 flex flex-col justify-end p-3.5 z-10">
          <div className="space-y-1">
            {/* Branded Logo/Title Overlay */}
            <div className="h-8 flex items-end">
              {movie.logo_url ? (
                <img
                  src={movie.logo_url}
                  alt={movie.title}
                  className="max-h-[28px] md:max-h-[34px] w-auto max-w-[85%] object-contain object-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] group-hover:scale-102 transition-transform duration-300 origin-left"
                />
              ) : (
                <h3 className="font-display font-extrabold text-sm md:text-base leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] line-clamp-1 tracking-tight group-hover:scale-[1.01] transition-transform duration-300 origin-left">
                  {movie.title}
                </h3>
              )}
            </div>

            {/* Micro Metadata inside card */}
            <div className="flex items-center gap-2 text-[10px] text-white/70 font-semibold tracking-wide">
              {movie.year && <span>{movie.year}</span>}
              {vjDetail && (
                <span className="rounded border border-red-500/30 bg-red-600/90 px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider scale-90 origin-left leading-none">
                  {vjDetail}
                </span>
              )}
              {isPlayable && (
                <span className="rounded border border-white/10 bg-white/20 px-1 text-[8px] font-extrabold text-white leading-none">
                  HD
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Play Button Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 md:group-hover:opacity-100 bg-black/40 z-20">
          <div className="play-ring-pulse w-12 h-12 rounded-full bg-white/95 dark:bg-white/90 flex items-center justify-center scale-90 transition-transform duration-300 md:group-hover:scale-100 shadow-[0_0_24px_hsl(210_100%_60%/0.4)]">
            <Play className="w-5 h-5 text-primary fill-current ml-0.5" />
          </div>
        </div>

        {/* Tags / Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5">
          {isNew && (
            <span className="flex items-center gap-0.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-2 py-0.5 text-[8px] font-black text-black shadow-md">
              <Sparkles className="w-2.5 h-2.5" />
              NEW
            </span>
          )}
          {trending && !isNew && (
            <span className="flex items-center gap-0.5 rounded-full bg-red-600/95 px-2 py-0.5 text-[8px] font-bold text-white shadow-md">
              <TrendingUp className="w-2.5 h-2.5" />
              HOT
            </span>
          )}
        </div>

        {/* Watchlist Toggle */}
        <button
          onClick={handleWatchlistToggle}
          aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
          className={cn(
            "absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-opacity duration-300 z-20 shadow-md",
            inWatchlist
              ? "bg-primary text-primary-foreground scale-100"
              : "bg-black/60 text-white/90 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-black/85",
            heartFlip && "animate-heart-flip"
          )}
        >
          <Heart className={cn("w-3.5 h-3.5", inWatchlist && "fill-current")} />
        </button>
      </div>
    </div>
  );
});

export const LandscapeMovieCard = memo(LandscapeMovieCardBase);

export function LandscapeMovieCardSkeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("flex-shrink-0", className)} style={style}>
      <div className="aspect-video rounded-[18px] bg-card/95 border border-white/[0.06] overflow-hidden relative card-premium-shadow">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40 animate-pulse" />
        <div className="absolute inset-0 shimmer opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 p-3.5 space-y-2">
          <div className="h-4 bg-muted/40 rounded-full w-2/3 shimmer" />
          <div className="h-2.5 bg-muted/30 rounded-full w-1/3 shimmer animate-delay-300" />
        </div>
        <div className="absolute top-3 left-3 h-4.5 w-12 rounded-full bg-muted/30 shimmer animate-delay-150" />
      </div>
    </div>
  );
}
