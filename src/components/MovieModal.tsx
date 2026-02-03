import React from "react";
import { X, Play, Download, ExternalLink, Clock, Eye, ChevronLeft, Tag, Star, CalendarDays, Plus, Maximize2, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Movie, Series, Episode, CastMember } from "@/types/movie";
import { getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MovieModalProps {
  movie: Movie | Series | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (url: string, title: string) => void;
}

const fallbackCastAvatar = "https://placehold.co/160x160/1a1a2e/ffffff?text=Actor";

export function MovieModal({ movie, isOpen, onClose, onPlay }: MovieModalProps) {
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
  const backdrop = movie.backdrop_url || null;
  // Backdrop should come from TMDB; fall back to poster only if no backdrop exists.
  const backgroundImage = backdrop || movie.image_url || null;
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
        />

        {/* Desktop/Tablet Layout with glassmorphism */}
        <div className="hidden md:block relative h-full md:rounded-3xl overflow-hidden">
          {/* Multi-layer background for professional glass effect */}
          <div className="absolute inset-0">
            {backgroundImage && (
              <>
                <img
                  src={getImageUrl(backgroundImage)}
                  alt=""
                  className="w-full h-full object-cover scale-110"
                />
                <img
                  src={getImageUrl(backgroundImage)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-150 blur-3xl opacity-80"
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

          <ScrollArea className="max-h-[90vh] w-full">
            <div className="relative w-full max-w-full">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-200 hover:scale-105 border border-white/20"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Backdrop hero section */}
              <div className="relative h-[280px] lg:h-[340px] overflow-hidden">
                {backdrop ? (
                  <img
                    src={getImageUrl(backdrop)}
                    alt={`${movie.title} backdrop`}
                    className="w-full h-full object-cover"
                  />
                ) : movie.image_url ? (
                  <img
                    src={getImageUrl(movie.image_url)}
                    alt={movie.title}
                    className="w-full h-full object-cover scale-125 blur-sm"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 via-black to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>

              {/* Content area - overlapping backdrop */}
              <div className="relative -mt-32 px-10 pb-10 space-y-6">
                {/* Poster + Title row */}
                <div className="flex gap-6 items-start">
                  <div className="w-32 lg:w-40 flex-none rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black/20 backdrop-blur-sm">
                    <img
                      src={getImageUrl(movie.image_url)}
                      alt={`${movie.title} poster`}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-4 pt-2">
                    <h1 className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
                      {movie.title}
                      {isSeries && <span className="text-primary text-2xl ml-2 font-semibold">(Series)</span>}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3">
                      {movie.year && (
                        <span className="text-lg font-medium text-white/90">{movie.year}</span>
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
                      {movie.language && (
                        <span className="px-2.5 py-0.5 text-sm font-medium rounded border border-white/40 text-white/80 uppercase">
                          {movie.language}
                        </span>
                      )}
                      {isSeries && (
                        <span className="px-2.5 py-0.5 text-sm font-semibold rounded bg-primary/30 text-primary border border-primary/40">
                          SERIES
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
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

                      <button className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-white hover:bg-white/20 hover:border-white transition-all duration-200">
                        <Plus className="w-5 h-5" />
                      </button>
                      <button className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-white hover:bg-white/20 hover:border-white transition-all duration-200">
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      {!isSeries && movie.download_url && (
                        <a
                          href={movie.download_url}
                          download
                          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center text-white hover:bg-white/20 hover:border-white transition-all duration-200"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {movie.description && (
                  <p className="text-white/90 leading-relaxed text-lg max-w-4xl">{movie.description}</p>
                )}

                {cast.length > 0 && (
                  <p className="text-base">
                    <span className="text-white/60 font-medium">Starring:</span>{" "}
                    <span className="text-white/90">{cast.slice(0, 5).map((member) => member.name).join(", ")}</span>
                  </p>
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
}: MobileMovieLayoutProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const maxDescriptionLength = 150;
  const description = movie.description || "";
  const shouldTruncate = description.length > maxDescriptionLength;
  const displayDescription = isExpanded ? description : description.slice(0, maxDescriptionLength);

  return (
    <div className="md:hidden flex flex-col h-[100dvh] w-full max-w-full overflow-hidden box-border bg-card">
      {/* Hero section with backdrop and centered poster - fixed height */}
      <div className="relative flex-shrink-0 h-[40vh]">
        {/* Backdrop image */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={getImageUrl(backgroundImage || movie.image_url)}
            alt=""
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
        </div>

        {/* Top navigation bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-safe">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
            <Heart className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Centered poster with play button */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center translate-y-1/3 z-10">
          <div className="relative w-32 rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <img
              src={getImageUrl(movie.image_url)}
              alt={movie.title}
              className="w-full aspect-[2/3] object-cover"
            />
            {/* Play button overlay */}
            {((!isSeries && movie.download_url) || (isSeries && series.episodes && series.episodes.length > 0)) && (
              <button
                onClick={() => {
                  if (isSeries && series.episodes?.[0]?.download_url) {
                    onPlay(series.episodes[0].download_url, `${movie.title} - Episode 1`);
                  } else if (movie.download_url) {
                    onPlay(movie.download_url, movie.title);
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/20"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
                  <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-5 pt-16 pb-32 space-y-4">
          {/* Title */}
          <h1 className="text-xl font-display font-bold text-foreground text-center line-clamp-2">
            {movie.title}
          </h1>

          {/* Meta row: Genre • Duration */}
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
            {movie.genres && movie.genres.length > 0 && (
              <span className="truncate max-w-[120px]">{movie.genres.slice(0, 2).join("/")}</span>
            )}
            {runtimeLabel && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>{runtimeLabel}</span>
              </>
            )}
          </div>

          {/* Star rating */}
          <div className="flex items-center justify-center gap-1.5">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium text-foreground">{rating}</span>
          </div>

          {/* Overview section */}
          {description && (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">Overview</h3>
              <p className="text-sm text-muted-foreground leading-relaxed break-words">
                {displayDescription}
                {shouldTruncate && !isExpanded && "... "}
                {shouldTruncate && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-primary font-medium ml-1"
                  >
                    {isExpanded ? "Show Less" : "Read More"}
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Cast section */}
          {cast.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">Cast</h3>
              <div className="overflow-x-auto scrollbar-none -mx-5 px-5">
                <div className="flex gap-4 w-max">
                  {cast.slice(0, 10).map((member) => (
                    <div key={member.name} className="flex flex-col items-center gap-2 w-16 flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-border/30 shadow-md bg-muted">
                        <img
                          src={member.profile_url || `https://placehold.co/120x120/1a1a2e/ffffff?text=${member.name.charAt(0)}`}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-muted-foreground text-center truncate w-full">
                        {member.name.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Episodes for series */}
          {isSeries && series.episodes && series.episodes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                Episodes <span className="text-muted-foreground font-normal">({series.episodes.length})</span>
              </h3>
              <div className="space-y-2">
                {series.episodes.map((episode) => (
                  <MobileEpisodeItem
                    key={episode.mobifliks_id || episode.episode_number}
                    episode={episode}
                    seriesTitle={movie.title}
                    onPlay={onPlay}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom action buttons */}
      {!isSeries && movie.download_url && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-card via-card/95 to-transparent pt-8 z-30">
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-14 text-base font-semibold shadow-lg shadow-primary/25"
              onClick={() => onPlay(movie.download_url!, movie.title)}
            >
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 rounded-xl h-14 bg-muted/50 border-border/40 hover:bg-muted/70 px-5"
              onClick={() => {
                if (movie.download_url) {
                  window.open(movie.download_url, "_blank");
                }
              }}
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Series mobile bottom actions */}
      {isSeries && series.episodes && series.episodes.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-card via-card/95 to-transparent pt-8 z-30">
          <Button
            size="lg"
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-14 text-base font-semibold shadow-lg shadow-primary/25"
            onClick={() => {
              const firstEp = series.episodes?.[0];
              if (firstEp?.download_url) {
                onPlay(firstEp.download_url, `${movie.title} - Episode 1`);
              }
            }}
          >
            <Play className="w-5 h-5 fill-current" />
            Start Watching
          </Button>
        </div>
      )}
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
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-9 w-9 p-0 rounded-lg"
              asChild
            >
              <a href={episode.download_url} download>
                <Download className="w-4 h-4" />
              </a>
            </Button>
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
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3 rounded"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <a href={episode.download_url} download>
                  <Download className="w-4 h-4" />
                </a>
              </Button>
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
