import React from "react";
import { X, Play, Download, ExternalLink, Eye, ChevronLeft, ChevronRight, Star, CalendarDays, Heart, Share2, Layers, Bookmark, Flag, Send, Youtube, Cast } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { toSlug } from "@/lib/slug";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Movie, Series, Episode, CastMember } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl, fetchByGenre, buildMediaUrl, resolveMediaAvailability, warmMediaElement, fetchMediaSize } from "@/lib/api";

import { cn } from "@/lib/utils";
import { StarRating } from "@/components/StarRating";
import { getUserRating, setUserRating, isInWatchlist, toggleWatchlist } from "@/lib/storage";
import { incrementUserStat } from "@/lib/stats";
import { motion, AnimatePresence } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { useAuth } from "@/hooks/useAuth";

export async function getProxiedPlayUrl(url: string, title: string, detailsUrl?: string | null, mobifliksId?: string | null) {
  return await buildMediaUrl({
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
async function downloadWithName(url: string, filename: string, detailsUrl?: string | null, mobifliksId?: string | null, userId?: string): Promise<void> {
  if (userId) {
    incrementUserStat(userId, 'downloads', 1);
    incrementUserStat(userId, 'activity_points', 50); // Big reward for downloads
  }
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
  const mediaUrl = await buildMediaUrl({
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
      staggerChildren: 0.03,
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as any }
  }
};

const TRENDING_ACCENT_BUTTON_CLASS = "bg-[linear-gradient(135deg,#ff8a3d_0%,#ff5b2e_52%,#ff4d6d_100%)] text-white shadow-[0_10px_26px_rgba(255,91,46,0.24),0_0_22px_rgba(255,138,61,0.18)]";



interface MovieModalProps {
  movie: Movie | Series | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (url: string, title: string) => void;
  detailsLoading?: boolean;
  onMovieSelect?: (movie: Movie) => void;
  onAuthRequired?: (action: "watch" | "download") => void;
}

const fallbackCastAvatar = "https://placehold.co/160x160/1a1a2e/ffffff?text=Actor";

function VJVersionSwitcher({
  movie,
  onMovieSelect,
  compact = false,
}: {
  movie: Movie | Series;
  onMovieSelect?: (movie: Movie) => void;
  compact?: boolean;
}) {
  const versions = React.useMemo(
    () => (movie.vj_versions ?? []).filter((version) => Boolean(version.vj_name)),
    [movie.vj_versions]
  );

  if (!onMovieSelect || versions.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-[22px] border border-white/8 modal-panel-surface",
        compact ? "px-4 py-3.5" : "p-4"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/34">VJ Versions</p>
          <p className="mt-1 text-sm text-white/68">Choose the translation you want for this title.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
          {versions.length} options
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {versions.map((version) => {
          const isActive = version.mobifliks_id === movie.mobifliks_id;
          const viewsLabel = version.views && version.views > 0
            ? (version.views >= 1000 ? `${(version.views / 1000).toFixed(1)}K views` : `${version.views} views`)
            : null;

          return (
            <button
              key={version.mobifliks_id}
              type="button"
              onClick={() => {
                if (!isActive) {
                  onMovieSelect(version);
                }
              }}
              className={cn(
                "rounded-2xl border px-3.5 py-2.5 text-left transition-transform active:scale-[0.97]",
                isActive
                  ? "border-transparent text-white modal-active-utility-surface"
                  : "border-white/8 bg-white/[0.035] text-white/72 hover:bg-white/[0.06]"
              )}
            >
              <p className="text-sm font-semibold">{version.vj_name ? `VJ ${version.vj_name}` : "Default"}</p>
              <p className="mt-1 text-[11px] text-white/46">
                {isActive ? "Current version" : viewsLabel || "Switch to this version"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MovieModal({ movie, isOpen, onClose, onPlay, detailsLoading = false, onMovieSelect, onAuthRequired }: MovieModalProps) {
  // NOTE: hooks must be called unconditionally; keep all hooks above the null-guard return.
  const deviceProfile = useDeviceProfile();
  const { user } = useAuth();
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
  const [movieS1Size, setMovieS1Size] = React.useState<string | null>(null);
  const [movieS2Size, setMovieS2Size] = React.useState<string | null>(null);
  const [selectedServer, setSelectedServer] = React.useState<1 | 2>(2);
  const [actionStep, setActionStep] = React.useState<"none" | "watch_vj" | "watch_server" | "download_vj" | "download_server">("none");
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
    setEntranceVisible(true);
  }, [isOpen, movie?.mobifliks_id]);
  React.useEffect(() => {
    if (movie) {
      setUserRatingState(getUserRating(movie.mobifliks_id));
      setInWatchlist(isInWatchlist(movie.mobifliks_id));

      // Fetch sizes for non-series movies OR first episode of series
      if (movie.type !== "series") {
        if (movie.download_url) fetchMediaSize(movie.download_url, movie.title, movie.mobifliks_id).then(setMovieS1Size);
        if (movie.server2_url) fetchMediaSize(movie.server2_url, movie.title, movie.mobifliks_id).then(setMovieS2Size);
      } else {
        const series = movie as Series;
        if (series.episodes && series.episodes.length > 0) {
          const ep1 = series.episodes[0];
          if (ep1.download_url) fetchMediaSize(ep1.download_url, movie.title, ep1.mobifliks_id).then(setMovieS1Size);
          if (ep1.server2_url) fetchMediaSize(ep1.server2_url, movie.title, ep1.mobifliks_id).then(setMovieS2Size);
        }
      }
    }
  }, [movie?.mobifliks_id, isOpen, (movie as unknown as Series).episodes?.length]);

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
  const handlePlay = async (url: string, title: string, startTime: number = 0, mobifliksId?: string | null, detailsUrl?: string | null) => {
    const finalUrl = await buildMediaUrl({
      url,
      title,
      detailsUrl: detailsUrl || (movie as any).video_page_url || movie.details_url,
      mobifliksId: mobifliksId || movie.mobifliks_id,
      play: true,
    });
    if (user?.id) {
      incrementUserStat(user.id, 'activity_points', 5); // Points for starting playback
    }
    onPlay(finalUrl, title);
  };

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

  const playbackSources = React.useMemo(() => {
    const hasPrimarySource = isSeries
      ? series.episodes?.some((episode) => !!episode.download_url)
      : !!movie.download_url;
    const hasSecondarySource = isSeries
      ? series.episodes?.some((episode) => !!episode.server2_url)
      : !!movie.server2_url;

    const sources: Array<{ id: 1 | 2; label: string; hint: string }> = [];

    if (hasSecondarySource) {
      sources.push({
        id: 2,
        label: "FHD Quality",
        hint: movieS2Size || "High Definition",
      });
    }

    if (hasPrimarySource) {
      sources.push({
        id: 1,
        label: "SD Quality",
        hint: movieS1Size || "Standard Definition",
      });
    }

    return sources;
  }, [isSeries, movie.download_url, movie.server2_url, movieS1Size, movieS2Size, series.episodes]);

  React.useEffect(() => {
    if (playbackSources.length === 0) return;
    if (playbackSources.some((source) => source.id === selectedServer)) return;
    setSelectedServer(playbackSources[0].id);
  }, [playbackSources, selectedServer]);

  const handleMovieDownload = React.useCallback((serverId?: 1 | 2) => {
    if (!user) {
      if (onAuthRequired) onAuthRequired("download");
      return;
    }
    const srv = serverId ?? selectedServer;
    const targetUrl = srv === 1
      ? (movie.download_url || movie.server2_url)
      : (movie.server2_url || movie.download_url);
    if (!targetUrl) return;
    const name = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    downloadWithName(targetUrl, name, (movie as any).video_page_url || movie.details_url, movie.mobifliks_id, user?.id);
  }, [movie, selectedServer]);

  const handlePrimaryAction = React.useCallback((serverId?: 1 | 2) => {
    if (!user) {
      if (onAuthRequired) onAuthRequired("watch");
      return;
    }
    const srv = serverId ?? selectedServer;
    if (isSeries) {
      if (series.episodes && series.episodes.length > 0) {
        if (resumeEpisode) {
          const episode = series.episodes.find((entry) =>
            entry.episode_number === resumeEpisode.episode &&
            (entry.season_number || 1) === resumeEpisode.season
          );
          const resumeTargetUrl = srv === 1
            ? (episode?.download_url || episode?.server2_url)
            : (episode?.server2_url || episode?.download_url);
          if (resumeTargetUrl) {
            handlePlay(resumeTargetUrl, `${movie.title} - S${resumeEpisode.season}:E${resumeEpisode.episode}`, 0, episode?.mobifliks_id, episode?.video_page_url || movie.video_page_url || movie.details_url);
            return;
          }
        }

        const firstEpisode = series.episodes[0];
        const targetUrl = srv === 1
          ? (firstEpisode?.download_url || firstEpisode?.server2_url)
          : (firstEpisode?.server2_url || firstEpisode?.download_url);

        if (targetUrl) {
          handlePlay(targetUrl, `${movie.title} - S1:E1`, 0, firstEpisode?.mobifliks_id, firstEpisode?.video_page_url || movie.video_page_url || movie.details_url);
        } else {
          toast.error("The first episode is not currently playable.");
        }
        return;
      }

      toast.error("No episodes available yet. Please refresh later.");
      episodesSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const targetUrl = srv === 1
      ? (movie.download_url || movie.server2_url)
      : (movie.server2_url || movie.download_url);

    if (targetUrl) {
      handlePlay(targetUrl, movie.title, 0, movie.mobifliks_id, (movie as any).video_page_url || movie.details_url);
    }
  }, [isSeries, series.episodes, resumeEpisode, movie, selectedServer, onPlay]);

  return (
    <ErrorBoundary>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        {/* Mobile: Full screen sheet, Desktop: Centered modal */}
        <DialogContent className="w-full max-w-full md:max-w-5xl h-[100dvh] md:h-auto md:max-h-[90vh] p-0 bg-card md:bg-transparent border-0 overflow-hidden shadow-none rounded-none md:rounded-3xl duration-75 [&>button]:hidden left-0 top-0 translate-x-0 translate-y-0 md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] animate-none data-[state=open]:animate-none data-[state=closed]:animate-none">

          <DialogTitle className="sr-only">{movie.title}</DialogTitle>
          <DialogDescription className="sr-only">
            {movie.description || (isSeries ? "Series details and episodes." : "Movie details and playback.")}
          </DialogDescription>

          <AnimatePresence>
            {actionStep !== "none" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end md:items-center justify-center px-4 pb-8 md:pb-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setActionStep("none")}
              >
                <motion.div
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="w-full max-w-lg bg-[#141517] rounded-[40px] md:rounded-3xl overflow-hidden shadow-2xl border border-white/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-center pt-4 pb-2 md:hidden">
                    <div className="w-12 h-1.5 rounded-full bg-white/10" />
                  </div>
                  
                  <div className="px-6 py-6 pb-12 md:pb-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">
                        {actionStep.includes("vj") ? "Choose Version" : "Choose Quality"}
                      </h3>
                      <button 
                        onClick={() => setActionStep("none")}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <X className="w-5 h-5 text-white/50" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(actionStep === "watch_vj" || actionStep === "download_vj") ? (
                        (movie.vj_versions ?? []).filter(v => !!v.vj_name).map((version) => (
                          <button
                            key={version.mobifliks_id}
                            onClick={() => {
                              if (onMovieSelect) onMovieSelect(version);
                              setActionStep(actionStep === "watch_vj" ? "watch_server" : "download_server");
                            }}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-[0.98] transition-all hover:bg-white/[0.06] group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-lg transition-colors group-hover:bg-primary/30">
                              <Play className="h-6 w-6 fill-current" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-bold text-base text-white">{version.vj_name}</p>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-white/20 mt-0.5">Watch in this version</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-white/30 transition-colors" />
                          </button>
                        ))
                      ) : (
                        playbackSources.map((source) => (
                          <button
                            key={source.id}
                            onClick={() => {
                              setSelectedServer(source.id);
                              if (actionStep === "watch_server") {
                                handlePrimaryAction(source.id);
                              } else {
                                handleMovieDownload(source.id);
                              }
                              setActionStep("none");
                            }}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-[0.98] transition-all hover:bg-white/[0.06] group"
                          >
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-colors",
                              source.id === 1 ? "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20" : "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20"
                            )}>
                              {actionStep === "download_server" ? <Download className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-bold text-base text-white">{source.label}</p>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-white/20 mt-0.5">MP4 • {source.hint}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/10 group-hover:text-white/30 transition-colors" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

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
            movieS1Size={movieS1Size}
            movieS2Size={movieS2Size}
            selectedServer={selectedServer}
            setSelectedServer={setSelectedServer}
            actionStep={actionStep}
            setActionStep={setActionStep}
            handlePrimaryAction={handlePrimaryAction}
            handleMovieDownload={handleMovieDownload}
            playbackSources={playbackSources}
            resumeEpisode={resumeEpisode}
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
                      "w-full h-full object-cover object-center scale-105 transition-opacity duration-500",
                      desktopBackdropLoaded ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {deviceProfile.allowAmbientEffects && (
                    <img
                      src={backgroundImage}
                      alt=""
                      className={cn(
                        "absolute inset-0 w-full h-full object-cover object-center scale-125 blur-3xl transition-opacity duration-500",
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
                <div className="relative h-[350px] lg:h-[425px] overflow-hidden bg-black/50">
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
                          "w-full h-full object-cover object-[center_top] transition-opacity duration-500",
                          desktopBackdropLoaded ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40">
                      <div className="absolute inset-0 shimmer" />
                    </div>
                  )}
                  {/* Premium fade gradients to seamlessly blend the backdrop into the content */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
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
                    <div className="w-32 lg:w-40 flex-none rounded-none overflow-hidden shadow-2xl border border-white/20 bg-black/20 backdrop-blur-sm">
                      <img
                        src={getImageUrl(movie.image_url)}
                        alt={`${movie.title} poster`}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-4 pt-2">
                      <motion.div variants={fadeInUp} className="min-w-0 space-y-4 pt-2">
                        {movie.logo_url ? (
                          <img
                            src={movie.logo_url}
                            alt={movie.title}
                            className="h-16 lg:h-24 xl:h-28 w-auto max-w-[500px] object-contain object-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                          />
                        ) : (
                          <h1 className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
                            {movie.title}
                          </h1>
                        )}

                      </motion.div>

                      <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-3">
                        {/* Rating */}
                        <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full border border-[#ff8a3d]/30 bg-[#ff8a3d]/15 text-[#ffd3a8] shadow-[0_0_24px_rgba(255,138,61,0.12)]">
                          <Star className="w-4 h-4 fill-[#ff8a3d] text-[#ff8a3d]" />
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
                        <Button
                          size="lg"
                          className="btn-premium-red gap-2 rounded-full px-8 h-12 text-base font-semibold border-0"
                          onClick={() => {
                            if (!user) {
                              if (onAuthRequired) onAuthRequired("watch");
                              return;
                            }
                            const versions = (movie.vj_versions ?? []).filter(v => !!v.vj_name);
                            if (versions.length > 1) {
                              setActionStep("watch_vj");
                            } else {
                              setActionStep("watch_server");
                            }
                          }}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          Watch
                        </Button>

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
                              if (!user) {
                                if (onAuthRequired) onAuthRequired("download");
                                return;
                              }
                              const versions = (movie.vj_versions ?? []).filter(v => !!v.vj_name);
                              if (versions.length > 1) {
                                setActionStep("download_vj");
                              } else {
                                setActionStep("download_server");
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

                  <motion.div variants={fadeInUp}>
                    <VJVersionSwitcher movie={movie} onMovieSelect={onMovieSelect} />
                  </motion.div>

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
  movieS1Size?: string | null;
  movieS2Size?: string | null;
  selectedServer: 1 | 2;
  setSelectedServer: (id: 1 | 2) => void;
  actionStep: string;
  setActionStep: (step: any) => void;
  handlePrimaryAction: (id?: 1 | 2) => void;
  handleMovieDownload: (id?: 1 | 2) => void;
  playbackSources: any[];
  resumeEpisode: any;
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
  movieS1Size,
  movieS2Size,
  selectedServer,
  setSelectedServer,
  actionStep,
  setActionStep,
  handlePrimaryAction,
  handleMovieDownload,
  playbackSources,
  resumeEpisode,
}: MobileMovieLayoutProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<"overview" | "casts" | "related">("overview");
  const [showCompactHeader, setShowCompactHeader] = React.useState(false);
  const [backdropLoaded, setBackdropLoaded] = React.useState(false);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [relatedMovies, setRelatedMovies] = React.useState<Movie[]>([]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const episodesSectionRef = React.useRef<HTMLDivElement>(null);
  const scrollFrameRef = React.useRef<number | null>(null);
  const continueWatching = useContinueWatching();



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
      const nextScrollTop = scrollContainer.scrollTop;
      const shouldCollapse = nextScrollTop > 160;
      setScrollTop((current) => (Math.abs(current - nextScrollTop) > 1 ? nextScrollTop : current));
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

  const viewsLabel = React.useMemo(() => {
    if (movie.views === undefined || movie.views <= 0) return null;
    if (movie.views >= 1000000) return `${(movie.views / 1000000).toFixed(1)}M`;
    if (movie.views >= 1000) return `${(movie.views / 1000).toFixed(1)}K`;
    return `${movie.views}`;
  }, [movie.views]);
  const accentHue = 6;
  const handleShare = React.useCallback(async () => {
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

  const heroScrollProgress = Math.min(scrollTop / 320, 1);
  const heroImageStyle: React.CSSProperties = {
    transform: `translateY(${scrollTop * 0.18}px) scale(${1.1 - heroScrollProgress * 0.08})`,
    transformOrigin: "center top",
  };
  const heroContentStyle: React.CSSProperties = {
    transform: `translateY(${-scrollTop * 0.22}px) scale(${1 - heroScrollProgress * 0.06})`,
    transformOrigin: "left bottom",
    opacity: Math.max(0.18, 1 - heroScrollProgress * 1.12),
  };
  const heroOverlayStyle: React.CSSProperties = {
    opacity: 0.2 + heroScrollProgress * 0.45,
  };
  const surfaceStyle: React.CSSProperties = {
    transform: `translateY(${-Math.min(scrollTop * 0.08, 18)}px)`,
    borderRadius: 0,
  };

  return (
    <div
      className="md:hidden flex min-h-0 flex-col h-[100dvh] w-full max-w-full overflow-hidden box-border relative dark bg-[#101116]"
      data-testid="mobile-movie-layout"
    >
      <div className="absolute inset-0 z-0 bg-[#101116]" />

      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 pb-3 pt-safe transition-colors duration-150",
          showCompactHeader ? "bg-[#101116]" : "bg-[linear-gradient(180deg,rgba(0,0,0,0.64)_0%,rgba(0,0,0,0)_100%)]"
        )}
      >
        <button
          onClick={onClose}
          aria-label="Go back"
          data-testid="button-close-modal"
          className="w-11 h-11 appearance-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 flex items-center justify-center active:scale-90 transition-transform text-white focus:outline-none focus-visible:ring-0"
        >
          <ChevronLeft className="w-9 h-9 stroke-[3]" />
        </button>

        <button
          type="button"
          aria-label="Cast"
          className="w-11 h-11 appearance-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 flex items-center justify-center active:scale-90 transition-transform text-white/55 focus:outline-none focus-visible:ring-0"
        >
          <Cast className="w-8 h-8 stroke-[2.4]" />
        </button>
      </div>

      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="relative w-full aspect-[16/15.5] overflow-hidden bg-black/50">
          {!backdropLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210,33%,90%)] via-[hsl(210,33%,95%)] to-[hsl(210,33%,98%)]">
              <div className="absolute inset-0 shimmer opacity-20" />
            </div>
          )}

          {backgroundImage && (
            <div
              className="w-full h-full transition-transform duration-300 ease-out will-change-transform"
              style={heroImageStyle}
            >
              <img
                src={backgroundImage}
                alt={movie.title}
                className={cn(
                  "w-full h-full object-cover object-center transition-opacity duration-700",
                  backdropLoaded ? "opacity-100" : "opacity-0"
                )}
              />
            </div>
          )}

          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              ...heroOverlayStyle,
              background: "linear-gradient(180deg, rgba(16,17,22,0.08) 0%, rgba(16,17,22,0.05) 34%, rgba(16,17,22,0.72) 77%, #101116 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 transition-opacity duration-300" style={heroOverlayStyle} />

          <div className="absolute inset-0 bg-black/10" />

          <div
            className="absolute bottom-0 left-0 right-0 flex gap-4 items-end p-5 transition-[transform,opacity] duration-300 ease-out will-change-transform"
            style={heroContentStyle}
          >
            <div className="w-24 h-36 flex-shrink-0 overflow-hidden shadow-[0_18px_40px_rgba(0,0,0,0.45)] relative">
              <img
                src={getImageUrl(movie.image_url)}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 pb-1">
              {movie.logo_url ? (
                <img
                  src={movie.logo_url}
                  alt={movie.title}
                  className="h-12 w-auto max-w-[80vw] object-contain object-left drop-shadow-[0_6px_20px_rgba(0,0,0,0.38)]"
                  loading="eager"
                />
              ) : (
                <h1 className="text-[31px] font-display font-medium text-white text-pretty drop-shadow-[0_6px_20px_rgba(0,0,0,0.38)] leading-[1.02] line-clamp-2 tracking-normal" data-testid="text-movie-title">
                  {movie.title}
                </h1>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-[#d9ff2a]">
                  <Star className="h-4 w-4 fill-current" />
                  {rating}
                </span>
                {viewsLabel && (
                  <span className="text-[15px] font-medium text-[#8d909c]">
                    ({viewsLabel} voted)
                  </span>
                )}
                {movie.year && (
                  <span className="ml-auto text-[16px] font-semibold text-white/88">
                    {movie.year}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 top-[96.875vw] z-20 px-6 pt-5 pb-6 bg-[#101116]">
        {actionStep === "none" && (
          <>
            <div className="grid grid-cols-2 gap-7">
              <Button
                size="lg"
                className="h-[49px] rounded-[11px] border-0 bg-[#d9ff21] text-[#050607] shadow-none hover:bg-[#d9ff21]/95 active:scale-[0.98] flex items-center justify-center gap-2.5"
                onClick={() => {
                  const versions = (movie.vj_versions ?? []).filter(v => !!v.vj_name);
                  if (versions.length > 1) {
                    setActionStep("watch_vj");
                  } else {
                    setActionStep("watch_server");
                  }
                }}
              >
                <span className="text-[15.5px] font-black tracking-normal">Watch</span>
                <Play className="h-[18px] w-[18px] fill-current" />
              </Button>

              <Button
                size="lg"
                className="h-[49px] rounded-[11px] border border-[#282c37] bg-transparent text-white shadow-none hover:bg-white/[0.03] active:scale-[0.98] flex items-center justify-center gap-2.5"
                onClick={() => {
                  const versions = (movie.vj_versions ?? []).filter(v => !!v.vj_name);
                  if (versions.length > 1) {
                    setActionStep("download_vj");
                  } else {
                    setActionStep("download_server");
                  }
                }}
              >
                <span className="text-[15px] font-black tracking-normal">Download</span>
                <Download className="h-[17px] w-[17px] stroke-[3]" />
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-4 items-start gap-4">
              <button
                type="button"
                onClick={onToggleWatchlist}
                className="flex flex-col items-center gap-2 text-white active:scale-95 transition-transform"
              >
                <Bookmark className={cn("h-6 w-6 stroke-[2.1]", inWatchlist && "fill-[#d9ff21] text-[#d9ff21]")} />
                <span className="text-[11px] font-black leading-none text-white/88">Add List</span>
              </button>
              <button
                type="button"
                onClick={() => toast.info("Trailer is not available yet.")}
                className="flex flex-col items-center gap-2 text-white active:scale-95 transition-transform"
              >
                <Youtube className="h-6 w-6 stroke-[2.1]" />
                <span className="text-[11px] font-black leading-none text-white/88">Trailer</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex flex-col items-center gap-2 text-white active:scale-95 transition-transform"
              >
                <Send className="h-6 w-6 stroke-[2.1]" />
                <span className="text-[11px] font-black leading-none text-white/88">Share</span>
              </button>
              <button
                type="button"
                onClick={() => toast.info("Thanks. We will review this title.")}
                className="flex flex-col items-center gap-2 text-white active:scale-95 transition-transform"
              >
                <Flag className="h-6 w-6 stroke-[2.1]" />
                <span className="text-[11px] font-black leading-none text-white/88">Report</span>
              </button>
            </div>
          </>
        )}

        {actionStep !== "none" && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/34">
                {actionStep === "watch_vj" ? "Select Version" : "Select Server"}
              </p>
            </div>
            <button
              onClick={() => setActionStep("none")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/70"
            >
              Back
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="pointer-events-none relative z-30 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="w-full aspect-[16/15.5] pointer-events-none" />

        <div className="h-[150px] pointer-events-none" />

        <div
          className="pointer-events-auto relative z-30 min-h-0 !rounded-none pb-12 bg-[#101116]"
          style={surfaceStyle}
        >
          <div className="px-4 pb-2 pt-0">
            <motion.section
              variants={fadeInUp}
              className="space-y-6 pt-0"
            >
              {/* Content sections continue below */}
            </motion.section>
          </div>

          <motion.div
            variants={fadeInUp}
            className="sticky top-[68px] z-30 px-6 pt-6 bg-[#101116]"
          >
            <div className="absolute left-6 right-6 top-0 h-px bg-[#252933]">
              <div className="h-[3px] w-[48%] -translate-y-px rounded-full bg-[#d9ff21]" />
            </div>
            <div className="flex gap-10">
              {(["overview", "casts", "related"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  data-testid={`tab-${tab}`}
                  className={cn(
                    "relative pb-4 text-[17px] font-black tracking-normal transition-colors duration-200",
                    activeTab === tab
                      ? "text-[#d9ff21]"
                      : "text-white/90"
                  )}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute bottom-0 left-0 h-0.5 w-full bg-[#d9ff21] rounded-full"
                      transition={{ type: "spring", stiffness: 360, damping: 34 }}
                    />
                  )}
                  {tab === "casts" ? "Casts" : tab[0].toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="px-6 py-7 space-y-5 pb-[45vh]">
            {activeTab === "overview" && (
              <>
                {description && (
                  <motion.div
                    variants={fadeInUp}
                    className="mt-1"
                  >
                    <p className="text-[16px] leading-[1.3] text-[#8f919c]">
                      {displayDescription}
                      {shouldTruncate && !isExpanded && "... "}
                      {shouldTruncate && (
                        <button
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="ml-1 font-semibold text-[#d9ff21]"
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </p>
                  </motion.div>
                )}

                {movie.genres && movie.genres.length > 0 && (
                  <motion.div variants={fadeInUp} className="space-y-3 pt-7">
                    <h3 className="text-[18px] font-black tracking-normal text-white">Genre</h3>
                    <p className="text-[16px] leading-[1.35] text-[#8f919c]">
                      {movie.genres.join(", ")}
                    </p>
                  </motion.div>
                )}

                {cast.length > 0 && (
                  <motion.div variants={fadeInUp} className="space-y-3 pt-7">
                    <h3 className="text-[18px] font-black tracking-normal text-white">Casts</h3>
                    <p className="text-[16px] leading-[1.24] text-[#8f919c]">
                      {cast.map((member) => member.name).join(", ")}
                    </p>
                  </motion.div>
                )}

                {(((movie as any).director) || movie.language) && (
                  <motion.div variants={fadeInUp} className="space-y-3 pt-7">
                    <h3 className="text-[18px] font-black tracking-normal text-white">Production</h3>
                    <p className="text-[16px] leading-[1.35] text-[#8f919c]">
                      {(movie as any).director || movie.language}
                    </p>
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
                              const targetUrl = selectedServer === 1
                                ? (ep.download_url || ep.server2_url)
                                : (ep.server2_url || ep.download_url);
                                if (targetUrl) {
                                  const epName = `${movie.title} - S${seasonNum}E${String(ep.episode_number).padStart(2, '0')}`;
                                  setTimeout(() => downloadWithName(targetUrl!, epName, undefined, ep.mobifliks_id, user?.id), i * 800);
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
                              seriesDetailsUrl={(movie as any).video_page_url || movie.details_url}
                              seasonNumber={selectedSeason}
                              onPlay={onPlay}
                              index={idx}
                              isResumeTarget={
                                resumeEpisode
                                  ? resumeEpisode.season === selectedSeason && resumeEpisode.episode === episode.episode_number
                                  : idx === 0
                              }
                              progressPct={cwProgressMap.get(`${selectedSeason}-${episode.episode_number}`) || 0}
                              selectedServer={selectedServer}
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
    </div>
  );
}

interface MobileTimelineEpisodeProps {
  episode: Episode;
  seriesTitle: string;
  seriesImage?: string;
  seriesDetailsUrl?: string | null;
  seasonNumber?: number;
  onPlay: (url: string, title: string, startTime?: number, mobifliksId?: string | null, detailsUrl?: string | null) => void;
  index: number;
  isResumeTarget: boolean;
  progressPct?: number;
  selectedServer?: 1 | 2;
}

function MobileTimelineEpisode({ episode, seriesTitle, seriesImage, seriesDetailsUrl, seasonNumber = 1, onPlay, index, isResumeTarget, progressPct = 0, selectedServer = 1 }: MobileTimelineEpisodeProps) {
  const { user } = useAuth();
  const [s1Size, setS1Size] = React.useState<string | null>(null);
  const [s2Size, setS2Size] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (episode.download_url) {
      fetchMediaSize(episode.download_url, seriesTitle, episode.mobifliks_id).then(setS1Size);
    }
    if (episode.server2_url) {
      fetchMediaSize(episode.server2_url, seriesTitle, episode.mobifliks_id).then(setS2Size);
    }
  }, [episode.download_url, episode.server2_url, seriesTitle]);

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
          if (hasVideo) {
            const targetUrl = selectedServer === 1
              ? (episode.download_url || episode.server2_url)
              : (episode.server2_url || episode.download_url);

            if (targetUrl) {
              onPlay(
                targetUrl,
                `${seriesTitle} - S${seasonNumber}:E${episode.episode_number}`,
                0,
                episode.mobifliks_id,
                episode.video_page_url || seriesDetailsUrl
              );
            }
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
            {(() => {
              const currentSize = selectedServer === 1 ? s1Size : s2Size;
              const displaySize = currentSize || episode.file_size || s1Size || s2Size;
              if (!displaySize) return null;
              return (
                <span className="px-2 py-0.5 text-[9px] font-semibold text-white/80 bg-black/50 rounded-md">
                  {displaySize}
                </span>
              );
            })()}
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
                  const tUrl = selectedServer === 1
                    ? (episode.download_url || episode.server2_url)
                    : (episode.server2_url || episode.download_url);
                  if (tUrl) {
                    const epName = `${seriesTitle} - S${episode.season_number ?? 1}E${String(episode.episode_number).padStart(2, "0")}`;
                    downloadWithName(tUrl, epName, undefined, episode.mobifliks_id, user?.id);
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


function DesktopEpisodeSection({
  series,
  movie,
  onPlay,
}: {
  series: Series;
  movie: Movie | Series;
  onPlay: (url: string, title: string, startTime?: number, mobifliksId?: string | null, detailsUrl?: string | null) => void;
}) {
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
            seriesDetailsUrl={(movie as any).video_page_url || movie.details_url}
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
  seriesDetailsUrl?: string | null;
  onPlay: (url: string, title: string, startTime?: number, mobifliksId?: string | null, detailsUrl?: string | null) => void;
}

// Desktop episode card - Netflix-style horizontal layout with thumbnail
function DesktopEpisodeCard({ episode, seriesTitle, seriesImage, seriesDetailsUrl, onPlay }: DesktopEpisodeCardProps) {
  const { user } = useAuth();
  const [s1Size, setS1Size] = React.useState<string | null>(null);
  const [s2Size, setS2Size] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (episode.download_url) {
      fetchMediaSize(episode.download_url, seriesTitle, episode.mobifliks_id).then(setS1Size);
    }
    if (episode.server2_url) {
      fetchMediaSize(episode.server2_url, seriesTitle, episode.mobifliks_id).then(setS2Size);
    }
  }, [episode.download_url, episode.server2_url, seriesTitle]);

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
              `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`,
              0,
              episode.mobifliks_id,
              episode.video_page_url || seriesDetailsUrl
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
        {(s1Size || s2Size || episode.file_size) && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-xs text-white/90 backdrop-blur-sm">
            {s1Size || s2Size || episode.file_size}
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
            {(s1Size || s2Size || episode.file_size) && <span>{s1Size || s2Size || episode.file_size}</span>}
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
                      `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`,
                      0,
                      episode.mobifliks_id,
                      episode.video_page_url || seriesDetailsUrl
                    );
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {episode.server2_url ? "SD" : "Play"}
                  {s1Size && <span className="text-[10px] opacity-70 ml-1">({s1Size})</span>}
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
                      `${seriesTitle} - S${episode.season_number ?? 1}:E${episode.episode_number}`,
                      0,
                      episode.mobifliks_id,
                      episode.video_page_url || seriesDetailsUrl
                    );
                  }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {episode.download_url ? "FHD" : "Play"}
                  {s2Size && <span className="text-[10px] opacity-70 ml-1">({s2Size})</span>}
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
                      downloadWithName(tUrl, epName, undefined, episode.mobifliks_id, user?.id);
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
