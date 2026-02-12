import { useRef, useState, useEffect, useCallback } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw,
  RotateCw,
  X,
  ScreenShare,
  ArrowLeft,
  SkipForward,
  Captions,
  Airplay,
  Flag
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/api";
import type { Movie, Series, CastMember } from "@/types/movie";

interface CinematicVideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  movie?: Movie | Series | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startTime?: number;
}

export function CinematicVideoPlayer({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title,
  movie,
  onTimeUpdate, 
  startTime = 0 
}: CinematicVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const [previewPosition, setPreviewPosition] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);

  // Toggle screen orientation (mobile only)
  const toggleOrientation = useCallback(async () => {
    try {
      const screen = window.screen as any;
      if (screen.orientation?.lock) {
        if (isLandscape) {
          await screen.orientation.lock("portrait");
          setIsLandscape(false);
        } else {
          await screen.orientation.lock("landscape");
          setIsLandscape(true);
        }
      }
    } catch (err) {
      // Fallback: orientation lock not supported or not in fullscreen
      // Try entering fullscreen first then locking
      try {
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
        }
        const screen = window.screen as any;
        if (screen.orientation?.lock) {
          if (isLandscape) {
            await screen.orientation.lock("portrait");
            setIsLandscape(false);
          } else {
            await screen.orientation.lock("landscape");
            setIsLandscape(true);
          }
        }
      } catch (innerErr) {
        console.log("Orientation lock not supported on this device");
      }
    }
  }, [isLandscape]);

  // Track actual orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const screen = window.screen as any;
      const type = screen.orientation?.type || "";
      setIsLandscape(type.includes("landscape"));
    };
    const screen = window.screen as any;
    if (screen.orientation) {
      screen.orientation.addEventListener("change", handleOrientationChange);
      return () => screen.orientation.removeEventListener("change", handleOrientationChange);
    }
  }, []);

  // Format time as HH:MM:SS or MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Set start time when video loads
  useEffect(() => {
    if (isOpen && videoRef.current && startTime > 0) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        if (startTime > 0 && !isNaN(video.duration)) {
          video.currentTime = Math.min(startTime, video.duration);
        }
      };
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, [isOpen, startTime]);

  // Pause video when closing
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (isFullscreen) {
            exitFullscreen();
          } else {
            handleClose();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
      resetControlsTimeout();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      try {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        console.error("Fullscreen error:", err);
      }
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error("Exit fullscreen error:", err);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      onTimeUpdate?.(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    setPreviewTime(time);
    setPreviewPosition(x);
  };

  const handleProgressLeave = () => {
    setPreviewTime(null);
  };

  const handleClose = () => {
    if (videoRef.current) {
      handleTimeUpdate();
      videoRef.current.pause();
    }
    if (isFullscreen) {
      exitFullscreen();
    }
    onClose();
  };

  // Get movie details
  const posterUrl = movie?.image_url ? getImageUrl(movie.image_url) : null;
  const year = movie?.year;
  const description = movie?.description;
  const genres = movie?.genres || [];
  const cast = movie?.cast || (movie?.stars || []).map((name: string) => ({ name }));
  const director = movie?.vj_name;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-full w-full h-[100dvh] max-h-[100dvh] p-0 bg-black border-none overflow-hidden left-0 top-0 translate-x-0 translate-y-0 rounded-none">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Video player for {title}</DialogDescription>
        
        <div 
          ref={containerRef}
          className="relative w-full h-full flex flex-col bg-black"
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Video Container */}
          <div className="relative flex-1 flex items-center justify-center bg-black min-h-0">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onClick={resetControlsTimeout}
            />

            {/* Buffering indicator */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Play/Pause overlay (shows briefly on click) */}
            <div 
              className={cn(
                "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
              )}
            >
              {!isPlaying && !isBuffering && (
                <button 
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center pointer-events-auto hover:bg-primary transition-colors"
                >
                  <Play className="w-10 h-10 text-primary-foreground fill-current ml-1" />
                </button>
              )}
            </div>

            {/* Back button (top-left) */}
            <button
              onClick={handleClose}
              className={cn(
                "absolute top-4 left-4 z-50 p-2 hover:bg-white/10 rounded-full transition-all",
                showControls ? "opacity-100" : "opacity-0"
              )}
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>

            {/* Flag button (top-right) like reference */}
            <button
              className={cn(
                "absolute top-4 right-4 z-50 p-2 hover:bg-white/10 rounded-full transition-all hidden md:block",
                showControls ? "opacity-100" : "opacity-0"
              )}
            >
              <Flag className="w-5 h-5 text-white" />
            </button>

            {/* Video Controls Overlay */}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-20 pb-3 md:pb-4 px-3 md:px-4 transition-opacity duration-300",
                showControls ? "opacity-100" : "opacity-0"
              )}
            >
              {/* Progress bar - RED like YouTube */}
              <div 
                className="relative mb-2 md:mb-3 group"
                onMouseMove={handleProgressHover}
                onMouseLeave={handleProgressLeave}
              >
                {/* Preview thumbnail on hover */}
                {previewTime !== null && (
                  <div 
                    className="absolute bottom-8 -translate-x-1/2 bg-card border border-border rounded-lg overflow-hidden shadow-lg pointer-events-none z-10"
                    style={{ left: previewPosition }}
                  >
                    {posterUrl && (
                      <img 
                        src={posterUrl} 
                        alt="Preview" 
                        className="w-32 h-20 object-cover"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs text-center py-1">
                      {formatTime(previewTime)}
                    </div>
                  </div>
                )}
                
                {/* Red progress bar */}
                <div className="relative flex items-center w-full group">
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="w-full [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:bg-[#ff0000] [&_[role=slider]]:border-0 [&_[role=slider]]:opacity-0 [&_[role=slider]]:group-hover:opacity-100 [&_[role=slider]]:transition-opacity [&_.relative]:h-[3px] [&_.relative]:group-hover:h-1 [&_.relative]:transition-all [&_.relative]:rounded-none [&_.relative]:bg-white/30 [&_[data-state]]:bg-[#ff0000]"
                  />
                  {/* Time on the right side of progress bar */}
                  <span className="hidden md:block ml-3 text-white text-xs tabular-nums whitespace-nowrap">
                    {formatTime(currentTime)}
                  </span>
                </div>
              </div>

              {/* Controls row - YouTube layout */}
              <div className="flex items-center justify-between gap-2">
                {/* Left controls: play, skip-10, skip+10, volume */}
                <div className="flex items-center gap-1 md:gap-2">
                  <button 
                    onClick={togglePlay}
                    className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    ) : (
                      <Play className="w-6 h-6 md:w-7 md:h-7 text-white fill-current" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => skip(-10)}
                    className="relative p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <RotateCcw className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[9px] font-bold text-white mt-[1px]">10</span>
                  </button>
                  
                  <button 
                    onClick={() => skip(10)}
                    className="relative p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <RotateCw className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[9px] font-bold text-white mt-[1px]">10</span>
                  </button>

                  {/* Volume control - desktop */}
                  <div className="hidden md:flex items-center gap-1 group/volume">
                    <button 
                      onClick={toggleMute}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.01}
                        onValueChange={handleVolumeChange}
                        className="w-20 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_.relative]:h-1 [&_.relative]:rounded-full [&_.relative]:bg-white/30 [&_[data-state]]:bg-white"
                      />
                    </div>
                  </div>

                  {/* Time display - mobile only (desktop shows it near progress bar) */}
                  <span className="md:hidden text-white text-xs tabular-nums ml-1">
                    {formatTime(currentTime)}
                  </span>
                </div>

                {/* Center: Title */}
                <div className="hidden md:flex items-center justify-center flex-1 min-w-0 px-4">
                  <span className="text-white text-sm font-medium truncate">{title}</span>
                </div>

                {/* Right controls: next, cast, subtitles, fullscreen */}
                <div className="flex items-center gap-1 md:gap-2">
                  {/* Rotate orientation - mobile only */}
                  <button 
                    onClick={toggleOrientation}
                    className="md:hidden p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    title={isLandscape ? "Switch to portrait" : "Switch to landscape"}
                  >
                    <ScreenShare className={cn(
                      "w-5 h-5 text-white transition-transform duration-300",
                      isLandscape ? "rotate-0" : "rotate-90"
                    )} />
                  </button>

                  {/* Next episode button - desktop */}
                  <button 
                    className="hidden md:block p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Next"
                  >
                    <SkipForward className="w-5 h-5 text-white" />
                  </button>

                  {/* Cast/Airplay button - desktop */}
                  <button 
                    className="hidden md:block p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Cast"
                  >
                    <Airplay className="w-5 h-5 text-white" />
                  </button>

                  {/* Subtitles/CC button - desktop */}
                  <button 
                    className="hidden md:block p-2 hover:bg-white/10 rounded-full transition-colors"
                    title="Subtitles"
                  >
                    <Captions className="w-5 h-5 text-white" />
                  </button>
                  
                  <button 
                    onClick={toggleFullscreen}
                    className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5 text-white" />
                    ) : (
                      <Maximize className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Movie Info Panel - Shows below video on non-fullscreen */}
          {!isFullscreen && movie && (
            <div className="flex-shrink-0 bg-gradient-to-t from-card to-card/95 border-t border-border/20 px-4 py-4 md:px-6 md:py-5">
              <div className="flex gap-4 md:gap-6 max-w-6xl mx-auto">
                {/* Poster */}
                {posterUrl && (
                  <div className="hidden sm:block w-16 md:w-24 flex-shrink-0 rounded-lg overflow-hidden border border-border/30 shadow-lg">
                    <img 
                      src={posterUrl} 
                      alt={title}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-foreground">
                        {title}
                        {year && <span className="text-muted-foreground font-normal ml-2">{year}</span>}
                      </h3>
                      {description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 max-w-2xl">
                          {description}
                        </p>
                      )}
                    </div>

                    {/* Genre chips */}
                    {genres.length > 0 && (
                      <div className="hidden md:flex flex-wrap gap-2">
                        {genres.slice(0, 3).map((genre) => (
                          <span 
                            key={genre}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30"
                          >
                            {genre.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cast and director */}
                  <div className="hidden md:flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {cast.length > 0 && (
                      <p>
                        <span className="text-muted-foreground">STARS:</span>{" "}
                        <span className="text-foreground">
                          {(cast as CastMember[]).slice(0, 4).map(c => c.name).join(", ")}
                        </span>
                      </p>
                    )}
                    {director && (
                      <p>
                        <span className="text-muted-foreground">DIRECTOR:</span>{" "}
                        <span className="text-foreground">{director}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
