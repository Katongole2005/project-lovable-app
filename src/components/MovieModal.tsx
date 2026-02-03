import { X, Play, Download, ExternalLink, Clock, Eye, ChevronLeft, Tag, Star, CalendarDays, Plus, Maximize2 } from "lucide-react";
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
      <DialogContent className="w-full max-w-full md:max-w-5xl h-[100dvh] md:h-auto md:max-h-[90vh] p-0 bg-transparent border-0 overflow-hidden shadow-none rounded-none md:rounded-3xl animate-in fade-in-0 zoom-in-95 duration-300 [&>button]:hidden">
        <DialogTitle className="sr-only">{movie.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {movie.description || (isSeries ? "Series details and episodes." : "Movie details and playback.")}
        </DialogDescription>
        {/* Premium Glassmorphism Container */}
        <div className="relative h-full md:h-auto md:rounded-3xl overflow-hidden">
          {/* Multi-layer blurred background for depth */}
          <div className="absolute inset-0">
            {/* Base image layer */}
            {backgroundImage && (
              <>
                <img
                  src={getImageUrl(backgroundImage)}
                  alt=""
                  className="w-full h-full object-cover opacity-60 scale-105"
                />
                {/* Heavy blur layer for glass effect */}
                <img
                  src={getImageUrl(backgroundImage)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-70"
                />
              </>
            )}
            {/* Glassmorphism overlay - multi-gradient for premium feel */}
            <div className="absolute inset-0 backdrop-blur-2xl bg-gradient-to-br from-background/70 via-background/60 to-background/75" />
            {/* Subtle noise texture for glass authenticity */}
            <div 
              className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
              }}
            />
            {/* Inner glow/light refraction effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/[0.03] to-primary/[0.08]" />
            {/* Bottom shadow gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
          </div>
          
          {/* Glass border effect - subtle inner highlight */}
          <div className="absolute inset-0 md:rounded-3xl pointer-events-none border border-border/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_1px_rgba(0,0,0,0.05)]" />

          <ScrollArea className="h-[100dvh] md:max-h-[90vh] w-full">
            <div className="relative min-h-[100dvh] md:min-h-0 w-full max-w-full">
              {/* Desktop Layout: Netflix-style immersive glassmorphism */}
              <div className="hidden md:block relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all duration-200 hover:scale-105 border border-border/30"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>

                {/* Full bleed backdrop with heavy blur */}
                <div className="relative h-[400px] overflow-hidden">
                  {backdrop ? (
                    <img
                      src={getImageUrl(backdrop)}
                      alt={`${movie.title} backdrop`}
                      className="w-full h-full object-cover scale-105"
                    />
                  ) : movie.image_url ? (
                    <img
                      src={getImageUrl(movie.image_url)}
                      alt={movie.title}
                      className="w-full h-full object-cover scale-125 blur-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-background to-background" />
                  )}
                  {/* Heavy gradient fade to content */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/40" />
                </div>

                {/* Content area - overlapping backdrop */}
                <div className="relative -mt-56 px-10 pb-10 space-y-6">
                  {/* Title */}
                  <h1 className="font-display text-5xl font-bold text-foreground tracking-tight leading-tight drop-shadow-lg max-w-3xl">
                    {movie.title}
                  </h1>

                  {/* Meta badges row - Netflix style */}
                  <div className="flex flex-wrap items-center gap-3">
                    {movie.year && (
                      <span className="text-lg font-medium text-foreground/90">
                        {movie.year}
                      </span>
                    )}
                    {certificationLabel && (
                      <span className="px-2.5 py-0.5 text-sm font-medium rounded border border-foreground/40 text-foreground/80">
                        {certificationLabel}
                      </span>
                    )}
                    {runtimeLabel && (
                      <span className="px-2.5 py-0.5 text-sm font-medium rounded border border-foreground/40 text-foreground/80">
                        {runtimeLabel}
                      </span>
                    )}
                    {movie.language && (
                      <span className="px-2.5 py-0.5 text-sm font-medium rounded border border-foreground/40 text-foreground/80">
                        {movie.language}
                      </span>
                    )}
                    {isSeries && (
                      <span className="px-2.5 py-0.5 text-sm font-semibold rounded bg-primary/20 text-primary border border-primary/30">
                        SERIES
                      </span>
                    )}
                  </div>

                  {/* Action buttons row - Netflix style */}
                  <div className="flex items-center gap-3">
                    {/* Primary Play button - white/light */}
                    {!isSeries && movie.download_url && (
                      <Button
                        size="lg"
                        className="gap-2 bg-foreground hover:bg-foreground/90 text-background rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
                        onClick={() => onPlay(movie.download_url!, movie.title)}
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Play
                      </Button>
                    )}
                    {isSeries && series.episodes && series.episodes.length > 0 && (
                      <Button
                        size="lg"
                        className="gap-2 bg-foreground hover:bg-foreground/90 text-background rounded-md px-8 h-12 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
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

                    {/* Icon buttons - glassy circles */}
                    <button className="w-11 h-11 rounded-full bg-background/20 backdrop-blur-sm border-2 border-foreground/50 flex items-center justify-center text-foreground hover:bg-background/40 hover:border-foreground transition-all duration-200">
                      <Plus className="w-5 h-5" />
                    </button>
                    <button className="w-11 h-11 rounded-full bg-background/20 backdrop-blur-sm border-2 border-foreground/50 flex items-center justify-center text-foreground hover:bg-background/40 hover:border-foreground transition-all duration-200">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    {!isSeries && movie.download_url && (
                      <a
                        href={movie.download_url}
                        download
                        className="w-11 h-11 rounded-full bg-background/20 backdrop-blur-sm border-2 border-foreground/50 flex items-center justify-center text-foreground hover:bg-background/40 hover:border-foreground transition-all duration-200"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  {movie.description && (
                    <p className="text-foreground/90 leading-relaxed text-lg max-w-3xl">
                      {movie.description}
                    </p>
                  )}

                  {/* Starring - inline Netflix style */}
                  {cast.length > 0 && (
                    <p className="text-base">
                      <span className="text-muted-foreground">Starring:</span>{" "}
                      <span className="text-foreground/90">
                        {cast.slice(0, 5).map((member) => member.name).join(", ")}
                      </span>
                    </p>
                  )}

                  {/* Genres - inline Netflix style */}
                  {movie.genres && movie.genres.length > 0 && (
                    <p className="text-base">
                      <span className="text-muted-foreground">Genres:</span>{" "}
                      <span className="text-foreground/90">
                        {movie.genres.join(", ")}
                      </span>
                    </p>
                  )}

                  {/* File info */}
                  {movie.file_size && (
                    <p className="text-base">
                      <span className="text-muted-foreground">Size:</span>{" "}
                      <span className="text-foreground/90">{movie.file_size}</span>
                    </p>
                  )}

                  {/* Episodes for series */}
                  {isSeries && series.episodes && series.episodes.length > 0 && (
                    <div className="pt-4 space-y-4">
                      <h4 className="text-xl font-display font-semibold text-foreground flex items-center gap-3">
                        Episodes
                        <span className="text-sm text-muted-foreground font-normal px-2 py-0.5 rounded-full bg-muted/30">
                          {series.episodes.length}
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                        {series.episodes.map((episode) => (
                          <EpisodeItem
                            key={episode.mobifliks_id || episode.episode_number}
                            episode={episode}
                            seriesTitle={movie.title}
                            onPlay={onPlay}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No episodes message */}
                  {isSeries && (!series.episodes || series.episodes.length === 0) && (
                    <div className="pt-4 text-center py-8 text-muted-foreground bg-muted/10 rounded-xl border border-border/20 backdrop-blur-sm">
                      No episodes available yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Layout: Full screen immersive */}
              <div className="md:hidden flex flex-col min-h-[100dvh] w-full max-w-full overflow-x-hidden box-border">
                {/* Hero image section */}
                <div className="relative h-[50vh] flex-shrink-0">
                  <img
                    src={getImageUrl(backgroundImage || undefined)}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent pointer-events-none" />
                  
                  {/* Top buttons */}
                  <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-safe pointer-events-auto">
                    <button
                      onClick={onClose}
                      className="p-2.5 rounded-full bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur-sm">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-semibold text-foreground">{rating}</span>
                    </div>
                  </div>
                </div>

                {/* Content section - consistent px-5 gutter for safe area */}
                <div className="flex-1 w-full max-w-full -mt-20 relative z-10 space-y-5 overflow-hidden">
                  {/* Poster + Title */}
                  <div className="flex w-full gap-3 items-start px-5">
                    <div className="w-24 flex-none rounded-xl overflow-hidden shadow-2xl border border-border/30 bg-card/30 backdrop-blur-sm">
                      <img
                        src={getImageUrl(movie.image_url)}
                        alt={`${movie.title} poster`}
                        className="w-full aspect-[2/3] object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 pt-4">
                      <h1 className="font-display text-xl font-bold text-foreground leading-tight tracking-tight break-words [overflow-wrap:anywhere]">
                        {movie.title}
                        {isSeries && <span className="text-primary text-base ml-1 font-semibold">(Series)</span>}
                      </h1>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {movie.year && <span>{movie.year}</span>}
                        {certificationLabel && <span>• {certificationLabel}</span>}
                        {runtimeLabel && <span>• {runtimeLabel}</span>}
                        {movie.language && <span>• {movie.language}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Genres */}
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-5">
                      {movie.genres.map((genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1.5 text-xs font-medium rounded-full bg-muted/40 text-foreground/80 border border-border/30"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* File size */}
                  {movie.file_size && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-5">
                      <Tag className="w-4 h-4" />
                      <span>{movie.file_size}</span>
                    </div>
                  )}

                  {/* Description */}
                  {movie.description && (
                    <p className="text-muted-foreground text-sm leading-relaxed px-5 break-words [overflow-wrap:anywhere]">
                      {movie.description}
                    </p>
                  )}

                  {/* Cast - Horizontal scroll with aligned gutters */}
                  {cast.length > 0 && (
                    <div className="space-y-3 overflow-hidden">
                      <h4 className="text-base font-semibold text-foreground px-5">Cast</h4>
                      <div className="overflow-x-auto scrollbar-none touch-pan-x">
                        <div className="flex gap-4 px-5 pb-2 w-max">
                          {cast.map((member) => (
                            <div key={member.name} className="flex flex-col items-center gap-2 flex-none w-16">
                              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border/30 shadow-md">
                                <img
                                  src={member.profile_url || fallbackCastAvatar}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-xs text-muted-foreground text-center w-full truncate">
                                {member.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Episodes for series (mobile) */}
                  {isSeries && series.episodes && series.episodes.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                        <span className="text-primary">Episodes</span>
                        <span className="text-sm text-muted-foreground font-normal">({series.episodes.length})</span>
                      </h4>
                      <div className="space-y-2">
                        {series.episodes.map((episode) => (
                          <EpisodeItem
                            key={episode.mobifliks_id || episode.episode_number}
                            episode={episode}
                            seriesTitle={movie.title}
                            onPlay={onPlay}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spacer for bottom buttons */}
                  <div className="h-32" />
                </div>

                {/* Fixed bottom action buttons */}
                {!isSeries && movie.download_url && (
                  <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-card via-card/95 to-transparent pt-8 z-30">
                    <div className="flex gap-3">
                      <Button
                        size="lg"
                        className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-14 text-base font-semibold shadow-lg shadow-primary/25"
                        onClick={() => handlePlay(movie.download_url!, movie.title)}
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
                        <span className="flex items-center gap-2">
                          <Download className="w-5 h-5" />
                          Download
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Series mobile bottom actions */}
                {isSeries && series.episodes && series.episodes.length > 0 && (
                  <div className="sticky bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-card via-card to-transparent pt-8 z-20">
                    <Button
                      size="lg"
                      className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-14 text-base font-semibold shadow-lg shadow-primary/25"
                      onClick={() => {
                        const firstEp = series.episodes?.[0];
                        if (firstEp?.download_url) {
                          handlePlay(firstEp.download_url, `${movie.title} - Episode 1`);
                        }
                      }}
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Start Watching
                    </Button>
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

interface EpisodeItemProps {
  episode: Episode;
  seriesTitle: string;
  onPlay: (url: string, title: string) => void;
}

function EpisodeItem({ episode, seriesTitle, onPlay }: EpisodeItemProps) {
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
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5 break-words [overflow-wrap:anywhere]">
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
