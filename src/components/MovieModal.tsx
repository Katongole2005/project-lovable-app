import React from "react";
import { X, Play, Download, ExternalLink, Clock, Eye, ChevronLeft, Tag, Star, CalendarDays, Plus, Heart, List, Share2, Layers } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { toSlug } from "@/lib/slug";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Movie, Series, Episode, CastMember } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl, fetchByGenre, buildMediaUrl, resolveMediaAvailability, warmMediaElement } from "@/lib/api";

import { cn } from "@/lib/utils";
import { StarRating } from "@/components/StarRating";
import { getUserRating, setUserRating, isInWatchlist, toggleWatchlist } from "@/lib/storage";
import { motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";
import { useContinueWatching } from "@/hooks/useContinueWatching";

export function getProxiedPlayUrl(url: string, title: string, detailsUrl?: string | null, mobifliksId?: string | null) {
  return buildMediaUrl({
    url,
    title,
    detailsUrl,
    mobifliksId,
    play: true,
  });
}

/**
 * Downloads a file with a clean, movie-title filename.
 * Routes through the proxy defined in buildMediaUrl for the best performance.
 */
async function downloadWithName(url: string, filename: string, detailsUrl?: string | null, mobifliksId?: string | null): Promise<void> {
  // Strip site watermark / domain leftover from scraped titles
  const cleanFilename = filename
    .replace(/mobifliks\.com\s*[-–—|:]\s*/gi, "")
    .replace(/\s*[-–—|:]\s*mobifliks\.com/gi, "")
    .replace(/mobifliks\.com/gi, "")
    .trim();

  const safeName = cleanFilename.replace(/[/\\:*?"<>|]/g, "-").trim() || "download";
  const extMatch = url.match(/\.(mp4|mkv|avi|mov|webm)(\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "mp4";
  const fullName = `${safeName} - s-u.in.${ext}`;
  const mediaUrl = buildMediaUrl({
    url,
    title: fullName,
    detailsUrl,
    mobifliksId,
    play: false,
  });
  
  toast.loading(`Checking "${safeName}"...`, { id: "dl-toast" });
  const mediaStatus = await resolveMediaAvailability(mediaUrl);
  if (!mediaStatus.available) {
    toast.error(`"${safeName}" is not currently downloadable from Mobifliks.`, { id: "dl-toast" });
    return;
  }
  
  toast.success(`Downloading "${safeName}"`, { id: "dl-toast" });
  console.log(`[Download] Initializing download for: ${safeName} (${ext})`);
  const anchor = document.createElement("a");
  anchor.href = mediaUrl;
  anchor.download = fullName;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}



/** Staggered animation variants for Framer Motion */
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any }
  }
};

const TRENDING_ACCENT_BUTTON_CLASS = "bg-[#c8f547] hover:bg-[#d7f86d] text-black shadow-[0_4px_20px_rgba(200,245,71,0.35),0_0_34px_rgba(200,245,71,0.14)]";



interface MovieModalProps {
  movie: Movie | Series | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (url: string, title: string) => void;
  detailsLoading?: boolean;
  onMovieSelect?: (movie: Movie) => void;
}

const fallbackCastAvatar = "https://placehold.co/160x160/1a1a2e/ffffff?text=Actor";

export function MovieModal({ movie, isOpen, onClose, onPlay, detailsLoading = false, onMovieSelect }: MovieModalProps) {
  // NOTE: hooks must be called unconditionally; keep all hooks above the null-guard return.
  const deviceProfile = useDeviceProfile();
  const [, setTmdbBackdrop] = React.useState<string | null>(null);
  const [tmdbCast, setTmdbCast] = React.useState<CastMember[] | null>(null);
  const backdrop = movie?.backdrop_url || null;

  // IMPORTANT: do NOT fall back to poster for the backdrop/background.
  // This avoids the "image swap" where a poster loads first, then the backdrop replaces it.
  // Use optimized (smaller) backdrop URL for faster loading.
  const backgroundImage = React.useMemo(() => {
    if (!backdrop) return null;
    return deviceProfile.allowHighResImages
      ? backdrop.replace("/original/", "/w1280/").replace("/w780/", "/w1280/")
      : getOptimizedBackdropUrl(backdrop);
  }, [backdrop, deviceProfile.allowHighResImages]);
  const allowDesktopMotion = deviceProfile.allowComplexAnimations && !deviceProfile.prefersReducedMotion;

  const [desktopBackdropLoaded, setDesktopBackdropLoaded] = React.useState(false);
  const [userRating, setUserRatingState] = React.useState<number | null>(null);
  const [inWatchlist, setInWatchlist] = React.useState(false);
  const [entranceVisible, setEntranceVisible] = React.useState(false);
  const episodesSectionRef = React.useRef<HTMLDivElement>(null);

  // Fetch missing TMDB data (especially for series)
  React.useEffect(() => {
    if (!movie || !isOpen) return;

    // Fetch if backdrop is missing OR cast is missing
    const needsBackdrop = !movie.backdrop_url;
    const needsCast = !movie.cast || movie.cast.length === 0;

    if (needsBackdrop || needsCast) {
      const fetchTmdb = async () => {
        try {
          const type = movie.type === "series" ? "tv" : "movie";
          const cleanedTitle = movie.title
            .replace(/\s*[-–—]?\s*Season\s*\d+/i, '')
            .replace(/\s*\(?\d{4}\s*[-–—].*\)\s*$/i, '')
            .replace(/\s*\(\d{4}\)\s*$/, '')
            .trim();
          const query = encodeURIComponent(cleanedTitle);
          const year = movie.year ? `&year=${movie.year}` : '';
          const searchData: { results?: Array<{ id?: number }> } = { results: [] };
          const tmdbId = searchData.results?.[0]?.id;

          if (tmdbId) {
            const detailsData: {
              backdrop_path?: string;
              credits?: {
                cast?: Array<{ name: string; character?: string; profile_path?: string | null }>;
              };
            } = {};

            if (needsBackdrop && detailsData.backdrop_path) {
              setTmdbBackdrop(`https://image.tmdb.org/t/p/original${detailsData.backdrop_path}`);
            }
            if (needsCast && detailsData.credits?.cast) {
              const fetchedCast = detailsData.credits.cast.slice(0, 15).map((c: any) => ({
                name: c.name,
                character: c.character,
                profile_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
              }));
              setTmdbCast(fetchedCast);
            }
          }
        } catch (error) {
          console.error("Failed to fetch TMDB fallback data:", error);
        }
      };
      fetchTmdb();
    }
  }, [movie?.mobifliks_id, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    if (!allowDesktopMotion) {
      setEntranceVisible(true);
      return;
    }

    setEntranceVisible(false);
    const t = setTimeout(() => setEntranceVisible(true), 100);
    return () => clearTimeout(t);
  }, [allowDesktopMotion, isOpen, movie?.mobifliks_id]);

  React.useEffect(() => {
    if (movie) {
      setUserRatingState(getUserRating(movie.mobifliks_id));
      setInWatchlist(isInWatchlist(movie.mobifliks_id));
    }
  }, [movie?.mobifliks_id]);

  React.useEffect(() => {
    setDesktopBackdropLoaded(false);
    if (!backgroundImage) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setDesktopBackdropLoaded(true);
    };
    img.src = backgroundImage;

    return () => {
      cancelled = true;
    };
  }, [backgroundImage]);

  const handleRate = (rating: number) => {
    if (!movie) return;
    setUserRating(movie.mobifliks_id, rating);
    setUserRatingState(rating);
    toast.success(`Rated ${movie.title} ${rating}/5 ⭐`);
  };

  const handleToggleWatchlist = () => {
    if (!movie) return;
    const added = toggleWatchlist(movie as Movie);
    setInWatchlist(added);
    toast.success(added ? `Added to My List` : `Removed from My List`);
  };

  if (!movie) return null;

  const isSeries = movie.type === "series";
  const series = movie as Series;
  const allEpisodes = isSeries && series.episodes ? series.episodes : [];
  const cast: CastMember[] = tmdbCast && tmdbCast.length > 0
    ? tmdbCast
    : movie.cast && movie.cast.length > 0
      ? movie.cast
      : (movie.stars || []).map((name) => ({ name }));
  const rating = movie.views ? Math.min(4.5 + (movie.views / 100000) * 0.5, 5).toFixed(1) : "4.5";
  const runtimeLabel =
    typeof movie.runtime_minutes === "number" && movie.runtime_minutes > 0
      ? movie.runtime_minutes < 60
        ? `${movie.runtime_minutes}m`
        : `${Math.floor(movie.runtime_minutes / 60)}h ${movie.runtime_minutes % 60}m`
      : null;
  const releaseLabel = movie.release_date ? movie.release_date : null;
  const certificationLabel = movie.certification ? movie.certification : null;
  const handlePlay = (url: string, title: string) => {
    setTimeout(() => {
      onPlay(
        buildMediaUrl({
          url,
          title,
          detailsUrl: (movie as any).video_page_url || movie.details_url,
          mobifliksId: movie.mobifliks_id,
          play: true,
        }),
        title
      );
    }, 0);
  };

  return (
    <ErrorBoundary>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Mobile: Full screen sheet, Desktop: Centered modal */}
      <DialogContent className="w-full max-w-full md:max-w-5xl h-[100dvh] md:h-auto md:max-h-[90vh] p-0 bg-card md:bg-transparent border-0 overflow-hidden shadow-none rounded-none md:rounded-3xl duration-200 [&>button]:hidden left-0 top-0 translate-x-0 translate-y-0 md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] data-[state=open]:slide-in-from-bottom md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%] data-[state=closed]:slide-out-to-bottom md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-[48%]">
        <DialogTitle className="sr-only">{movie.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {movie.description || (isSeries ? "Series details and episodes." : "Movie details and playback.")}
        </DialogDescription>

        {/* Mobile Layout - completely separate, handles its own scroll */}
        <MobileMovieLayout
          movie={movie}
          isSeries={isSeries}
          series={series}
          cast={cast}
          rating={rating}
          runtimeLabel={runtimeLabel}
          certificationLabel={certificationLabel}
          backgroundImage={backgroundImage}
          onClose={onClose}
          onPlay={handlePlay}
          inWatchlist={inWatchlist}
          onToggleWatchlist={handleToggleWatchlist}
          detailsLoading={detailsLoading}
          onMovieSelect={onMovieSelect}
        />

        {/* Desktop/Tablet Layout with glassmorphism */}
        <motion.div
          initial={allowDesktopMotion ? { opacity: 0, scale: 0.98 } : false}
          animate={allowDesktopMotion ? { opacity: 1, scale: 1 } : undefined}
          transition={allowDesktopMotion ? { duration: 0.24, ease: [0.22, 1, 0.36, 1] } : undefined}
          className="hidden md:block relative h-full md:rounded-3xl overflow-hidden"
        >
          {/* Multi-layer background for professional glass effect */}
          <div className="absolute inset-0 z-behind">
            {(!backgroundImage || !desktopBackdropLoaded) && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40">
                <div className="absolute inset-0 shimmer" />
              </div>
            )}

            {backgroundImage && (
              <>
                <img
                  src={backgroundImage}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover object-top scale-110 transition-opacity duration-500",
                    desktopBackdropLoaded ? "opacity-100" : "opacity-0"
                  )}
                />
                {deviceProfile.allowAmbientEffects && (
                  <img
                    src={backgroundImage}
                    alt=""
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover object-top scale-150 blur-3xl transition-opacity duration-500",
                      desktopBackdropLoaded ? "opacity-80" : "opacity-0"
                    )}
                  />
                )}
              </>
            )}
            <div className="absolute inset-0 backdrop-blur-xl bg-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
            {deviceProfile.allowAmbientEffects && (
              <motion.div
                className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }}
              />
            )}
          </div>

          <div className="absolute inset-0 md:rounded-3xl pointer-events-none border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />

          {/* Close button — outside ScrollArea so it stays fixed */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className={cn(
              "absolute top-4 right-4 z-critical p-2.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 border-none shadow-lg",
              TRENDING_ACCENT_BUTTON_CLASS
            )}
          >
            <X className="w-5 h-5" />
          </button>

          <ScrollArea className="relative z-content h-[90vh] max-h-[90vh] w-full [&>[data-radix-scroll-area-viewport]]:h-full [&>[data-radix-scroll-area-viewport]]:max-h-[90vh]">
            <div className="relative w-full max-w-full">

              {/* Backdrop hero section */}
              <div className="relative h-[350px] lg:h-[425px] overflow-hidden">
                {backgroundImage ? (
                  <>
                    {!desktopBackdropLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40">
                        <div className="absolute inset-0 shimmer" />
                      </div>
                    )}
                    <img
                      src={backgroundImage}
                      alt={`${movie.title} backdrop`}
                      className={cn(
                        "w-full h-full object-cover object-top transition-opacity duration-500",
                        desktopBackdropLoaded ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40">
                    <div className="absolute inset-0 shimmer" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>

              {/* Content area - overlapping backdrop */}
              <motion.div
                variants={staggerContainer}
                initial={allowDesktopMotion ? "hidden" : "visible"}
                animate={allowDesktopMotion ? (entranceVisible ? "visible" : "hidden") : "visible"}
                className="relative -mt-32 px-10 pb-10 space-y-6"
              >
                {/* Poster + Title row */}
                <motion.div variants={fadeInUp} className="flex gap-6 items-start">
                  <div className="w-32 lg:w-40 flex-none rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/20 backdrop-blur-sm">
                    <img
                      src={getImageUrl(movie.image_url)}
                      alt={`${movie.title} poster`}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-4 pt-2">
                    <motion.h1 variants={fadeInUp} className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
                      {movie.title}
                      {isSeries && <span className="text-primary text-2xl ml-2 font-semibold">(Series)</span>}
                    </motion.h1>

                    <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3">
                      {/* Rating */}
                      <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                        <Star className="w-4 h-4 fill-[#4ade80]" />
                        {rating}
                      </span>
                      {movie.year && (
                        <span className="text-lg font-medium text-white/90">{movie.year}</span>
                      )}
                      {/* Release Date */}
                      {releaseLabel && (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-sm font-medium rounded border border-white/40 text-white/80">
                          <CalendarDays className="w-4 h-4" />
                          {releaseLabel}
                        </span>
                      )}
                      {certificationLabel && (
                        <span className="px-2.5 py-0.5 text-sm font-medium rounded border border-white/40 text-white/80">
                          {certificationLabel}
                        </span>
                      )}
                      {runtimeLabel && (
                        <span className="px-2.5 py-0.5 text-sm font-medium rounded border border-white/40 text-white/80">
                          {runtimeLabel}
                        </span>
                      )}
                      {movie.vj_name && (
                        <span className="px-2.5 py-0.5 text-sm font-medium rounded border border-white/40 text-white/80">
                          VJ {movie.vj_name}
                        </span>
                      )}
                      {movie.views !== undefined && movie.views > 0 && (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-sm font-medium rounded border border-white/40 text-white/80">
                          <Eye className="w-4 h-4" />
                          {movie.views >= 1000000
                            ? `${(movie.views / 1000000).toFixed(1)}M`
                            : movie.views >= 1000
                              ? `${(movie.views / 1000).toFixed(1)}K`
                              : movie.views}
                        </span>
                      )}
                      {isSeries && (
                        <span className="px-2.5 py-0.5 text-sm font-semibold rounded bg-primary/30 text-primary border border-primary/40">
                          SERIES
                        </span>
                      )}
                    </motion.div>

                    <motion.div variants={fadeInUp} className="flex items-center gap-3 pt-2">
                      {!isSeries && movie.download_url && (
                        <Button
                          size="lg"
                          className={cn(
                            "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                            TRENDING_ACCENT_BUTTON_CLASS
                          )}
                          onClick={() => onPlay(movie.download_url!, movie.title)}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          {movie.server2_url ? "Server 1" : "Play"}
                        </Button>
                      )}
                      {!isSeries && movie.server2_url && (
                        <Button
                          size="lg"
                          className={cn(
                            "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                            !movie.download_url ? TRENDING_ACCENT_BUTTON_CLASS : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/20"
                          )}
                          onClick={() => onPlay(movie.server2_url!, movie.title)}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          {movie.download_url ? "Server 2" : "Play"}
                        </Button>
                      )}
                      {isSeries && series.episodes && series.episodes.length > 0 && (
                        <>
                          {(series.episodes[0]?.download_url || !series.episodes[0]?.server2_url) && (
                            <Button
                              size="lg"
                              className={cn(
                                "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                                TRENDING_ACCENT_BUTTON_CLASS
                              )}
                              onClick={() => {
                                const firstEp = series.episodes?.[0];
                                if (firstEp?.download_url) {
                                  onPlay(firstEp.download_url, `${movie.title} - S${firstEp.season_number || 1}:E${firstEp.episode_number || 1}`);
                                }
                              }}
                            >
                              <Play className="w-5 h-5 fill-current" />
                              {series.episodes[0]?.server2_url ? "Ep 1 (Server 1)" : "Play S1:E1"}
                            </Button>
                          )}
                          {series.episodes[0]?.server2_url && (
                            <Button
                              size="lg"
                              className={cn(
                                "gap-2 rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]",
                                !series.episodes[0]?.download_url ? TRENDING_ACCENT_BUTTON_CLASS : "bg-white/10 text-white hover:bg-white/20 border-2 border-white/20"
                              )}
                              onClick={() => {
                                const firstEp = series.episodes?.[0];
                                if (firstEp?.server2_url) {
                                  onPlay(firstEp.server2_url, `${movie.title} - S${firstEp.season_number || 1}:E${firstEp.episode_number || 1}`);
                                }
                              }}
                            >
                              <Play className="w-5 h-5 fill-current" />
                              {series.episodes[0]?.download_url ? "Ep 1 (Server 2)" : "Play S1:E1"}
                            </Button>
                          )}
                        </>
                      )}

                      <button
                        onClick={handleToggleWatchlist}
                        aria-label={inWatchlist ? "Remove from My List" : "Add to My List"}
                        className={cn(
                          "w-11 h-11 rounded-full backdrop-blur-sm border-2 flex items-center justify-center transition-all duration-200",
                          inWatchlist
                            ? "bg-primary/90 border-primary text-white"
                            : "bg-white/10 border-white/50 text-white hover:bg-white/20 hover:border-white"
                        )}
                      >
                        <Heart className={cn("w-5 h-5", inWatchlist && "fill-current")} />
                      </button>
                      {/* Share button */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const typeSlug = movie.type === "series" ? "series" : "movie";
                          const shareUrl = `${window.location.origin}/${typeSlug}/${toSlug(movie.title, movie.mobifliks_id, movie.year)}`;
                          try {
                            if (navigator.share) {
                              await navigator.share({ title: movie.title, url: shareUrl });
                              return;
                            }
                          } catch { }
                          try {
                            await navigator.clipboard.writeText(shareUrl);
                            toast.success("Link copied to clipboard!");
                          } catch {
                            const textArea = document.createElement("textarea");
                            textArea.value = shareUrl;
                            textArea.style.position = "fixed";
                            textArea.style.opacity = "0";
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand("copy");
                            document.body.removeChild(textArea);
                            toast.success("Link copied to clipboard!");
                          }
                        }}
                        aria-label="Share"
                        className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-white hover:bg-white/20 hover:border-white transition-all duration-200"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {FEATURE_FLAGS.DOWNLOAD_ENABLED && (isSeries ? allEpisodes.length > 0 : !!(movie.download_url || movie.server2_url)) && (
                        <button
                          onClick={() => {
                            if (isSeries) {
                              const firstEp = allEpisodes[0];
                              const firstTargetUrl = firstEp?.download_url || firstEp?.server2_url;
                              if (firstTargetUrl) {
                                const name = `${movie.title} - S${firstEp.season_number || 1}E${String(firstEp.episode_number).padStart(2, '0')}`;
                                downloadWithName(firstTargetUrl, name, undefined, firstEp.mobifliks_id);
                              } else {
                                toast.error("No episodes available to download yet.");
                                episodesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                              }
                            } else {
                              const targetUrl = movie.download_url || movie.server2_url;
                              const name = movie.year ? `${movie.title} (${movie.year})` : movie.title;
                              downloadWithName(targetUrl!, name, (movie as any).video_page_url || movie.details_url, movie.mobifliks_id);
                            }
                          }}
                          aria-label="Download"
                          className={cn(
                            "w-11 h-11 rounded-full border-2 border-transparent flex items-center justify-center backdrop-blur-sm transition-all duration-200",
                            TRENDING_ACCENT_BUTTON_CLASS
                          )}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  </div>
                </motion.div>

                {movie.description && (
                  <motion.p variants={fadeInUp} className="text-white/90 leading-relaxed text-lg max-w-4xl">{movie.description}</motion.p>
                )}

                {/* User Rating */}
                <motion.div variants={fadeInUp} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white/70">Rate this:</span>
                  <StarRating rating={userRating} onRate={handleRate} size="md" />
                </motion.div>

                {/* Cast — improved horizontal carousel with larger cards */}
                {cast.length > 0 && (
                  <motion.div variants={fadeInUp} className="space-y-3">
                    <h4 className="text-lg font-semibold text-white/90">Cast</h4>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin -mx-2 px-2">
                      {cast.slice(0, 12).map((member, index) => (
                        <div
                          key={index}
                          className="flex-none w-28 group"
                        >
                          <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-2 border-white/15 bg-white/5 shadow-lg group-hover:border-white/30 group-hover:scale-105 transition-all duration-300">
                            <img
                              src={member.profile_url || fallbackCastAvatar}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = fallbackCastAvatar;
                              }}
                            />
                          </div>
                          <p className="text-xs font-medium text-white/90 text-center mt-2 line-clamp-2 leading-tight">{member.name}</p>
                          {member.character && (
                            <p className="text-[10px] text-white/50 text-center line-clamp-1 mt-0.5">as {member.character}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {movie.genres && movie.genres.length > 0 && (
                  <motion.p variants={fadeInUp} className="text-base">
                    <span className="text-white/60 font-medium">Genres:</span>{" "}
                    <span className="text-white/90">{movie.genres.join(", ")}</span>
                  </motion.p>
                )}

                {movie.file_size && (
                  <motion.p variants={fadeInUp} className="text-base">
                    <span className="text-white/60 font-medium">Size:</span>{" "}
                    <span className="text-white/90">{movie.file_size}</span>
                  </motion.p>
                )}

                {isSeries && series.episodes && series.episodes.length > 0 && (
                  <DesktopEpisodeSection
                    series={series}
                    movie={movie}
                    onPlay={handlePlay}
                  />
                )}

                {isSeries && (!series.episodes || series.episodes.length === 0) && !detailsLoading && (
                  <motion.div variants={fadeInUp} className="pt-4 text-center py-8 text-white/60 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    No episodes available yet.
                  </motion.div>
                )}
              </motion.div>
            </div>
          </ScrollArea>
        </motion.div>
      </DialogContent>
    </Dialog>
    </ErrorBoundary>
  );
}

// Mobile layout component matching reference design
interface MobileMovieLayoutProps {
  movie: Movie | Series;
  isSeries: boolean;
  series: Series;
  cast: CastMember[];
  rating: string;
  runtimeLabel: string | null;
  certificationLabel: string | null;
  backgroundImage: string | null;
  onClose: () => void;
  onPlay: (url: string, title: string) => void;
  inWatchlist: boolean;
  onToggleWatchlist: () => void;
  detailsLoading: boolean;
  onMovieSelect?: (movie: Movie) => void;
}

function MobileMovieLayout({
  movie,
  isSeries,
  series,
  cast,
  rating,
  runtimeLabel,
  certificationLabel,
  backgroundImage,
  onClose,
  onPlay,
  inWatchlist,
  onToggleWatchlist,
  detailsLoading,
  onMovieSelect,
}: MobileMovieLayoutProps) {
  const deviceProfile = useDeviceProfile();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<"overview" | "casts" | "related">("overview");
  const [showCompactHeader, setShowCompactHeader] = React.useState(false);
  const [backdropLoaded, setBackdropLoaded] = React.useState(false);
  const [relatedMovies, setRelatedMovies] = React.useState<Movie[]>([]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const episodesSectionRef = React.useRef<HTMLDivElement>(null);
  const scrollFrameRef = React.useRef<number | null>(null);
  const continueWatching = useContinueWatching();

  const resumeEpisode = React.useMemo(() => {
    if (!isSeries || !series.episodes?.length) return null;
    const found = continueWatching.find(
      (entry) => entry.type === "series" && entry.seriesId === movie.mobifliks_id
    );
    if (found?.seasonNumber && found?.episodeNumber) {
      return { season: found.seasonNumber, episode: found.episodeNumber };
    }
    if (found?.episodeInfo) {
      const match = found.episodeInfo.match(/S(\d+):E(\d+)/i);
      if (match) return { season: parseInt(match[1], 10), episode: parseInt(match[2], 10) };
    }
    return null;
  }, [continueWatching, isSeries, movie.mobifliks_id, series.episodes]);

  const cwProgressMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!isSeries) return map;
    for (const entry of continueWatching) {
      if (entry.type !== "series" || entry.seriesId !== movie.mobifliks_id) continue;
      const seasonNumber = entry.seasonNumber;
      const episodeNumber = entry.episodeNumber;
      if (seasonNumber && episodeNumber && entry.duration > 0) {
        const key = `${seasonNumber}-${episodeNumber}`;
        map.set(key, Math.min((entry.progress / entry.duration) * 100, 100));
      }
    }
    return map;
  }, [continueWatching, isSeries, movie.mobifliks_id]);

  React.useEffect(() => {
    const genre = movie.genres?.[0];
    if (!genre) { setRelatedMovies([]); return; }
    let cancelled = false;
    fetchByGenre(genre, movie.type === "series" ? "series" : "movie", 12).then((data) => {
      if (!cancelled) {
        setRelatedMovies(data.filter((m) => m.mobifliks_id !== movie.mobifliks_id).slice(0, 10));
      }
    });
    return () => { cancelled = true; };
  }, [movie.mobifliks_id, movie.genres?.[0]]);

  React.useEffect(() => {
    setBackdropLoaded(false);
    if (!backgroundImage) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setBackdropLoaded(true); };
    img.src = backgroundImage;
    return () => { cancelled = true; };
  }, [backgroundImage]);

  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const updateHeaderState = () => {
      scrollFrameRef.current = null;
      const shouldCollapse = scrollContainer.scrollTop > 160;
      setShowCompactHeader((current) => current === shouldCollapse ? current : shouldCollapse);
    };

    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = requestAnimationFrame(updateHeaderState);
    };

    updateHeaderState();
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const scrollToEpisodes = () => {
    if (episodesSectionRef.current && scrollContainerRef.current) {
      const offset = episodesSectionRef.current.offsetTop - 80;
      scrollContainerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  const maxDescriptionLength = 200;
  const description = movie.description || "";
  const shouldTruncate = description.length > maxDescriptionLength;
  const displayDescription = isExpanded ? description : description.slice(0, maxDescriptionLength);

  const allEpisodes = series.episodes || [];
  const seasons = React.useMemo(() => {
    const seasonMap = new Map<number, typeof allEpisodes>();
    allEpisodes.forEach((ep) => {
      const seasonNum = ep.season_number || 1;
      if (!seasonMap.has(seasonNum)) seasonMap.set(seasonNum, []);
      seasonMap.get(seasonNum)!.push(ep);
    });
    if (seasonMap.size === 0 && allEpisodes.length > 0) seasonMap.set(1, allEpisodes);
    return seasonMap;
  }, [allEpisodes]);

  const availableSeasons = Array.from(seasons.keys()).sort((a, b) => a - b);

  React.useEffect(() => {
    if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason)) {
      setSelectedSeason(availableSeasons[0]);
    }
  }, [movie.mobifliks_id, availableSeasons]);

  const currentSeasonEpisodes = seasons.get(selectedSeason) || allEpisodes;

  const formattedReleaseDate = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const accentHue = 6;
  const accentAltHue = 18;
  const viewsLabel = React.useMemo(() => {
    if (movie.views === undefined || movie.views <= 0) return null;
    if (movie.views >= 1000000) return `${(movie.views / 1000000).toFixed(1)}M`;
    if (movie.views >= 1000) return `${(movie.views / 1000).toFixed(1)}K`;
    return `${movie.views}`;
  }, [movie.views]);
  const heroSupportLabel = movie.vj_name
    ? `Translated by VJ ${movie.vj_name}`
    : isSeries
      ? `${availableSeasons.length > 1 ? `${availableSeasons.length} seasons` : "Series collection"}`
      : "Feature presentation";
  const heroMeta = [
    movie.year ? `${movie.year}` : null,
    runtimeLabel,
    certificationLabel,
    viewsLabel ? `${viewsLabel} views` : null,
  ].filter(Boolean) as string[];
  const overviewFacts = [
    { label: "Score", value: `${rating}/5`, icon: Star },
    viewsLabel ? { label: "Views", value: viewsLabel, icon: Eye } : null,
    formattedReleaseDate ? { label: "Released", value: formattedReleaseDate, icon: CalendarDays } : null,
    isSeries
      ? { label: "Episodes", value: `${allEpisodes.length}`, icon: Layers }
      : runtimeLabel
        ? { label: "Runtime", value: runtimeLabel, icon: Clock }
        : movie.file_size
          ? { label: "Size", value: movie.file_size, icon: Download }
          : null,
  ].filter(Boolean) as Array<{
    label: string;
    value: string;
    icon: typeof Star;
  }>;
  const primaryActionLabel = isSeries && resumeEpisode
    ? `Continue S${resumeEpisode.season}:E${resumeEpisode.episode}`
    : isSeries
      ? "Start Season 1"
      : "Play Now";
  const primaryActionHint = isSeries
    ? `${allEpisodes.length} episode${allEpisodes.length === 1 ? "" : "s"} ready`
    : movie.file_size || runtimeLabel || "Ready to stream";

  const handleShare = React.useCallback(async () => {
    const typeSlug = movie.type === "series" ? "series" : "movie";
    const shareUrl = `${window.location.origin}/${typeSlug}/${toSlug(movie.title, movie.mobifliks_id, movie.year)}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: movie.title, url: shareUrl });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Link copied!");
    }
  }, [movie.mobifliks_id, movie.title, movie.type, movie.year]);

  const handleMovieDownload = React.useCallback(() => {
    const targetUrl = movie.download_url || movie.server2_url;
    if (!targetUrl) return;
    const name = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    downloadWithName(targetUrl, name, (movie as any).video_page_url || movie.details_url, movie.mobifliks_id);
  }, [movie]);

  const handlePrimaryAction = React.useCallback(() => {
    if (isSeries) {
      if (series.episodes && series.episodes.length > 0) {
        if (resumeEpisode) {
          const episode = series.episodes.find((entry) =>
            entry.episode_number === resumeEpisode.episode &&
            (entry.season_number || 1) === resumeEpisode.season
          );
          if (episode?.download_url) {
            onPlay(episode.download_url, `${movie.title} - S${resumeEpisode.season}:E${resumeEpisode.episode}`);
            return;
          }
        }

        const firstEpisode = series.episodes[0];
        if (firstEpisode?.download_url) {
          onPlay(firstEpisode.download_url, `${movie.title} - S1:E1`);
        } else {
          toast.error("The first episode is not currently playable.");
        }
        return;
      }

      toast.error("No episodes available yet. Please refresh later.");
      episodesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (movie.download_url) {
      onPlay(movie.download_url, movie.title);
      return;
    }

    toast.error("This title is not currently playable.");
  }, [isSeries, movie.download_url, movie.title, onPlay, resumeEpisode, series.episodes]);

  const utilityActions = React.useMemo(() => {
    const actions: Array<{
      key: string;
      label: string;
      icon: typeof Heart;
      onClick: () => void;
      active?: boolean;
    }> = [];

    if (isSeries) {
      actions.push({
        key: "episodes",
        label: "Episodes",
        icon: List,
        onClick: scrollToEpisodes,
      });
    } else if (FEATURE_FLAGS.DOWNLOAD_ENABLED && (movie.download_url || movie.server2_url)) {
      actions.push({
        key: "download",
        label: "Download",
        icon: Download,
        onClick: handleMovieDownload,
      });
    }

    actions.push({
      key: "watchlist",
      label: inWatchlist ? "Saved" : "My List",
      icon: Heart,
      onClick: onToggleWatchlist,
      active: inWatchlist,
    });
    actions.push({
      key: "share",
      label: "Share",
      icon: Share2,
      onClick: handleShare,
    });

    return actions;
  }, [allEpisodes.length, handleMovieDownload, handleShare, inWatchlist, isSeries, movie.download_url, movie.server2_url, onToggleWatchlist, scrollToEpisodes]);
  const utilityGridClass = utilityActions.length === 3 ? "grid-cols-3" : "grid-cols-2";

  return (
    <div
      className="md:hidden flex flex-col h-[100dvh] w-full max-w-full overflow-hidden box-border relative dark bg-background/95 backdrop-blur-md"
      data-testid="mobile-movie-layout"
    >
      <div className="absolute inset-0 z-0">
        {(!backgroundImage || !backdropLoaded) && (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(230,20%,8%)] via-[hsl(240,15%,6%)] to-[hsl(220,18%,5%)]">
            <div className="absolute inset-0 shimmer" />
          </div>
        )}

        {backgroundImage && (
          <>
            <img
              src={backgroundImage}
              alt=""
              className={cn(
                "w-full h-full object-cover object-top scale-110 transition-opacity duration-700",
                backdropLoaded ? "opacity-100" : "opacity-0"
              )}
            />
            {deviceProfile.allowAmbientEffects && (
              <img
                src={backgroundImage}
                alt=""
                className={cn(
                  "absolute inset-0 w-full h-full object-cover object-top scale-[2] blur-[60px] transition-opacity duration-700",
                  backdropLoaded ? "opacity-60" : "opacity-0"
                )}
              />
            )}
          </>
        )}
        <div className={cn("absolute inset-0 bg-black/55", deviceProfile.allowAmbientEffects && "backdrop-blur-xl")} />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,18%,5%)] via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

        {deviceProfile.allowAmbientEffects && (
          <>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <motion.div
                className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-[80px]"
                style={{
                  background: `hsl(${accentHue} 60% 50% / 0.12)`,
                  animation: "liquidFloat 8s ease-in-out infinite",
                }}
              />
              <motion.div
                className="absolute top-1/3 -left-24 w-48 h-48 rounded-full blur-[60px]"
                style={{
                  background: `hsl(${accentAltHue} 48% 34% / 0.1)`,
                  animation: "liquidFloat 12s ease-in-out infinite reverse",
                }}
              />
              <motion.div
                className="absolute -bottom-24 right-1/4 w-56 h-56 rounded-full blur-[70px]"
                style={{
                  background: `hsl(${accentAltHue + 10} 56% 42% / 0.08)`,
                  animation: "liquidFloat 15s ease-in-out infinite",
                  animationDelay: "3s",
                }}
              />
            </div>

            <div className="glass-noise-overlay" />
          </>
        )}
      </div>

      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-3 pt-safe transition-colors duration-150",
          showCompactHeader ? "bg-[hsl(230_18%_5%/0.96)] border-b border-white/6" : "bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,transparent_100%)]"
        )}
      >
        <button
          onClick={onClose}
          aria-label="Go back"
          data-testid="button-close-modal"
          className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-[0_10px_30px_rgba(90,17,27,0.35)] border-none text-white modal-primary-play-surface"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2
          className={cn(
            "text-sm font-semibold text-white truncate max-w-[50vw] transition-opacity duration-150",
            showCompactHeader ? "opacity-100" : "opacity-0"
          )}
        >
          {movie.title}
        </h2>

        <div className="min-w-[76px] flex justify-end">
          <span className="px-3 py-1.5 rounded-full border border-white/10 bg-white/6 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75">
            {isSeries ? "Series" : "Movie"}
          </span>
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="relative w-full aspect-[3/4] max-h-[525px] overflow-hidden">
          {!backdropLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(230,20%,12%)] via-[hsl(240,15%,8%)] to-[hsl(220,18%,6%)]">
              <div className="absolute inset-0 shimmer" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230,18%,5%)] via-black/40 to-transparent" />
            </div>
          )}

          {backgroundImage && (
            <div className="w-full h-full">
              <img
                src={backgroundImage}
                alt={movie.title}
                className={cn(
                  "w-full h-full object-cover object-top transition-opacity duration-700",
                  backdropLoaded ? "opacity-100" : "opacity-0",
                  backdropLoaded && deviceProfile.allowAmbientEffects && "animate-ken-burns-mobile"
                )}
              />
            </div>
          )}

          <div className="absolute inset-0 modal-hero-backdrop-gradient" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

          <div className="absolute inset-0 bg-black/20" />

          <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none modal-accent-bottom-gradient" />

          <div className="absolute bottom-0 left-0 right-0 p-5 flex gap-4 items-end">
            <div className="w-24 h-36 flex-shrink-0 rounded-[22px] overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.45)] relative">
              <img
                src={getImageUrl(movie.image_url)}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 rounded-[22px] ring-1 ring-white/20 ring-inset pointer-events-none" />
              <div className="absolute -inset-1 rounded-[22px] pointer-events-none modal-accent-box-shadow" />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
                {heroSupportLabel}
              </p>
              <h1 className="mt-2 text-[31px] font-display font-bold text-white text-pretty drop-shadow-[0_6px_20px_rgba(0,0,0,0.38)] leading-[1.02] line-clamp-2 tracking-[-0.03em]" data-testid="text-movie-title">
                {movie.title}
              </h1>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-black/25 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
                  <Star className="h-3.5 w-3.5 fill-[#facc15] text-[#facc15]" />
                  {rating}
                  </span>

                <span className="hidden">
                    {availableSeasons.length > 1 ? `${availableSeasons.length} Seasons` : ""}{availableSeasons.length > 1 ? " · " : ""}{allEpisodes.length} Episodes
                  </span>
                <span className="hidden rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-medium text-white/78">
                  {isSeries
                    ? `${availableSeasons.length > 1 ? `${availableSeasons.length} seasons` : "1 season"} • ${allEpisodes.length} episodes`
                    : formattedReleaseDate || "Movie"}
                </span>
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-medium text-white/78">
                  {isSeries
                    ? `${availableSeasons.length > 1 ? `${availableSeasons.length} seasons` : "1 season"} - ${allEpisodes.length} episodes`
                    : formattedReleaseDate || "Movie"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap text-[12px] text-white/70">
                {heroMeta.map((item, index) => (
                  <React.Fragment key={`${item}-${index}`}>
                    {index > 0 && <span className="h-1 w-1 rounded-full bg-white/28" />}
                    <span className={cn("leading-none", index === 0 && "font-semibold text-white/86")}>
                      {item}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative z-20">
        <div className="w-full aspect-[3/4] max-h-[525px]" />

        <div
          className="relative min-h-[70vh] modal-surface-main"
          style={{
            boxShadow: `0 -20px 60px hsl(230 18% 5% / 0.5), 0 -2px 0 hsl(${accentHue} 40% 40% / 0.15)`,
          }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div
              className="w-10 h-1 rounded-full modal-drag-indicator"
              style={{ "--accent-hue": accentHue } as React.CSSProperties}
            />
          </div>

          <motion.div variants={fadeInUp} className="px-4 border-b border-white/8">
            <div className="grid grid-cols-3 gap-2 rounded-[20px] border border-white/6 bg-white/[0.025] p-1">
              {(["overview", "casts", "related"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  data-testid={`tab-${tab}`}
                  className={cn(
                    "relative rounded-2xl px-3 py-3 text-sm font-medium capitalize transition-colors duration-200",
                    activeTab === tab
                      ? "text-white"
                      : "text-white/55"
                  )}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute inset-0 rounded-2xl modal-tab-surface"
                      transition={{ type: "spring", stiffness: 360, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{tab === "casts" ? "Casts" : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                </button>
              ))}
            </div>
          </motion.div>

          <div className="px-4 py-5 space-y-5 pb-28">
            {activeTab === "overview" && (
              <>
                <motion.div
                  variants={fadeInUp}
                  className="grid grid-cols-2 gap-2.5 content-visibility-auto"
                >
                  {overviewFacts.map((fact) => {
                    const Icon = fact.icon;
                    return (
                      <div
                        key={fact.label}
                        className="rounded-[22px] border border-white/8 px-3.5 py-3.5 modal-tinted-panel-surface"
                      >
                        <div className="flex items-center gap-2 text-white/40">
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">{fact.label}</span>
                        </div>
                        <p className="mt-3 text-[15px] font-semibold tracking-[-0.02em] text-white">{fact.value}</p>
                      </div>
                    );
                  })}
                </motion.div>

                {description && (
                  <motion.div
                    variants={fadeInUp}
                    className="rounded-[24px] border border-white/8 px-4 py-4 modal-panel-surface"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/38">Story</p>
                      {movie.file_size && (
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-white/56">
                          {movie.file_size}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[14px] leading-7 text-white/66">
                      {displayDescription}
                      {shouldTruncate && !isExpanded && "... "}
                      {shouldTruncate && (
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="ml-1 font-semibold modal-accent-text"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </p>
                  </motion.div>
                )}

                {movie.genres && movie.genres.length > 0 && (
                  <motion.div variants={fadeInUp} className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/34">Mood</p>
                    <div className="flex flex-wrap gap-2">
                      {movie.genres.map((genre) => (
                        <span
                          key={genre}
                          className="modal-genre-chip rounded-full border px-3.5 py-2 text-[11px] font-medium"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {cast.length > 0 && (
                  <motion.div variants={fadeInUp} className="space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/34">People</p>
                        <h4 className="mt-1 text-[17px] font-semibold tracking-[-0.02em] text-white">Cast highlights</h4>
                      </div>
                      <button
                        onClick={() => setActiveTab("casts")}
                        className="text-xs font-medium modal-accent-text"
                      >
                        See all
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                      {cast.slice(0, 8).map((member) => (
                        <button
                          key={member.name}
                          className="flex-none w-[74px] text-left active:scale-95 transition-transform"
                          onClick={() => setActiveTab("casts")}
                        >
                          <div
                            className="h-[88px] w-[74px] overflow-hidden rounded-[22px] border border-white/10 modal-panel-surface"
                          >
                            <img
                              src={member.profile_url || `https://placehold.co/160x200/1a1a2e/ffffff?text=${member.name.charAt(0)}`}
                              alt={member.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/160x200/1a1a2e/ffffff?text=${member.name.charAt(0)}`;
                              }}
                            />
                          </div>
                          <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-tight text-white/82">{member.name}</p>
                          {member.character && (
                            <p className="mt-1 line-clamp-2 text-[9px] leading-tight text-white/36">{member.character}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {movie.vj_name && (
                  <motion.div
                    variants={fadeInUp}
                    className="flex items-center justify-between gap-3 rounded-[22px] border border-white/8 px-4 py-3.5 modal-panel-surface"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/6 text-xs font-bold text-white">
                        VJ
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">Translator</p>
                        <p className="mt-1 text-sm font-semibold text-white/90">{movie.vj_name}</p>
                      </div>
                    </div>
                    <Tag className="h-4 w-4 text-white/30" />
                  </motion.div>
                )}

                {isSeries && (
                  <div ref={episodesSectionRef} className="space-y-0 pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center modal-episode-section-icon">
                          <Layers className="w-4 h-4 modal-accent-text" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight">Episodes</h3>
                          <p className="min-h-[14px] text-[10px] text-white/35 mt-0.5">
                            {allEpisodes.length > 0
                              ? `${currentSeasonEpisodes.length} episode${currentSeasonEpisodes.length !== 1 ? "s" : ""} available`
                              : detailsLoading
                                ? ""
                                : "No episodes available yet."}
                          </p>
                        </div>
                      </div>
                      {FEATURE_FLAGS.DOWNLOAD_ENABLED && currentSeasonEpisodes.some(ep => ep.download_url || ep.server2_url) && (
                        <button
                          onClick={() => {
                            const downloadable = currentSeasonEpisodes.filter(ep => ep.download_url || ep.server2_url);
                            toast.info(`Starting ${downloadable.length} downloads...`);
                            const seasonNum = currentSeasonEpisodes[0]?.season_number ?? 1;
                            downloadable.forEach((ep, i) => {
                              const targetUrl = ep.download_url || ep.server2_url;
                              if (targetUrl) {
                                const epName = `${movie.title} - S${seasonNum}E${String(ep.episode_number).padStart(2, '0')}`;
                                setTimeout(() => downloadWithName(targetUrl!, epName, undefined, ep.mobifliks_id), i * 800);
                              }
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-semibold text-white/76 active:scale-95 transition-transform"
                        >
                          <Download className="w-3 h-3" />
                          All
                        </button>
                      )}
                    </div>

                    {allEpisodes.length > 0 && availableSeasons.length > 1 && (
                      <div className="mb-5 -mx-4 px-4">
                        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                          {availableSeasons.map((seasonNum) => {
                            const isActive = seasonNum === selectedSeason;
                            const seasonEps = seasons.get(seasonNum) || [];
                            return (
                              <button
                                key={seasonNum}
                                onClick={() => setSelectedSeason(seasonNum)}
                                data-testid={`button-season-${seasonNum}`}
                                className={cn(
                                  "relative flex-none px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap",
                                  isActive ? "text-white modal-season-btn-active" : "text-white/55 bg-white/[0.035] border border-white/8"
                                )}
                              >
                                <span className="relative z-10">S{seasonNum}</span>
                                <span className={cn("ml-1.5 relative z-10", isActive ? "text-white/70" : "text-white/25")}>
                                  {seasonEps.length}ep
                                </span>
                                {isActive && (
                                  <span className="absolute inset-0 rounded-xl modal-season-btn-active" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {allEpisodes.length > 0 ? (
                      <div
                        className="relative pl-6 content-visibility-auto"
                      >
                        <div className="absolute left-[11px] top-4 bottom-4 w-[2px] rounded-full modal-timeline-line" />
                        <div className="space-y-0">
                          {currentSeasonEpisodes.map((episode, idx) => (
                            <MobileTimelineEpisode
                              key={episode.mobifliks_id || `${selectedSeason}-${episode.episode_number}`}
                              episode={episode}
                              seriesTitle={movie.title}
                              seriesImage={movie.image_url}
                              seasonNumber={selectedSeason}
                              onPlay={onPlay}
                              index={idx}
                              isResumeTarget={
                                resumeEpisode
                                  ? resumeEpisode.season === selectedSeason && resumeEpisode.episode === episode.episode_number
                                  : idx === 0
                              }
                              progressPct={cwProgressMap.get(`${selectedSeason}-${episode.episode_number}`) || 0}
                            />
                          ))}
                        </div>
                      </div>
                    ) : !detailsLoading ? (
                      <div className="rounded-[22px] border border-white/8 px-4 py-5 text-sm text-white/58 modal-panel-surface">
                        No episodes available yet.
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            )}

            {activeTab === "casts" && (
              <div className="space-y-4">
                {cast.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {cast.map((member, i) => (
                      <div
                        key={member.name}
                        className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-white/6 modal-stats-card md:backdrop-blur-sm"
                      >
                        <div
                          className="w-20 h-20 rounded-full overflow-hidden shadow-lg p-[2px] modal-cast-member-ring"
                          style={{
                            ["--member-hue" as string]: (accentHue + i * 25) % 360,
                            ["--member-hue-alt" as string]: (accentHue + i * 25 + 60) % 360,
                          }}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden bg-[hsl(230,18%,8%)]">
                            <img
                              src={member.profile_url || `https://placehold.co/160x160/1a1a2e/ffffff?text=${member.name.charAt(0)}`}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/160x160/1a1a2e/ffffff?text=${member.name.charAt(0)}`;
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-white text-center line-clamp-1">{member.name}</p>
                        {member.character && (
                          <p className="text-xs text-white/35 text-center line-clamp-1">as {member.character}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40 text-center py-8">No cast information available.</p>
                )}
              </div>
            )}

            {activeTab === "related" && (
              <div className="space-y-4">
                {relatedMovies.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {relatedMovies.map((m, i) => (
                      <button
                        key={m.mobifliks_id}
                        className="group text-left"
                        onClick={() => {
                          if (onMovieSelect) {
                            onMovieSelect(m);
                            return;
                          }

                          const typeSlug = m.type === "series" ? "series" : "movie";
                          window.location.assign(`/${typeSlug}/${toSlug(m.title, m.mobifliks_id, m.year)}`);
                        }}
                      >
                        <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/8 bg-white/5 shadow-lg group-active:scale-95 transition-transform duration-200 relative">
                          <img
                            src={getImageUrl(m.image_url)}
                            alt={m.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 ring-inset pointer-events-none" />
                        </div>
                        <p className="text-xs font-medium text-white/80 mt-2 line-clamp-2 leading-tight">{m.title}</p>
                        {m.year && <p className="text-[10px] text-white/35 mt-0.5">{m.year}</p>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-white/40">No related content available.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="h-8 bg-gradient-to-t from-[hsl(230,18%,5%)] to-transparent pointer-events-none" />
        <div
          className="px-4 py-3.5 pb-safe relative modal-footer-container"
        >
          <div
            className="absolute top-0 left-0 right-0 h-px modal-footer-glow"
          />
          <div className="space-y-3">
            <Button
              size="lg"
              data-testid="button-play"
              className="h-auto min-h-[58px] w-full items-center justify-between gap-3 overflow-hidden rounded-[24px] border-0 px-4 py-3 text-left text-white active:scale-[0.985] transition-transform modal-footer-play-btn modal-primary-play-surface"
              onClick={handlePrimaryAction}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/18 via-transparent to-black/5 pointer-events-none" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Play className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <p className="text-[15px] font-bold tracking-[-0.02em]">{primaryActionLabel}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-white/68">{primaryActionHint}</p>
                </div>
              </div>
            </Button>

            <div className={cn("grid gap-2.5", utilityGridClass)}>
              {utilityActions.map((action) => {
                const Icon = action.icon;

                return (
                  <button
                    key={action.key}
                    onClick={action.onClick}
                    aria-label={action.label}
                    data-testid={`button-${action.key}`}
                    className={cn(
                      "flex min-h-[52px] items-center justify-center gap-2 rounded-[20px] border px-3 py-3 text-[12px] font-semibold transition-transform active:scale-[0.97]",
                      action.active
                        ? "border-transparent text-white modal-active-utility-surface"
                        : "border-white/8 bg-white/[0.035] text-white/72"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", action.active && "fill-current")} />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

interface MobileTimelineEpisodeProps {
  episode: Episode;
  seriesTitle: string;
  seriesImage?: string;
  seasonNumber?: number;
  onPlay: (url: string, title: string) => void;
  index: number;
  isResumeTarget: boolean;
  progressPct?: number;
}

function MobileTimelineEpisode({ episode, seriesTitle, seriesImage, seasonNumber = 1, onPlay, index, isResumeTarget, progressPct = 0 }: MobileTimelineEpisodeProps) {
  const hasVideo = (episode.download_url &&
    (episode.download_url.includes(".mp4") ||
      episode.download_url.includes("downloadmp4") ||
      episode.download_url.includes("downloadserie"))) || !!episode.server2_url;

  const epNum = episode.episode_number.toString().padStart(2, "0");
  const progressStyle: React.CSSProperties = {
    width: `${progressPct}%`,
  };

  return (
    <div className="relative pb-1">
      <div className="absolute -left-6 top-4 flex flex-col items-center w-[22px]">
        <div
          className={cn(
            "w-[22px] h-[22px] rounded-full flex items-center justify-center relative",
            isResumeTarget
              ? "episode-timeline-indicator-active scale-110"
              : progressPct > 0
                ? "episode-timeline-indicator-progress"
                : "border-2 border-[hsl(230_15%_25%)] bg-[hsl(230_15%_18%)]"
          )}
        >
          {isResumeTarget ? (
            <Play className="w-2.5 h-2.5 text-white fill-white ml-[1px]" />
          ) : (
            <span className={cn("text-[8px] font-bold", progressPct > 0 ? "text-white" : "text-white/40")}>{epNum}</span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl overflow-hidden border transition-transform duration-200 active:scale-[0.98]",
          isResumeTarget
            ? "episode-card-active ring-1 ring-white/10"
            : "border-[hsl(230_15%_20%_/_0.4)] bg-[linear-gradient(135deg,hsl(230_18%_11%_/_0.5),hsl(230_18%_7%_/_0.4))] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)]"
        )}
        onClick={() => {
          if (hasVideo && episode.download_url) {
            onPlay(episode.download_url, `${seriesTitle} - S${seasonNumber}:E${episode.episode_number}`);
          }
        }}
      >
        <div className="relative w-full aspect-[2.4/1] overflow-hidden">
          <img
            src={getImageUrl(seriesImage)}
            alt={`Episode ${episode.episode_number}`}
            className="w-full h-full object-cover"
            style={{ objectPosition: `center ${30 + (index * 5) % 40}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

          {isResumeTarget && (
            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <div
                className="episode-continue-badge flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white"
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                Continue
              </div>
            </div>
          )}

          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            {episode.file_size && (
              <span className="px-2 py-0.5 text-[9px] font-semibold text-white/80 bg-black/50 rounded-md">
                {episode.file_size}
              </span>
            )}
          </div>

          {hasVideo && !isResumeTarget && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/35 backdrop-blur-sm active:scale-90 transition-transform">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}

          {isResumeTarget && hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="episode-play-btn-overlay flex h-11 w-11 items-center justify-center rounded-full border border-white/20 active:scale-90 transition-transform"
              >
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0">
            <div className="flex items-end justify-between px-3 pb-2.5">
              <div>
                <p className="text-white font-bold text-sm tracking-tight drop-shadow-lg">
                  Episode {epNum}
                </p>
                {episode.title && episode.title !== `Episode ${episode.episode_number}` && (
                  <p className="text-white/60 text-[11px] mt-0.5 line-clamp-1 font-medium">{episode.title}</p>
                )}
              </div>
              {episode.views !== undefined && episode.views > 0 && (
                <span className="text-[10px] text-white/40 flex items-center gap-1 flex-shrink-0">
                  <Eye className="w-3 h-3" />
                  {episode.views >= 1000 ? `${(episode.views / 1000).toFixed(1)}K` : episode.views}
                </span>
              )}
            </div>

              {progressPct > 0 && (
                <div className="w-full h-[3px] bg-white/10">
                  <div className="episode-progress-fill h-full rounded-r-full" style={{ width: `${progressPct}%` }} />
                </div>
              )}
          </div>
        </div>

        {(episode.description || (FEATURE_FLAGS.DOWNLOAD_ENABLED && hasVideo)) && (
          <div className="px-3 py-2.5">
            {episode.description && (
              <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
                {episode.description}
              </p>
            )}
            {FEATURE_FLAGS.DOWNLOAD_ENABLED && hasVideo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const tUrl = episode.download_url || episode.server2_url;
                  if (tUrl) {
                    const epName = `${seriesTitle} - S${episode.season_number ?? 1}E${String(episode.episode_number).padStart(2, "0")}`;
                    downloadWithName(tUrl, epName, undefined, episode.mobifliks_id);
                  }
                }}
                className="modal-accent-text mt-2 flex items-center gap-1.5 text-[11px] font-semibold active:scale-95 transition-transform"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function DesktopEpisodeSection({ series, movie, onPlay }: { series: Series; movie: Movie; onPlay: (url: string, title: string) => void }) {
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const allEpisodes = series.episodes || [];

  const seasons = React.useMemo(() => {
    const seasonMap = new Map<number, Episode[]>();
    allEpisodes.forEach((ep) => {
      const seasonNum = ep.season_number || 1;
      if (!seasonMap.has(seasonNum)) seasonMap.set(seasonNum, []);
      seasonMap.get(seasonNum)!.push(ep);
    });
    if (seasonMap.size === 0 && allEpisodes.length > 0) seasonMap.set(1, allEpisodes);
    return seasonMap;
  }, [allEpisodes]);

  const availableSeasons = Array.from(seasons.keys()).sort((a, b) => a - b);

  React.useEffect(() => {
    if (availableSeasons.length > 0 && !availableSeasons.includes(selectedSeason)) {
      setSelectedSeason(availableSeasons[0]);
    }
  }, [movie.mobifliks_id, availableSeasons]);

  const currentEpisodes = seasons.get(selectedSeason) || allEpisodes;

  return (
    <motion.div variants={fadeInUp} className="pt-4 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <h4 className="text-xl font-display font-semibold text-white">Episodes</h4>
        {availableSeasons.length > 1 ? (
          <div className="flex items-center gap-2">
            {availableSeasons.map((sNum) => (
              <button
                key={sNum}
                data-testid={`button-desktop-season-${sNum}`}
                onClick={() => setSelectedSeason(sNum)}
                className={cn(
                  "px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 border",
                  sNum === selectedSeason
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/70 border-white/15 hover:bg-white/10 hover:text-white"
                )}
              >
                Season {sNum}
              </button>
            ))}
          </div>
        ) : (
          <span className="px-3 py-1.5 text-sm font-medium rounded bg-white/10 text-white/80 border border-white/20">
            {allEpisodes.length} Episodes
          </span>
        )}
        <span className="text-sm text-white/50 ml-auto">
          {currentEpisodes.length} episode{currentEpisodes.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
        {currentEpisodes.map((episode) => (
          <DesktopEpisodeCard
            key={episode.mobifliks_id || `${selectedSeason}-${episode.episode_number}`}
            episode={episode}
            seriesTitle={movie.title}
            seriesImage={movie.image_url}
            onPlay={onPlay}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface DesktopEpisodeCardProps {
  episode: Episode;
  seriesTitle: string;
  seriesImage?: string;
  onPlay: (url: string, title: string) => void;
}

// Desktop episode card - Netflix-style horizontal layout with thumbnail
function DesktopEpisodeCard({ episode, seriesTitle, seriesImage, onPlay }: DesktopEpisodeCardProps) {
  const hasVideo = (episode.download_url &&
    (episode.download_url.includes(".mp4") ||
      episode.download_url.includes("downloadmp4") ||
      episode.download_url.includes("downloadserie"))) || !!episode.server2_url;

  return (
    <div
      className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 group cursor-pointer"
      onClick={() => {
        if (hasVideo) {
          const targetUrl = episode.download_url || episode.server2_url;
          if (targetUrl) {
            onPlay(
              targetUrl,
              `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
            );
          }
        }
      }}
    >
      {/* Thumbnail */}
      <div className="relative w-44 flex-none rounded-lg overflow-hidden bg-white/10">
        <img
          src={getImageUrl(seriesImage)}
          alt={`Episode ${episode.episode_number}`}
          className="w-full aspect-video object-cover"
        />
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-black fill-current ml-0.5" />
          </div>
        </div>
        {/* Watch progress indicator */}
        {episode.file_size && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-xs text-white/90 backdrop-blur-sm">
            {episode.file_size}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-1">
        {/* Title row with duration and date */}
        <div className="flex items-start justify-between gap-4">
          <h5 className="text-lg font-semibold text-white">
            {episode.episode_number}. {episode.title || `Episode ${episode.episode_number}`}
          </h5>
          <div className="flex items-center gap-3 text-sm text-white/60 flex-shrink-0">
            {episode.file_size && <span>{episode.file_size}</span>}
          </div>
        </div>

        {/* Description */}
        {episode.description && (
          <p className="mt-2 text-sm text-white/70 leading-relaxed line-clamp-2">
            {episode.description}
          </p>
        )}

        {/* Action buttons on hover */}
        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {hasVideo && (
            <>
              {(episode.download_url || !episode.server2_url) && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-white text-black hover:bg-white/90 h-8 px-4 rounded font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(
                      episode.download_url!,
                      `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
                    );
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {episode.server2_url ? "S1" : "Play"}
                </Button>
              )}
              {episode.server2_url && (
                <Button
                  size="sm"
                  className="gap-1.5 bg-white/10 text-white hover:bg-white/20 border border-white/20 h-8 px-3 rounded font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(
                      episode.server2_url!,
                      `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`
                    );
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {episode.download_url ? "S2" : "Play"}
                </Button>
              )}
              {FEATURE_FLAGS.DOWNLOAD_ENABLED && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    const tUrl = episode.download_url || episode.server2_url;
                    if (tUrl) {
                      const epName = `${seriesTitle} - S${episode.season_number ?? 1}E${String(episode.episode_number).padStart(2, '0')}`;
                      downloadWithName(tUrl, epName, undefined, episode.mobifliks_id);
                    }
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
          {!hasVideo && episode.video_page_url && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-4 rounded border-white/30 text-white hover:bg-white/10"
              asChild
              onClick={(e) => e.stopPropagation()}
            >
              <a href={episode.video_page_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Watch
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
