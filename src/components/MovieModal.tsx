import React from "react";
import { X, Play, Download, ExternalLink, Clock, Eye, ChevronLeft, Tag, Star, CalendarDays, Plus, Maximize2, Heart, List, Share2 } from "lucide-react";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { toSlug } from "@/lib/slug";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Movie, Series, Episode, CastMember } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl, fetchByGenre } from "@/lib/api";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/StarRating";
import { getUserRating, setUserRating, isInWatchlist, toggleWatchlist } from "@/lib/storage";

/** Staggered animation helper — returns style for delayed fade-in */
const staggerStyle = (index: number, isVisible: boolean): React.CSSProperties => ({
  opacity: isVisible ? 1 : 0,
  transform: isVisible ? "translateY(0)" : "translateY(16px)",
  transition: `opacity 0.5s ease ${index * 0.08}s, transform 0.5s ease ${index * 0.08}s`,
});

interface MovieModalProps {
  movie: Movie | Series | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (url: string, title: string) => void;
}

const fallbackCastAvatar = "https://placehold.co/160x160/1a1a2e/ffffff?text=Actor";

export function MovieModal({ movie, isOpen, onClose, onPlay }: MovieModalProps) {
  // NOTE: hooks must be called unconditionally; keep all hooks above the null-guard return.
  const backdrop = movie?.backdrop_url || null;

  // IMPORTANT: do NOT fall back to poster for the backdrop/background.
  // This avoids the "image swap" where a poster loads first, then the backdrop replaces it.
  // Use optimized (smaller) backdrop URL for faster loading.
  const backgroundImage = backdrop ? getOptimizedBackdropUrl(backdrop) : null;

  const [desktopBackdropLoaded, setDesktopBackdropLoaded] = React.useState(false);
  const [userRating, setUserRatingState] = React.useState<number | null>(null);
  const [inWatchlist, setInWatchlist] = React.useState(false);
  const [entranceVisible, setEntranceVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setEntranceVisible(false);
      const t = setTimeout(() => setEntranceVisible(true), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

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
  const cast: CastMember[] =
    movie.cast && movie.cast.length > 0
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
    onClose();
    setTimeout(() => {
      onPlay(url, title);
    }, 0);
  };

  return (
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
        />

        {/* Desktop/Tablet Layout with glassmorphism */}
        <div className="hidden md:block relative h-full md:rounded-3xl overflow-hidden">
          {/* Multi-layer background for professional glass effect */}
          <div className="absolute inset-0">
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
                    "w-full h-full object-cover scale-110 transition-opacity duration-500",
                    desktopBackdropLoaded ? "opacity-100" : "opacity-0"
                  )}
                />
                <img
                  src={backgroundImage}
                  alt=""
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover scale-150 blur-3xl transition-opacity duration-500",
                    desktopBackdropLoaded ? "opacity-80" : "opacity-0"
                  )}
                />
              </>
            )}
            <div className="absolute inset-0 backdrop-blur-xl bg-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
            <div 
              className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
              }}
            />
          </div>
          
          <div className="absolute inset-0 md:rounded-3xl pointer-events-none border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" />

          {/* Close button — outside ScrollArea so it stays fixed */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-200 hover:scale-105 border border-white/20"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <ScrollArea className="h-[90vh] max-h-[90vh] w-full [&>[data-radix-scroll-area-viewport]]:h-full [&>[data-radix-scroll-area-viewport]]:max-h-[90vh]">
            <div className="relative w-full max-w-full">

              {/* Backdrop hero section */}
              <div className="relative h-[280px] lg:h-[340px] overflow-hidden">
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
                        "w-full h-full object-cover transition-opacity duration-500",
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
              <div className="relative -mt-32 px-10 pb-10 space-y-6">
                {/* Poster + Title row */}
                <div className="flex gap-6 items-start" style={staggerStyle(0, entranceVisible)}>
                  <div className="w-32 lg:w-40 flex-none rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/20 backdrop-blur-sm">
                    <img
                      src={getImageUrl(movie.image_url)}
                      alt={`${movie.title} poster`}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-4 pt-2">
                    <h1 className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight drop-shadow-lg" style={staggerStyle(1, entranceVisible)}>
                      {movie.title}
                      {isSeries && <span className="text-primary text-2xl ml-2 font-semibold">(Series)</span>}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3" style={staggerStyle(2, entranceVisible)}>
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
                    </div>

                    <div className="flex items-center gap-3 pt-2" style={staggerStyle(3, entranceVisible)}>
                      {!isSeries && movie.download_url && (
                        <Button
                          size="lg"
                          className="gap-2 bg-white hover:bg-white/90 text-black rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
                          onClick={() => onPlay(movie.download_url!, movie.title)}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          Play
                        </Button>
                      )}
                      {isSeries && series.episodes && series.episodes.length > 0 && (
                        <Button
                          size="lg"
                          className="gap-2 bg-white hover:bg-white/90 text-black rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
                          onClick={() => {
                            const firstEp = series.episodes?.[0];
                            if (firstEp?.download_url) {
                              onPlay(firstEp.download_url, `${movie.title} - Episode 1`);
                            }
                          }}
                        >
                          <Play className="w-5 h-5 fill-current" />
                          Play
                        </Button>
                      )}

                      <button 
                        onClick={handleToggleWatchlist}
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
                          } catch {}
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
                        className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-white hover:bg-white/20 hover:border-white transition-all duration-200"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      {FEATURE_FLAGS.DOWNLOAD_ENABLED && !isSeries && movie.download_url && (
                        <button
                          onClick={() => {
                            window.open(movie.download_url, "_blank");
                          }}
                          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-white hover:bg-white/20 hover:border-white transition-all duration-200"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {movie.description && (
                  <p className="text-white/90 leading-relaxed text-lg max-w-4xl" style={staggerStyle(4, entranceVisible)}>{movie.description}</p>
                )}

                {/* User Rating */}
                <div className="flex items-center gap-3" style={staggerStyle(5, entranceVisible)}>
                  <span className="text-sm font-medium text-white/70">Rate this:</span>
                  <StarRating rating={userRating} onRate={handleRate} size="md" />
                </div>

                {/* Cast — improved horizontal carousel with larger cards */}
                {cast.length > 0 && (
                  <div className="space-y-3" style={staggerStyle(6, entranceVisible)}>
                    <h4 className="text-lg font-semibold text-white/90">Cast</h4>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin -mx-2 px-2">
                      {cast.slice(0, 12).map((member, index) => (
                        <div
                          key={index}
                          className="flex-none w-28 group"
                          style={staggerStyle(7 + index * 0.5, entranceVisible)}
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
                  </div>
                )}

                {movie.genres && movie.genres.length > 0 && (
                  <p className="text-base">
                    <span className="text-white/60 font-medium">Genres:</span>{" "}
                    <span className="text-white/90">{movie.genres.join(", ")}</span>
                  </p>
                )}

                {movie.file_size && (
                  <p className="text-base">
                    <span className="text-white/60 font-medium">Size:</span>{" "}
                    <span className="text-white/90">{movie.file_size}</span>
                  </p>
                )}

                {isSeries && series.episodes && series.episodes.length > 0 && (
                  <div className="pt-4 space-y-4">
                    <div className="flex items-center gap-4">
                      <h4 className="text-xl font-display font-semibold text-white">Episodes</h4>
                      <span className="px-3 py-1.5 text-sm font-medium rounded bg-white/10 text-white/80 border border-white/20">
                        {movie.year ? `${series.episodes.length} Episodes (${movie.year})` : `${series.episodes.length} Episodes`}
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                      {series.episodes.map((episode) => (
                        <DesktopEpisodeCard
                          key={episode.mobifliks_id || episode.episode_number}
                          episode={episode}
                          seriesTitle={movie.title}
                          seriesImage={movie.image_url}
                          onPlay={onPlay}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {isSeries && (!series.episodes || series.episodes.length === 0) && (
                  <div className="pt-4 text-center py-8 text-white/60 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                    No episodes available yet.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
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
}: MobileMovieLayoutProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState(1);
  const [isSeasonSelectorOpen, setIsSeasonSelectorOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"overview" | "casts" | "related">("overview");
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [backdropLoaded, setBackdropLoaded] = React.useState(false);
  const [relatedMovies, setRelatedMovies] = React.useState<Movie[]>([]);
  const [entranceReady, setEntranceReady] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const episodesSectionRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLDivElement>(null);

  // Entrance animation trigger
  React.useEffect(() => {
    setEntranceReady(false);
    const t = setTimeout(() => setEntranceReady(true), 150);
    return () => clearTimeout(t);
  }, [movie.mobifliks_id]);

  // Fetch related movies by first genre
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

  // Preload backdrop image (ONLY the backdrop; never fall back to the poster)
  React.useEffect(() => {
    setBackdropLoaded(false);
    if (!backgroundImage) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setBackdropLoaded(true);
    };
    // backgroundImage is already optimized, use directly
    img.src = backgroundImage;

    return () => {
      cancelled = true;
    };
  }, [backgroundImage]);

  // Parallax scroll effect
  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const heroHeight = 320; // min-h of hero
      // Calculate progress from 0 to 1 (0 = no scroll, 1 = fully scrolled past hero)
      const progress = Math.min(Math.max(scrollTop / heroHeight, 0), 1);
      setScrollProgress(progress);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToEpisodes = () => {
    if (episodesSectionRef.current && scrollContainerRef.current) {
      const offset = episodesSectionRef.current.offsetTop - 80; // Account for fixed header
      scrollContainerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };
  
  const maxDescriptionLength = 200;
  const description = movie.description || "";
  const shouldTruncate = description.length > maxDescriptionLength;
  const displayDescription = isExpanded ? description : description.slice(0, maxDescriptionLength);

  // Group episodes by season
  const allEpisodes = series.episodes || [];
  const seasons = React.useMemo(() => {
    const seasonMap = new Map<number, typeof allEpisodes>();
    allEpisodes.forEach((ep) => {
      const seasonNum = ep.season_number || 1;
      if (!seasonMap.has(seasonNum)) {
        seasonMap.set(seasonNum, []);
      }
      seasonMap.get(seasonNum)!.push(ep);
    });
    if (seasonMap.size === 0 && allEpisodes.length > 0) {
      seasonMap.set(1, allEpisodes);
    }
    return seasonMap;
  }, [allEpisodes]);

  const availableSeasons = Array.from(seasons.keys()).sort((a, b) => a - b);
  const currentSeasonEpisodes = seasons.get(selectedSeason) || allEpisodes;

  // Format release date nicely
  const formattedReleaseDate = movie.release_date 
    ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="md:hidden flex flex-col h-[100dvh] w-full max-w-full overflow-hidden box-border relative dark">
      {/* Multi-layer background - liquid glass effect */}
      <div className="absolute inset-0 z-0">
        {(!backgroundImage || !backdropLoaded) && (
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
                "w-full h-full object-cover scale-110 transition-opacity duration-500",
                backdropLoaded ? "opacity-100" : "opacity-0"
              )}
            />
            <img
              src={backgroundImage}
              alt=""
              className={cn(
                "absolute inset-0 w-full h-full object-cover scale-150 blur-3xl transition-opacity duration-500",
                backdropLoaded ? "opacity-80" : "opacity-0"
              )}
            />
          </>
        )}
        <div className="absolute inset-0 backdrop-blur-2xl bg-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        
        {/* Liquid glass decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Top highlight reflection */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          {/* Left edge reflection */}
          <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          
          {/* Animated liquid blobs */}
          <div 
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#4ade80]/15 blur-3xl"
            style={{ animation: "liquidFloat 8s ease-in-out infinite" }}
          />
          <div 
            className="absolute top-1/3 -left-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl"
            style={{ animation: "liquidFloat 10s ease-in-out infinite reverse" }}
          />
          <div 
            className="absolute -bottom-20 right-1/4 w-52 h-52 rounded-full bg-[#4ade80]/10 blur-3xl"
            style={{ animation: "liquidFloat 12s ease-in-out infinite", animationDelay: "2s" }}
          />
        </div>

        {/* Glass noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />
      </div>
      
      {/* Glass border overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]" />

      {/* Fixed top navigation - stays in place while scrolling */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-3 pt-safe bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          className="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
          onClick={async (e) => {
            e.stopPropagation();
            if (!movie) return;
            const typeSlug = movie.type === "series" ? "series" : "movie";
            const shareUrl = `${window.location.origin}/${typeSlug}/${toSlug(movie.title, movie.mobifliks_id, movie.year)}`;
            try {
              if (navigator.share) {
                await navigator.share({ title: movie.title, url: shareUrl });
                return;
              }
            } catch (err) {
              // share cancelled or failed, fall through to clipboard
            }
            try {
              await navigator.clipboard.writeText(shareUrl);
              toast.success("Link copied to clipboard!");
            } catch {
              // Fallback for environments where clipboard API is blocked
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
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Fixed Hero section with backdrop - parallax effect */}
      <div 
        ref={heroRef}
        className="absolute top-0 left-0 right-0 z-10 transition-all duration-100 ease-out"
        style={{
          transform: `translateY(${scrollProgress * -60}px) scale(${1 + scrollProgress * 0.05})`,
          filter: `blur(${scrollProgress * 8}px)`,
          opacity: 1 - scrollProgress * 0.3,
        }}
      >
        <div className="relative w-full aspect-[16/14] min-h-[320px] overflow-hidden">
          {/* Loading shimmer - shows while backdrop is loading */}
          {!backdropLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40">
              <div className="absolute inset-0 shimmer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
            </div>
          )}
          
          {/* Backdrop image with parallax movement - fades in when loaded */}
          {backgroundImage && (
            <img
              src={backgroundImage}
              alt={movie.title}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                backdropLoaded ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: `scale(${1.1 + scrollProgress * 0.15}) translateY(${scrollProgress * 20}px)`,
              }}
            />
          )}
          {/* Gradient overlays - using black for consistency in both modes */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          
          {/* Dynamic overlay that intensifies on scroll */}
          <div 
            className="absolute inset-0 bg-black transition-opacity duration-100"
            style={{ opacity: scrollProgress * 0.4 }}
          />

          {/* Poster + Title overlay at bottom */}
          <div 
            className="absolute bottom-0 left-0 right-0 p-4 flex gap-4 items-end transition-all duration-100"
            style={{
              transform: `translateY(${scrollProgress * -30}px)`,
              opacity: 1 - scrollProgress * 0.5,
            }}
          >
            {/* Small poster */}
            <div 
              className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden border-2 border-background shadow-xl transition-transform duration-100"
              style={{
                transform: `scale(${1 - scrollProgress * 0.1}) translateY(${scrollProgress * -10}px)`,
              }}
            >
              <img
                src={getImageUrl(movie.image_url)}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Title and meta */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl font-display font-bold text-white drop-shadow-lg leading-tight line-clamp-2">
                {movie.title}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-sm text-white/90">
                {runtimeLabel && <span>{runtimeLabel}</span>}
                {runtimeLabel && certificationLabel && <span className="text-white/60">•</span>}
                {certificationLabel && (
                  <span className="px-1.5 py-0.5 text-xs font-medium rounded border border-white/40">
                    {certificationLabel}
                  </span>
                )}
                {(runtimeLabel || certificationLabel) && movie.year && <span className="text-white/60">•</span>}
                {movie.year && <span className="font-medium">{movie.year}</span>}
                {movie.vj_name && (
                  <>
                    <span className="text-white/60">•</span>
                    <span>VJ {movie.vj_name}</span>
                  </>
                )}
                {movie.views !== undefined && movie.views > 0 && (
                  <>
                    <span className="text-white/60">•</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {movie.views >= 1000000 
                        ? `${(movie.views / 1000000).toFixed(1)}M` 
                        : movie.views >= 1000 
                          ? `${(movie.views / 1000).toFixed(1)}K` 
                          : movie.views}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable container - scrolls over the fixed hero */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative z-20">
        {/* Spacer to push content below the hero initially - matches hero height exactly */}
        <div className="w-full aspect-[16/14] min-h-[320px]" />
        
        {/* Content container with background that scrolls over hero */}
        <div className="relative bg-background rounded-t-3xl min-h-[70vh] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          {/* Decorative handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>

          {/* Quick action row — only show if there are actions */}
          {(isSeries && allEpisodes.length > 0) || (FEATURE_FLAGS.DOWNLOAD_ENABLED && !isSeries && movie.download_url) ? (
            <div className="px-4 py-3 flex gap-3" style={staggerStyle(0, entranceReady)}>
              {isSeries && allEpisodes.length > 0 && (
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 gap-2 rounded-xl h-11 text-sm font-semibold bg-muted/30 border-border/50 hover:bg-muted/50"
                  onClick={scrollToEpisodes}
                >
                  Episodes
                  <List className="w-4 h-4" />
                </Button>
              )}
              {FEATURE_FLAGS.DOWNLOAD_ENABLED && !isSeries && movie.download_url && (
                <Button
                  size="lg"
                  className="flex-1 gap-2 rounded-xl h-11 text-sm font-semibold bg-muted border-border text-foreground hover:bg-muted/80"
                  onClick={() => { if (movie.download_url) window.open(movie.download_url, "_blank"); }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              )}
            </div>
          ) : null}

          {/* Tabs */}
          <div className="px-4 border-b border-border/30" style={staggerStyle(1, entranceReady)}>
            <div className="flex gap-6">
              {(["overview", "casts", "related"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-3 text-base font-medium capitalize transition-colors relative",
                    activeTab === tab 
                      ? "text-foreground" 
                      : "text-muted-foreground"
                  )}
                >
                  {tab === "casts" ? "Casts" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="px-4 py-5 space-y-5 pb-28">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Rating visual bar */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20" style={staggerStyle(2, entranceReady)}>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-[#facc15] text-[#facc15]" />
                  <span className="text-lg font-bold text-foreground">{rating}</span>
                  <span className="text-xs text-muted-foreground">/5</span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#facc15] to-[#f97316] transition-all duration-1000 ease-out"
                    style={{ width: entranceReady ? `${(parseFloat(rating) / 5) * 100}%` : "0%" }}
                  />
                </div>
                {movie.views !== undefined && movie.views > 0 && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {movie.views >= 1000000 
                      ? `${(movie.views / 1000000).toFixed(1)}M` 
                      : movie.views >= 1000 
                        ? `${(movie.views / 1000).toFixed(1)}K` 
                        : movie.views} views
                  </span>
                )}
              </div>

              {/* Description */}
              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed" style={staggerStyle(3, entranceReady)}>
                  {displayDescription}
                  {shouldTruncate && !isExpanded && "... "}
                  {shouldTruncate && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-primary font-medium ml-1"
                    >
                      {isExpanded ? "less" : "more"}
                    </button>
                  )}
                </p>
              )}

              {/* Genre pills */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2" style={staggerStyle(4, entranceReady)}>
                  {movie.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Metadata row: Runtime, Certification, Release Date */}
              {(runtimeLabel || certificationLabel || formattedReleaseDate) && (
                <div className="flex gap-3" style={staggerStyle(5, entranceReady)}>
                  {runtimeLabel && (
                    <div className="flex-1 p-3 rounded-xl bg-card/60 border border-border/20 text-center">
                      <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-semibold text-foreground">{runtimeLabel}</p>
                      <p className="text-[10px] text-muted-foreground">Duration</p>
                    </div>
                  )}
                  {certificationLabel && (
                    <div className="flex-1 p-3 rounded-xl bg-card/60 border border-border/20 text-center">
                      <Tag className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-semibold text-foreground">{certificationLabel}</p>
                      <p className="text-[10px] text-muted-foreground">Rating</p>
                    </div>
                  )}
                  {formattedReleaseDate && (
                    <div className="flex-1 p-3 rounded-xl bg-card/60 border border-border/20 text-center">
                      <CalendarDays className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs font-semibold text-foreground">{formattedReleaseDate}</p>
                      <p className="text-[10px] text-muted-foreground">Released</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cast preview — card-style horizontal scroll */}
              {cast.length > 0 && (
                <div style={staggerStyle(6, entranceReady)}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground">Cast</h4>
                    <button
                      onClick={() => setActiveTab("casts")}
                      className="text-xs text-primary font-medium"
                    >
                      See all
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                    {cast.slice(0, 8).map((member, i) => (
                      <button
                        key={member.name}
                        className="flex-none w-[72px] text-center active:scale-95 transition-transform"
                        onClick={() => setActiveTab("casts")}
                        style={staggerStyle(6 + i * 0.3, entranceReady)}
                      >
                        <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden bg-muted border border-border/30 shadow-sm">
                          <img
                            src={member.profile_url || `https://placehold.co/128x128/1a1a2e/ffffff?text=${member.name.charAt(0)}`}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/128x128/1a1a2e/ffffff?text=${member.name.charAt(0)}`;
                            }}
                          />
                        </div>
                        <p className="text-[11px] font-medium text-foreground mt-1.5 line-clamp-1 leading-tight">{member.name.split(" ")[0]}</p>
                        {member.character && (
                          <p className="text-[9px] text-muted-foreground line-clamp-1 mt-0.5">{member.character}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* VJ info */}
              {movie.vj_name && (
                <div style={staggerStyle(7, entranceReady)}>
                  <h4 className="text-sm font-semibold text-foreground mb-1.5">VJ</h4>
                  <p className="text-sm text-muted-foreground">{movie.vj_name}</p>
                </div>
              )}

              {/* File size */}
              {movie.file_size && (
                <div style={staggerStyle(8, entranceReady)}>
                  <h4 className="text-sm font-semibold text-foreground mb-1.5">Size</h4>
                  <p className="text-sm text-muted-foreground">{movie.file_size}</p>
                </div>
              )}

              {/* Episodes section for series */}
              {isSeries && allEpisodes.length > 0 && (
                <div ref={episodesSectionRef} className="space-y-4 pt-2">
                  {/* Season header - tappable dropdown */}
                  <button
                    onClick={() => setIsSeasonSelectorOpen(true)}
                    className="w-full bg-card/80 rounded-xl p-4 border border-border/30 text-left active:bg-card transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Season {selectedSeason}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {currentSeasonEpisodes.length} episodes
                        </p>
                      </div>
                      <ChevronLeft className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform duration-200",
                        isSeasonSelectorOpen ? "rotate-90" : "rotate-[270deg]"
                      )} />
                    </div>
                  </button>

                  {/* Season selector dropdown */}
                  {isSeasonSelectorOpen && (
                    <div className="bg-card rounded-xl border border-border/30 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                      {availableSeasons.map((seasonNum) => {
                        const seasonEps = seasons.get(seasonNum) || [];
                        const isSelected = seasonNum === selectedSeason;
                        return (
                          <button
                            key={seasonNum}
                            onClick={() => {
                              setSelectedSeason(seasonNum);
                              setIsSeasonSelectorOpen(false);
                            }}
                            className={cn(
                              "w-full p-4 text-left flex items-center justify-between border-b border-border/20 last:border-0 transition-colors",
                              isSelected ? "bg-primary/10" : "hover:bg-muted/50 active:bg-muted"
                            )}
                          >
                            <div>
                              <h4 className={cn(
                                "font-medium",
                                isSelected ? "text-primary" : "text-foreground"
                              )}>
                                Season {seasonNum}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {seasonEps.length} episodes
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Episode list */}
                  <div className="space-y-4">
                    {currentSeasonEpisodes.map((episode) => (
                      <MobileEpisodeCard
                        key={episode.mobifliks_id || `${selectedSeason}-${episode.episode_number}`}
                        episode={episode}
                        seriesTitle={movie.title}
                        seriesImage={movie.image_url}
                        seasonNumber={selectedSeason}
                        onPlay={onPlay}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Casts Tab — improved larger cards */}
          {activeTab === "casts" && (
            <div className="space-y-4">
              {cast.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {cast.map((member, i) => (
                    <div
                      key={member.name}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card/60 border border-border/20 backdrop-blur-sm"
                      style={staggerStyle(i * 0.3, entranceReady)}
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border/30 bg-muted shadow-lg">
                        <img
                          src={member.profile_url || `https://placehold.co/160x160/1a1a2e/ffffff?text=${member.name.charAt(0)}`}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/160x160/1a1a2e/ffffff?text=${member.name.charAt(0)}`;
                          }}
                        />
                      </div>
                      <p className="text-sm font-semibold text-foreground text-center line-clamp-1">{member.name}</p>
                      {member.character && (
                        <p className="text-xs text-muted-foreground text-center line-clamp-1">as {member.character}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No cast information available.</p>
              )}
            </div>
          )}

          {/* Related Tab — similar movies by genre */}
          {activeTab === "related" && (
            <div className="space-y-4">
              {relatedMovies.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {relatedMovies.map((m, i) => (
                    <button
                      key={m.mobifliks_id}
                      className="group text-left"
                      style={staggerStyle(i * 0.3, entranceReady)}
                      onClick={() => {
                        const typeSlug = m.type === "series" ? "series" : "movie";
                        window.location.href = `/${typeSlug}/${toSlug(m.title, m.mobifliks_id, m.year)}`;
                      }}
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden border border-border/20 bg-muted shadow-md group-active:scale-95 transition-transform duration-200">
                        <img
                          src={getImageUrl(m.image_url)}
                          alt={m.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs font-medium text-foreground mt-1.5 line-clamp-2 leading-tight">{m.title}</p>
                      {m.year && <p className="text-[10px] text-muted-foreground">{m.year}</p>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No related content available.</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Gradient fade */}
        <div className="h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="bg-background border-t border-border/30 px-4 py-3 pb-safe flex items-center gap-3">
          <Button
            size="lg"
            className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 text-base font-semibold"
            onClick={() => {
              if (isSeries && series.episodes && series.episodes.length > 0) {
                const firstEp = series.episodes[0];
                if (firstEp?.download_url) onPlay(firstEp.download_url, `${movie.title} - Episode 1`);
              } else if (movie.download_url) {
                onPlay(movie.download_url, movie.title);
              }
            }}
          >
            <Play className="w-5 h-5 fill-current" />
            Play
          </Button>
          <button
            onClick={onToggleWatchlist}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-200 active:scale-90",
              inWatchlist
                ? "bg-primary/15 border-primary text-primary"
                : "bg-muted/50 border-border text-muted-foreground"
            )}
          >
            <Heart className={cn("w-5 h-5", inWatchlist && "fill-current")} />
          </button>
          <button
            onClick={async () => {
              const typeSlug = movie.type === "series" ? "series" : "movie";
              const shareUrl = `${window.location.origin}/${typeSlug}/${toSlug(movie.title, movie.mobifliks_id, movie.year)}`;
              try {
                if (navigator.share) { await navigator.share({ title: movie.title, url: shareUrl }); return; }
              } catch {}
              try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); } catch {
                const ta = document.createElement("textarea"); ta.value = shareUrl; ta.style.cssText = "position:fixed;opacity:0";
                document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
                toast.success("Link copied!");
              }
            }}
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted/50 border border-border text-muted-foreground active:scale-90 transition-transform"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Liquid glass animation keyframes */}
      <style>{`
        @keyframes liquidFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(10px, -15px) scale(1.05); }
          50% { transform: translate(-5px, 10px) scale(0.95); }
          75% { transform: translate(-15px, -5px) scale(1.02); }
        }
      `}</style>
    </div>
  );
}

// Mobile episode card - matches reference design with thumbnail
interface MobileEpisodeCardProps {
  episode: Episode;
  seriesTitle: string;
  seriesImage?: string;
  seasonNumber?: number;
  onPlay: (url: string, title: string) => void;
}

function MobileEpisodeCard({ episode, seriesTitle, seriesImage, seasonNumber = 1, onPlay }: MobileEpisodeCardProps) {
  const hasVideo = episode.download_url && 
    (episode.download_url.includes(".mp4") || 
     episode.download_url.includes("downloadmp4.php") ||
     episode.download_url.includes("downloadserie.php"));

  // Format episode number with leading zero
  const formattedEpisodeNum = episode.episode_number.toString().padStart(2, '0');

  return (
    <div className="flex gap-4 items-start">
      {/* Episode thumbnail with number overlay and centered play button */}
      <div 
        className="relative w-36 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer group"
        onClick={() => {
          if (hasVideo && episode.download_url) {
            onPlay(episode.download_url, `${seriesTitle} - Episode ${episode.episode_number}`);
          }
        }}
      >
        <img
          src={getImageUrl(seriesImage)}
          alt={`Episode ${episode.episode_number}`}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Episode number - bottom left */}
        <span className="absolute bottom-2 left-2 text-2xl font-bold text-white">
          {formattedEpisodeNum}
        </span>

        {/* Centered play button */}
        {hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center bg-black/20 backdrop-blur-sm group-active:scale-95 transition-transform">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Episode info and download button */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground text-sm">
            Episode #{seasonNumber}.{episode.episode_number}
          </h4>
          {episode.file_size && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {episode.file_size}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
          {episode.description || episode.title || `Watch episode ${episode.episode_number} of ${seriesTitle}`}
        </p>
        
        {/* Download button */}
        {FEATURE_FLAGS.DOWNLOAD_ENABLED && hasVideo && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (episode.download_url) {
                window.open(episode.download_url, "_blank");
              }
            }}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors text-sm text-foreground"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </div>
    </div>
  );
}

interface MobileEpisodeItemProps {
  episode: Episode;
  seriesTitle: string;
  onPlay: (url: string, title: string) => void;
}

// Mobile episode item - compact format
function MobileEpisodeItem({ episode, seriesTitle, onPlay }: MobileEpisodeItemProps) {
  const hasVideo = episode.download_url && 
    (episode.download_url.includes(".mp4") || 
     episode.download_url.includes("downloadmp4.php") ||
     episode.download_url.includes("downloadserie.php"));

  return (
    <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/40 transition-all duration-200 group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
          <span className="text-sm font-bold text-primary">{episode.episode_number}</span>
        </div>
        <div className="min-w-0">
          <h5 className="font-medium text-foreground text-sm break-words [overflow-wrap:anywhere]">
            {episode.title || `Episode ${episode.episode_number}`}
          </h5>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {episode.file_size && <span>{episode.file_size}</span>}
            {episode.views && <span>• {episode.views.toLocaleString()} views</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasVideo && (
          <>
            {FEATURE_FLAGS.DOWNLOAD_ENABLED && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-9 w-9 p-0 rounded-lg"
              onClick={() => {
                if (episode.download_url) {
                  window.open(episode.download_url, "_blank");
                }
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5 bg-primary/20 text-primary hover:bg-primary/30 h-9 px-4 rounded-lg font-medium"
              onClick={() => onPlay(
                episode.download_url!,
                `${seriesTitle} - Episode ${episode.episode_number}`
              )}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch
            </Button>
          </>
        )}
        {!hasVideo && episode.video_page_url && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 px-4 rounded-lg"
            asChild
          >
            <a href={episode.video_page_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Watch
            </a>
          </Button>
        )}
      </div>
    </div>
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
  const hasVideo = episode.download_url && 
    (episode.download_url.includes(".mp4") || 
     episode.download_url.includes("downloadmp4.php") ||
     episode.download_url.includes("downloadserie.php"));

  return (
    <div 
      className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 group cursor-pointer"
      onClick={() => {
        if (hasVideo && episode.download_url) {
          onPlay(episode.download_url, `${seriesTitle} - Episode ${episode.episode_number}`);
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
              <Button
                size="sm"
                className="gap-1.5 bg-white text-black hover:bg-white/90 h-8 px-4 rounded font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(episode.download_url!, `${seriesTitle} - Episode ${episode.episode_number}`);
                }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play
              </Button>
              {FEATURE_FLAGS.DOWNLOAD_ENABLED && (
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  if (episode.download_url) {
                    window.open(episode.download_url, "_blank");
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
