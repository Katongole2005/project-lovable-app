import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { X, Play, Pause, ChevronDown, Maximize, Minimize, SkipForward, SkipBack, RotateCcw, Volume2, VolumeX, Settings, Monitor, Timer, Cast, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { buildPlaybackRecoveryUrl, getImageUrl } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { incrementUserStat } from "@/lib/stats";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Movie, Series, SubtitleTrack, SkipSegment } from "@/types/movie";

interface CinematicVideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  movie?: Movie | Series | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startTime?: number;
  skipSegments?: SkipSegment[];
  onPlayNext?: () => void;
  hasNextEpisode?: boolean;
}


const ControlTooltip = ({ children, content, side = "top" as const }: { children: React.ReactNode, content: string, side?: "top" | "bottom" | "left" | "right" }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {children}
    </TooltipTrigger>
    <TooltipContent side={side} className="bg-zinc-900 text-white border-zinc-800 text-[11px] font-medium px-2 py-1">
      {content}
    </TooltipContent>
  </Tooltip>
);

const formatRuntimeLabel = (minutes?: number) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

type PosterGradient = {
  top: string;
  middle: string;
  bottom: string;
  surface: string;
};

const fallbackPosterGradient: PosterGradient = {
  top: "rgba(0,0,0,0.24)",
  middle: "rgba(0,0,0,0.10)",
  bottom: "rgba(0,0,0,0.88)",
  surface: "#05070d",
};

const toRgba = (color: { r: number; g: number; b: number }, alpha: number) =>
  `rgba(${color.r},${color.g},${color.b},${alpha})`;

const mixWithBlack = (color: { r: number; g: number; b: number }, amount: number) => ({
  r: Math.round(color.r * (1 - amount)),
  g: Math.round(color.g * (1 - amount)),
  b: Math.round(color.b * (1 - amount)),
});

const extractPosterGradient = (imageUrl: string): Promise<PosterGradient | null> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = 24;
        const height = 36;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        const pixels = ctx.getImageData(0, 0, width, height).data;

        const sampleBand = (fromY: number, toY: number) => {
          let r = 0;
          let g = 0;
          let b = 0;
          let total = 0;

          for (let y = fromY; y < toY; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const index = (y * width + x) * 4;
              const alpha = pixels[index + 3];
              if (alpha < 150) continue;

              const pr = pixels[index];
              const pg = pixels[index + 1];
              const pb = pixels[index + 2];
              const max = Math.max(pr, pg, pb);
              const min = Math.min(pr, pg, pb);
              const saturation = max === 0 ? 0 : (max - min) / max;
              const brightness = max / 255;
              const weight = 0.55 + saturation * 1.7 + Math.max(0, brightness - 0.18);

              r += pr * weight;
              g += pg * weight;
              b += pb * weight;
              total += weight;
            }
          }

          if (!total) return { r: 6, g: 8, b: 14 };

          return {
            r: Math.round(r / total),
            g: Math.round(g / total),
            b: Math.round(b / total),
          };
        };

        const topColor = sampleBand(0, Math.floor(height * 0.35));
        const middleColor = sampleBand(Math.floor(height * 0.35), Math.floor(height * 0.68));
        const bottomColor = sampleBand(Math.floor(height * 0.68), height);
        const surfaceColor = mixWithBlack(bottomColor, 0.72);

        resolve({
          top: toRgba(mixWithBlack(topColor, 0.18), 0.36),
          middle: toRgba(mixWithBlack(middleColor, 0.1), 0.18),
          bottom: toRgba(surfaceColor, 0.96),
          surface: `rgb(${surfaceColor.r},${surfaceColor.g},${surfaceColor.b})`,
        });
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });
};

export function CinematicVideoPlayer({
  isOpen,
  onClose,
  videoUrl,
  title,
  movie,
  onTimeUpdate,
  startTime = 0,
  onPlayNext,
  hasNextEpisode = false,
}: CinematicVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [sessionTitle, setSessionTitle] = useState(title);
  const [sessionMovie, setSessionMovie] = useState<Movie | Series | null>(movie ?? null);
  
  // Custom Controls State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState(videoUrl);
  const [resumeTime, setResumeTime] = useState(startTime);
  const [hasRetriedPlayback, setHasRetriedPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isPipAvailable, setIsPipAvailable] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hasNextButtonVisible, setHasNextButtonVisible] = useState(false);
  const [showSplashDetails, setShowSplashDetails] = useState(false);
  const [posterGradient, setPosterGradient] = useState<PosterGradient>(fallbackPosterGradient);
  const [tapSide, setTapSide] = useState<'left' | 'right' | 'center' | null>(null);
  const [lastTapTime, setLastTapTime] = useState(0);
  const { user } = useAuth();
  
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSessionKeyRef = useRef("");
  const pauseRequestedRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  const watchStatSecondsRef = useRef(0);
  const lastTrackedPlaybackTimeRef = useRef<number | null>(null);
  const iframeStatTimestampRef = useRef<number | null>(null);

  const activeTitle = sessionTitle || title;
  const activeMovie = sessionMovie ?? movie ?? null;
  const posterUrl = activeMovie?.image_url ? getImageUrl(activeMovie.image_url) : null;
  const year = activeMovie?.year;
  const genres = activeMovie?.genres || [];
  const runtimeLabel = formatRuntimeLabel(activeMovie?.runtime_minutes);
  const rating = activeMovie?.views ? Math.min(4.5 + (activeMovie.views / 100000) * 0.5, 5).toFixed(1) : "4.5";
  const primaryGenre = genres[0] || (activeMovie?.type === "series" ? "Series" : "Movie");
  const isEmbeddableVideo = /youtube\.com|youtu\.be|drive\.google\.com|vimeo\.com/i.test(activeVideoUrl);
  const useNativeVideoControls = false; // Always use custom UI for direct video files
  const controlsHideDelayMs = isTouchDevice ? 3500 : 3000;
  const sessionKey = `${videoUrl}|${startTime}|${movie?.mobifliks_id ?? ""}`;
  const splashGradientStyle = {
    "--poster-gradient-top": posterGradient.top,
    "--poster-gradient-middle": posterGradient.middle,
    "--poster-gradient-bottom": posterGradient.bottom,
    "--poster-gradient-surface": posterGradient.surface,
  } as CSSProperties;

  const shouldUseMobilePosterIntro = useCallback(() => {
    if (typeof window === "undefined") return false;
    return (
      window.innerWidth < 768 ||
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  const flushWatchStats = useCallback(() => {
    if (!user?.id) return;

    const minutes = Math.floor(watchStatSecondsRef.current / 60);
    if (minutes <= 0) return;

    watchStatSecondsRef.current -= minutes * 60;
    void incrementUserStat(user.id, 'watch_time', minutes);
    void incrementUserStat(user.id, 'activity_points', minutes * 10);
  }, [user?.id]);

  const beginPlayback = useCallback(() => {
    pauseRequestedRef.current = false;
    setHasEnded(false);
    setIsPaused(false);
    setIsPlaying(true);
    setIsBuffering(true);
    setShowControls(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (lastSessionKeyRef.current === sessionKey) return;
    lastSessionKeyRef.current = sessionKey;
    setSessionTitle(title);
    setSessionMovie(movie ?? null);
  }, [isOpen, movie, sessionKey, title]);

  useEffect(() => {
    watchStatSecondsRef.current = 0;
    lastTrackedPlaybackTimeRef.current = null;
    iframeStatTimestampRef.current = null;
  }, [isOpen, sessionKey]);

  useEffect(() => {
    if (!isOpen || !user?.id || !isPlaying || isPaused || hasEnded) {
      lastTrackedPlaybackTimeRef.current = videoRef.current?.currentTime ?? null;
      iframeStatTimestampRef.current = null;
      return;
    }

    const trackWatchedSeconds = (includeCurrentSnapshot = false) => {
      if (isEmbeddableVideo) {
        if (isBuffering) {
          iframeStatTimestampRef.current = null;
          return;
        }

        const now = Date.now();
        const previous = iframeStatTimestampRef.current ?? now;
        iframeStatTimestampRef.current = now;
        const elapsedSeconds = (now - previous) / 1000;

        if (elapsedSeconds > 0 && elapsedSeconds < 45) {
          watchStatSecondsRef.current += elapsedSeconds;
        }
      } else {
        const video = videoRef.current;

        if (!video || video.ended || video.seeking || video.readyState < 2 || (!includeCurrentSnapshot && video.paused)) {
          lastTrackedPlaybackTimeRef.current = video?.currentTime ?? null;
          return;
        }

        const playbackTime = video.currentTime;
        const previous = lastTrackedPlaybackTimeRef.current;
        lastTrackedPlaybackTimeRef.current = playbackTime;

        if (previous === null) return;

        const elapsedSeconds = playbackTime - previous;
        if (elapsedSeconds > 0 && elapsedSeconds < 45) {
          watchStatSecondsRef.current += elapsedSeconds;
        }
      }

      flushWatchStats();
    };

    trackWatchedSeconds();
    const interval = window.setInterval(trackWatchedSeconds, 15000);

    return () => {
      window.clearInterval(interval);
      trackWatchedSeconds(true);
    };
  }, [activeVideoUrl, flushWatchStats, hasEnded, isBuffering, isEmbeddableVideo, isOpen, isPaused, isPlaying, user?.id]);

  useEffect(() => {
    if (!isOpen || !activeVideoUrl || !isPlaying) return;
    setIsBuffering(true);
  }, [activeVideoUrl, isOpen, isPlaying]);

  useEffect(() => {
    if (!isOpen || !activeVideoUrl || isEmbeddableVideo || isPlaying) return;

    // Desktop starts quickly; mobile gets the poster-first intro after quality selection.
    if (shouldUseMobilePosterIntro()) return;
    beginPlayback();
  }, [activeVideoUrl, beginPlayback, isEmbeddableVideo, isOpen, isPlaying, shouldUseMobilePosterIntro]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const updateTouchDevice = () => {
      setIsTouchDevice(
        coarsePointerQuery.matches ||
        window.innerWidth < 768 ||
        navigator.maxTouchPoints > 0
      );
    };

    updateTouchDevice();
    window.addEventListener("resize", updateTouchDevice, { passive: true });
    coarsePointerQuery.addEventListener("change", updateTouchDevice);

    return () => {
      window.removeEventListener("resize", updateTouchDevice);
      coarsePointerQuery.removeEventListener("change", updateTouchDevice);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !isEmbeddableVideo) return;

    const timeoutId = window.setTimeout(() => {
      setIsBuffering(false);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [activeVideoUrl, isEmbeddableVideo, isPlaying, resumeTime]);

  useEffect(() => {
    let isCancelled = false;
    setPosterGradient(fallbackPosterGradient);

    if (!posterUrl) return;

    extractPosterGradient(posterUrl).then((gradient) => {
      if (isCancelled) return;
      setPosterGradient(gradient ?? fallbackPosterGradient);
    });

    return () => {
      isCancelled = true;
    };
  }, [posterUrl]);

  // Handle PiP availability and state
  useEffect(() => {
    if (typeof document === "undefined" || isEmbeddableVideo) return;
    
    const checkPip = () => {
      setIsPipAvailable(document.pictureInPictureEnabled && !!videoRef.current);
    };
    
    checkPip();
    
    const video = videoRef.current;
    if (video) {
      const onEnterPip = () => setIsPipActive(true);
      const onLeavePip = () => setIsPipActive(false);
      video.addEventListener("enterpictureinpicture", onEnterPip);
      video.addEventListener("leavepictureinpicture", onLeavePip);
      return () => {
        video.removeEventListener("enterpictureinpicture", onEnterPip);
        video.removeEventListener("leavepictureinpicture", onLeavePip);
      };
    }
  }, [isEmbeddableVideo, isPlaying]);

  // Reset state when player opens/closes or URL changes
  useEffect(() => {
    if (isOpen) {
      lastSessionKeyRef.current = sessionKey;
      pauseRequestedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setHasEnded(false);
      setShowControls(true);
      setCurrentTime(startTime);
      setActiveVideoUrl(videoUrl);
      setResumeTime(startTime);
      setHasRetriedPlayback(false);
      setPlaybackError(null);
      setDuration(0);
      setIsBuffering(false);
      setIsSeeking(false);
      setShowSplashDetails(false);
    } else {
      lastSessionKeyRef.current = "";
      pauseRequestedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setHasEnded(false);
      setCurrentTime(0);
      setActiveVideoUrl(videoUrl);
      setResumeTime(startTime);
      setHasRetriedPlayback(false);
      setPlaybackError(null);
      setDuration(0);
      setIsBuffering(false);
      setIsSeeking(false);
      setShowSplashDetails(false);
    }
  }, [isOpen, startTime, videoUrl]);

  // Auto-hide controls — shows for 4s then fades out
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (useNativeVideoControls) return;
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), controlsHideDelayMs);
  }, [controlsHideDelayMs, useNativeVideoControls]);

  // When playback begins, show controls briefly so the user sees back/close
  useEffect(() => {
    if (!isPlaying) return;
    if (useNativeVideoControls) {
      setShowControls(true);
      return;
    }
    if (isPaused) {
      setShowControls(true);
      return;
    }
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPaused, isPlaying, resetControlsTimeout, useNativeVideoControls]);

  // Fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      try { await containerRef.current.requestFullscreen(); setIsFullscreen(true); } catch { /* */ }
    } else {
      try { await document.exitFullscreen(); setIsFullscreen(false); } catch { /* */ }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const handleClose = useCallback(() => {
    if (isFullscreen) { document.exitFullscreen().catch(() => {}); }
    onClose();
  }, [isFullscreen, onClose]);



  const iframeSrc = isPlaying && isEmbeddableVideo
    ? (() => {
        const sep = activeVideoUrl.includes("?") ? "&" : "?";
        return activeVideoUrl + `${sep}autoplay=1${resumeTime > 0 ? `&start=${Math.floor(resumeTime)}` : ""}`;
      })()
    : undefined;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sendCommand = (type: string, val?: any) => {
    iframeRef.current?.contentWindow?.postMessage({ type, val }, "*");
  };

  const handleSeek = (values: number[]) => {
    const time = values[0];
    setCurrentTime(time);
    setResumeTime(time);
    if (isEmbeddableVideo) {
      sendCommand("seek", time);
    } else if (videoRef.current) {
      pauseRequestedRef.current = videoRef.current.paused;
      videoRef.current.currentTime = time;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(percent * duration);
    setHoverPosition(x);
  };

  function togglePlay() {
    if (!isPlaying) {
      beginPlayback();
      return;
    }

    if (!isEmbeddableVideo && videoRef.current) {
      if (videoRef.current.paused) {
        pauseRequestedRef.current = false;
        setIsPaused(false);
        setIsBuffering(videoRef.current.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
        void videoRef.current.play().catch(() => {
          setIsPaused(true);
          setIsBuffering(false);
        });
      } else {
        pauseRequestedRef.current = true;
        setIsBuffering(false);
        videoRef.current.pause();
      }
    } else if (isPaused) {
      setIsPaused(false);
      setIsBuffering(true);
      sendCommand("play");
    } else {
      setIsPaused(true);
      setIsBuffering(false);
      sendCommand("pause");
    }

    setShowControls(true);
  }

  const skip = (amount: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + amount));
    handleSeek([next]);
  };

  const handleDirectLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (resumeTime > 0 && Math.abs(video.currentTime - resumeTime) > 1) {
      video.currentTime = resumeTime;
    }
    setDuration(video.duration || 0);
    video.playbackRate = playbackRate;
  };

  const handleDirectTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Update buffered time
    if (video.buffered.length > 0) {
      const buffered = video.buffered.end(video.buffered.length - 1);
      setBufferedTime(buffered);
    }

    const now = Date.now();
    // Use faster updates for custom UI to ensure smooth progress bar
    const updateIntervalMs = 100; 
    const shouldUpdate = now - lastTimeUpdateRef.current >= updateIntervalMs;
    
    if (shouldUpdate) {
      lastTimeUpdateRef.current = now;
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
      }
      setDuration(video.duration || 0);
      onTimeUpdate?.(video.currentTime, video.duration || 0);
    }
  };

  const togglePip = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current || isEmbeddableVideo) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  // Keyboard shortcuts (Moved here to avoid TDZ issues with functions defined above)
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      // Prevent shortcut interference when typing in inputs (though there are few here)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "escape":
          if (isFullscreen) document.exitFullscreen();
          else handleClose();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "i":
          togglePip();
          break;
        case "m":
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          if (isEmbeddableVideo) sendCommand("muted", nextMuted);
          else if (videoRef.current) videoRef.current.muted = nextMuted;
          break;
        case " ":
        case "k":
          e.preventDefault();
          if (!isPlaying) beginPlayback();
          else togglePlay();
          break;
        case "l":
        case "arrowright":
          e.preventDefault();
          skip(e.key === "l" ? 10 : 5);
          break;
        case "j":
        case "arrowleft":
          e.preventDefault();
          skip(e.key === "j" ? -10 : -5);
          break;
        case "arrowup":
          e.preventDefault();
          const upVol = Math.min(1, volume + 0.05);
          setVolume(upVol);
          if (isEmbeddableVideo) sendCommand("volume", upVol);
          else if (videoRef.current) videoRef.current.volume = upVol;
          break;
        case "arrowdown":
          e.preventDefault();
          const downVol = Math.max(0, volume - 0.05);
          setVolume(downVol);
          if (isEmbeddableVideo) sendCommand("volume", downVol);
          else if (videoRef.current) videoRef.current.volume = downVol;
          break;
        case "home":
          e.preventDefault();
          handleSeek([0]);
          break;
        case "end":
          e.preventDefault();
          handleSeek([duration]);
          break;
        case ">":
        case ".":
          if (e.shiftKey || e.key === ">") {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
            const currentIndex = rates.indexOf(playbackRate);
            if (currentIndex < rates.length - 1) changePlaybackRate(rates[currentIndex + 1]);
          }
          break;
        case "<":
        case ",":
          if (e.shiftKey || e.key === "<") {
            const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
            const currentIndex = rates.indexOf(playbackRate);
            if (currentIndex > 0) changePlaybackRate(rates[currentIndex - 1]);
          }
          break;
      }

      // 0-9 for percentage seek
      if (/^[0-9]$/.test(e.key)) {
        const percent = parseInt(e.key) * 10;
        const time = (duration * percent) / 100;
        handleSeek([time]);
      }
    };
    window.addEventListener("keydown", handle);
    // Note: React hooks exhaustive-deps might complain if we don't wrap all these functions in useCallback,
    // but moving the effect below their declaration resolves the runtime crash.
    return () => window.removeEventListener("keydown", handle);
  }, [beginPlayback, handleClose, isFullscreen, isOpen, isPlaying, toggleFullscreen, togglePlay, isMuted, volume, isEmbeddableVideo, duration, playbackRate]);

  const handleDirectPlay = () => {
    pauseRequestedRef.current = false;
    setIsPaused(false);
    setHasEnded(false);
    setPlaybackError(null);
  };

  const handleDirectPause = () => {
    setIsPaused(true);
    setIsBuffering(false);
  };

  const handleDirectPlaying = () => {
    pauseRequestedRef.current = false;
    setIsPaused(false);
    setIsBuffering(false);
    setPlaybackError(null);
  };

  const handleDirectWaiting = () => {
    const video = videoRef.current;
    if (!video || video.paused || pauseRequestedRef.current) return;
    setIsBuffering(true);
  };

  const handleDirectSeeking = () => {
    const video = videoRef.current;
    if (!video || video.paused) return;
    setIsBuffering(true);
  };

  const handleDirectSeeked = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      setIsBuffering(false);
    }
  };

  const handleDirectEnded = () => {
    pauseRequestedRef.current = false;
    setHasEnded(true);
    setIsPaused(true);
    setIsBuffering(false);
  };

  const attemptPlaybackRecovery = useCallback(() => {
    if (hasRetriedPlayback) return false;

    const fallbackUrl = buildPlaybackRecoveryUrl(
      activeVideoUrl, 
      activeTitle,
      movie?.mobifliks_id,
      (movie as any)?.video_page_url || movie?.details_url
    );
    if (!fallbackUrl || fallbackUrl === activeVideoUrl) {
      return false;
    }

    const nextResumeTime = videoRef.current?.currentTime || currentTime || resumeTime || startTime;
    pauseRequestedRef.current = false;
    setHasRetriedPlayback(true);
    setPlaybackError(null);
    setIsPaused(false);
    setIsBuffering(true);
    setHasEnded(false);
    setResumeTime(nextResumeTime);
    setCurrentTime(nextResumeTime);
    setActiveVideoUrl(fallbackUrl);
    return true;
  }, [activeTitle, activeVideoUrl, currentTime, hasRetriedPlayback, resumeTime, startTime, movie]);

  const handleDirectError = () => {
    pauseRequestedRef.current = false;
    setIsPaused(true);
    setIsBuffering(false);
    if (attemptPlaybackRecovery()) {
      return;
    }
    setPlaybackError("This stream failed to load. Try replaying or switch to the other server.");
  };

  const handleRetryPlayback = () => {
    pauseRequestedRef.current = false;
    setPlaybackError(null);
    setHasRetriedPlayback(false);
    setHasEnded(false);
    setIsPaused(false);
    setIsBuffering(true);
    setActiveVideoUrl(videoUrl);
    setResumeTime(currentTime || startTime);
    setCurrentTime(currentTime || startTime);
    beginPlayback();
  };

  const handleDoubleTap = (side: 'left' | 'right' | 'center') => {
    const now = Date.now();
    resetControlsTimeout();
    
    if (now - lastTapTime < 300 && tapSide === side) {
      if (side === 'center') {
        toggleFullscreen();
      } else {
        skip(side === 'left' ? -10 : 10);
      }
      setLastTapTime(0);
      setTapSide(null);
    } else {
      setLastTapTime(now);
      setTapSide(side);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 overflow-hidden rounded-none border-none bg-[#040404] p-0 [&_.close-orb]:hidden">
        <DialogTitle className="sr-only">{activeTitle}</DialogTitle>
        <DialogDescription className="sr-only">Video player for {activeTitle}</DialogDescription>

        <div
          ref={containerRef}
          className="relative flex h-full w-full flex-col overflow-hidden bg-black select-none"
          onPointerMove={() => {
            if (!isPlaying || useNativeVideoControls) return;
            resetControlsTimeout();
          }}
          onPointerDown={(e) => {
            if (!isPlaying || useNativeVideoControls) return;
            
            // If we are clicking on a button or interactive element, don't toggle
            if ((e.target as HTMLElement).closest('button, [role="slider"], [role="menuitem"]')) return;

            if (showControls) {
              // On mobile, sometimes a tap should just reset the timer instead of hiding
              if (isTouchDevice) {
                resetControlsTimeout();
              } else {
                setShowControls(false);
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              }
            } else {
              resetControlsTimeout();
            }
          }}
          onMouseLeave={() => {
            if (!isPlaying || isTouchDevice || isPaused || useNativeVideoControls) return;
            setShowControls(false);
          }}
        >
          {/* ── PRE-PLAY SCREEN ── */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                key="splash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-end overflow-hidden bg-[var(--poster-gradient-surface)] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:justify-center"
                style={splashGradientStyle}
              >
                {/* Blurred poster background */}
                {posterUrl && (
                  <>
                    <img
                      src={posterUrl}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full object-cover md:scale-110 md:blur-2xl"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--poster-gradient-top)_0%,var(--poster-gradient-middle)_42%,var(--poster-gradient-bottom)_100%)] md:bg-[linear-gradient(180deg,rgba(0,0,0,0.64)_0%,var(--poster-gradient-middle)_42%,var(--poster-gradient-bottom)_100%)]" />
                    <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/45 to-transparent" />
                  </>
                )}
                {!posterUrl && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(19,160,255,0.45),transparent_42%),linear-gradient(180deg,#06a4df_0%,#0551b8_58%,#03143e_100%)]" />
                )}

                {/* Close button */}
                <button
                  onClick={handleClose}
                  aria-label="Close player"
                  className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/28 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all hover:bg-white/10 active:scale-95"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>

                {/* Title row */}
                <div className="pointer-events-none absolute left-0 right-0 top-[8vh] z-10 flex flex-col items-center px-8 text-center md:top-10">
                  {activeMovie?.logo_url ? (
                    <img
                      src={activeMovie.logo_url}
                      alt={activeTitle}
                      className="max-h-28 w-auto max-w-[82vw] object-contain drop-shadow-[0_10px_34px_rgba(0,0,0,0.5)] md:max-h-16"
                    />
                  ) : (
                    <h2 className="max-w-[82vw] text-5xl font-black leading-[0.92] tracking-tight text-white drop-shadow-[0_10px_34px_rgba(0,0,0,0.42)] md:text-3xl">
                      {activeTitle}
                    </h2>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 flex w-full max-w-sm flex-col items-center text-center md:max-w-md"
                >
                  <h1 className="max-w-full truncate text-[22px] font-black leading-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.42)] md:text-2xl">
                    {activeTitle}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] font-semibold text-white/82">
                    {year && <span>{year}</span>}
                    {year && <span className="text-white/45">|</span>}
                    <span>{primaryGenre}</span>
                    {runtimeLabel && <span className="text-white/45">|</span>}
                    {runtimeLabel && <span>{runtimeLabel}</span>}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={cn(
                          "h-4 w-4",
                          index < Math.round(Number(rating))
                            ? "fill-[#ff9f1c] text-[#ff9f1c]"
                            : "fill-slate-400/70 text-slate-400/70"
                        )}
                      />
                    ))}
                  </div>

                  <motion.button
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.16, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={beginPlayback}
                    aria-label={`Play ${activeTitle}`}
                    className="mt-8 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/75 text-[#6f8bc8] shadow-[0_18px_45px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-md transition-all hover:bg-white active:scale-95"
                  >
                    <Play className="ml-1 h-8 w-8 fill-current" />
                  </motion.button>

                  {activeMovie?.description && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowSplashDetails(value => !value)}
                        className="mt-8 flex flex-col items-center gap-1 text-[10px] font-semibold text-white/76 transition-colors hover:text-white"
                      >
                        <span>{showSplashDetails ? "Show Less" : "Show More"}</span>
                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSplashDetails && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {showSplashDetails && (
                          <motion.p
                            initial={{ opacity: 0, y: 8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: 8, height: 0 }}
                            className="mt-3 line-clamp-4 max-w-xs overflow-hidden text-xs font-medium leading-relaxed text-white/78"
                          >
                            {activeMovie.description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </motion.div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,var(--poster-gradient-surface)_0%,transparent_100%)] md:bg-gradient-to-t md:from-black md:to-transparent" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── IFRAME PLAYER ── */}
          {isPlaying && (
            <div className="absolute inset-0 z-10 bg-black animate-in fade-in duration-300">
                {isEmbeddableVideo ? (
                  <iframe
                    ref={iframeRef}
                    key={iframeSrc}
                    src={iframeSrc}
                    title={activeTitle}
                    onLoad={() => {
                      setIsBuffering(false);
                    }}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; web-share"
                    allowFullScreen
                    className="absolute inset-x-0 bottom-0 w-full h-full border-0 bg-black"
                    style={{ top: "-10px", height: "calc(100% + 20px)" }}
                  />
                ) : (
                    <video
                      ref={videoRef}
                      key={`${activeVideoUrl}-${resumeTime}`}
                      src={activeVideoUrl}
                      autoPlay
                      controls={useNativeVideoControls}
                      controlsList="nodownload"
                      onContextMenu={(e) => e.preventDefault()}
                      playsInline
                      preload="metadata"
                    poster={posterUrl ?? undefined}
                    className="absolute inset-0 h-full w-full bg-black object-contain"
                    onLoadedMetadata={handleDirectLoadedMetadata}
                    onLoadedData={() => setIsBuffering(false)}
                    onTimeUpdate={handleDirectTimeUpdate}
                    onCanPlay={() => setIsBuffering(false)}
                    onPlaying={handleDirectPlaying}
                    onWaiting={handleDirectWaiting}
                    onSeeking={handleDirectSeeking}
                    onSeeked={handleDirectSeeked}
                    onPlay={handleDirectPlay}
                    onPause={handleDirectPause}
                    onEnded={handleDirectEnded}
                    onError={handleDirectError}
                  />
                )}

                {/* Loading/Buffering Overlay */}
                {isBuffering && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/45 backdrop-blur-sm pointer-events-none">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <div className="text-center flex flex-col items-center gap-2">
                      <p className="text-sm font-semibold tracking-wide text-white">Loading movie...</p>
                      {activeMovie?.logo_url ? (
                        <img
                          src={activeMovie.logo_url}
                          alt={activeTitle}
                          className="h-6 w-auto max-w-full object-contain opacity-80"
                        />
                      ) : (
                        <p className="mt-1 text-xs text-white/60">{activeTitle}</p>
                      )}
                    </div>
                  </div>
                )}

                {playbackError && !isBuffering && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/72 px-6">
                    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/75 p-6 text-center shadow-2xl backdrop-blur-xl">
                      <p className="text-lg font-semibold text-white">Playback interrupted</p>
                      <p className="mt-2 text-sm text-white/68">{playbackError}</p>
                      <div className="mt-5 flex items-center justify-center gap-3">
                        <button
                          onClick={handleRetryPlayback}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Retry
                        </button>
                        <button
                          onClick={handleClose}
                          className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {useNativeVideoControls && (
                  <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between bg-gradient-to-b from-black/70 via-black/25 to-transparent px-4 pb-8 pt-4 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-3">
                      <button
                        onClick={handleClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white transition-all active:scale-95"
                        aria-label="Close player"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{activeTitle}</p>
                        <p className="truncate text-[11px] text-white/65">
                          {isBuffering ? "Preparing video..." : "Tap the video to show controls"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interaction Overlays (Always Active) - Restricted to center area to not block bars */}
                <div className="absolute inset-x-0 top-32 bottom-32 z-[45] flex pointer-events-none overflow-hidden">
                  <div 
                    className="w-1/3 h-full pointer-events-auto" 
                    onPointerDown={(e) => { e.stopPropagation(); if (isTouchDevice) handleDoubleTap('left'); }}
                    onMouseMove={resetControlsTimeout}
                  />
                  <div 
                    className="w-1/3 h-full pointer-events-auto cursor-pointer" 
                    onPointerDown={(e) => { 
                      e.stopPropagation(); 
                      resetControlsTimeout(); 
                      if (isTouchDevice) handleDoubleTap('center'); 
                    }}
                    onClick={(e) => { 
                      if (!isTouchDevice) { 
                        e.stopPropagation(); 
                        togglePlay(); 
                      } 
                    }}
                    onMouseMove={resetControlsTimeout}
                  />
                  <div 
                    className="w-1/3 h-full pointer-events-auto" 
                    onPointerDown={(e) => { e.stopPropagation(); if (isTouchDevice) handleDoubleTap('right'); }}
                    onMouseMove={resetControlsTimeout}
                  />
                </div>

                {/* Custom Overlay Controls */}
                {!useNativeVideoControls && (
                <div
                  className={cn(
                    "absolute inset-0 z-30 transition-all duration-500",
                    showControls ? "opacity-100" : "opacity-0 cursor-none"
                  )}
                >
                  {/* Top Bar (already mostly implemented, but polished) */}
                  <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-start justify-between px-6 pt-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                      <button onClick={handleClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90">
                        <ChevronDown className="h-6 w-6 text-white" />
                      </button>
                      <div>
                        <h2 className="text-white font-bold tracking-tight text-lg">{activeTitle}</h2>
                        <div className="flex items-center gap-2 text-white/50 text-[11px] font-medium uppercase tracking-wider">
                          <span>{activeMovie?.type === "series" ? "Series" : "Movie"}</span>
                          {year && <span>• {year}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={toggleFullscreen} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        {isFullscreen ? <Minimize className="h-5 w-5 text-white" /> : <Maximize className="h-5 w-5 text-white" />}
                      </button>
                    </div>
                  </div>

                  {/* Center Play Button Overlay (Visible when paused) */}
                  {!isBuffering && isPaused && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                        className="pointer-events-auto w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group shadow-2xl"
                       >
                         <Play className="w-10 h-10 text-white fill-white ml-1.5" />
                       </button>
                    </div>
                  )}

                  {/* Bottom Controls Bar */}
                  <div className="absolute inset-x-0 bottom-0 pb-10 pt-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none">
                    <div className="max-w-[1200px] mx-auto px-6 pointer-events-auto space-y-4">
                      {/* Brand Logo Overlay */}
                      {activeMovie?.logo_url && (
                        <div className="flex justify-start px-1 -mb-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <img 
                            src={activeMovie.logo_url} 
                            alt={activeTitle} 
                            className="h-10 md:h-16 w-auto max-w-[180px] md:max-w-[280px] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] opacity-90 transition-opacity hover:opacity-100" 
                          />
                        </div>
                      )}
                      
                      {/* Timeline / Seek Bar (Center Column) */}
                      <div className="flex items-center gap-3 w-full px-2">
                        <span className="text-[10px] font-medium text-white/50 tabular-nums min-w-[35px]">
                          {formatTime(currentTime)}
                        </span>
                        
                        <div 
                          className="group relative flex-1 pt-4 pb-4 cursor-pointer"
                          onMouseMove={handleMouseMove}
                          onMouseLeave={() => setHoverTime(null)}
                        >
                          {/* Hover Preview Tooltip */}
                          <AnimatePresence>
                            {hoverTime !== null && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                className="absolute bottom-full mb-4 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-white shadow-xl pointer-events-none z-50 whitespace-nowrap"
                                style={{ left: hoverPosition, transform: 'translateX(-50%)' }}
                              >
                                {formatTime(hoverTime)}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Buffered Progress Background */}
                          <div className="absolute top-[22px] left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              initial={false}
                              animate={{ width: `${(bufferedTime / (duration || 1)) * 100}%` }}
                              className="h-full bg-white/20"
                            />
                          </div>
                          
                          <Slider
                            value={[currentTime]}
                            max={duration || 100}
                            step={0.1}
                            onPointerDown={() => setIsSeeking(true)}
                            onPointerUp={() => { setIsSeeking(false); }}
                            onValueChange={handleSeek}
                            className="relative z-10 cursor-pointer"
                          />
                        </div>

                        <span className="text-[10px] font-medium text-white/50 tabular-nums min-w-[35px]">
                          {formatTime(duration)}
                        </span>
                      </div>

                      {/* Control Buttons Row */}
                      <TooltipProvider>
                        <div className="flex items-center justify-between pb-2">
                          {/* Left Group */}
                          <div className="flex items-center gap-2">
                            <ControlTooltip content={isPaused ? "Play (k)" : "Pause (k)"}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
                              >
                                {isPaused ? (
                                  <Play className="h-5 w-5 fill-white" />
                                ) : (
                                  <Pause className="h-5 w-5 fill-white" />
                                )}
                              </button>
                            </ControlTooltip>

                            <ControlTooltip content="Seek Backward 10s (j)">
                              <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90">
                                <SkipBack className="h-5 w-5 text-white/80" />
                              </button>
                            </ControlTooltip>

                            <ControlTooltip content="Seek Forward 10s (l)">
                              <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90">
                                <SkipForward className="h-5 w-5 text-white/80" />
                              </button>
                            </ControlTooltip>
                          </div>

                          {/* Right Group */}
                          <div className="flex items-center gap-1">
                            {/* Playback Speed */}
                            <div className="relative mr-1">
                              <DropdownMenu>
                                <ControlTooltip content="Playback Speed">
                                  <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-[10px] font-bold text-white/80 transition-all">
                                      <Timer className="h-4 w-4" />
                                      {playbackRate}x
                                    </button>
                                  </DropdownMenuTrigger>
                                </ControlTooltip>
                                <DropdownMenuContent side="top" className="bg-zinc-900 border-zinc-800 text-white min-w-[100px]">
                                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                    <DropdownMenuItem 
                                      key={rate} 
                                      onClick={() => changePlaybackRate(rate)}
                                      className={cn(
                                        "text-xs font-medium focus:bg-white/10 focus:text-white cursor-pointer",
                                        playbackRate === rate ? "bg-primary/20 text-primary" : "text-white/60"
                                      )}
                                    >
                                      {rate}x {rate === 1 && "(Normal)"}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Volume Popover */}
                            <div 
                              className="relative flex items-center"
                              onMouseEnter={() => setIsVolumeHovered(true)}
                              onMouseLeave={() => setIsVolumeHovered(false)}
                            >
                              <Popover open={isVolumeHovered}>
                                <ControlTooltip content="Mute (m)">
                                  <PopoverTrigger asChild>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nextMuted = !isMuted;
                                        setIsMuted(nextMuted);
                                        if (isEmbeddableVideo) sendCommand("muted", nextMuted);
                                        else if (videoRef.current) videoRef.current.muted = nextMuted;
                                      }}
                                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90"
                                    >
                                      {isMuted || volume === 0 ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5 text-white/80" />}
                                    </button>
                                  </PopoverTrigger>
                                </ControlTooltip>
                                <PopoverContent 
                                  side="top" 
                                  sideOffset={15} 
                                  className="w-10 p-3 bg-zinc-900 border-zinc-800 rounded-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                                  onMouseEnter={() => setIsVolumeHovered(true)}
                                  onMouseLeave={() => setIsVolumeHovered(false)}
                                >
                                  <div className="h-24">
                                    <Slider 
                                      orientation="vertical"
                                      value={[isMuted ? 0 : volume * 100]} 
                                      max={100} 
                                      onValueChange={(v) => {
                                        const vol = v[0] / 100;
                                        setVolume(vol);
                                        setIsMuted(vol === 0);
                                        if (isEmbeddableVideo) sendCommand("volume", vol);
                                        else if (videoRef.current) {
                                          videoRef.current.volume = vol;
                                          videoRef.current.muted = vol === 0;
                                        }
                                      }}
                                      className="h-full py-2 cursor-pointer"
                                    />
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>



                            <ControlTooltip content="Cast">
                              <button className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90 text-white/40">
                                <Cast className="h-5 w-5" />
                              </button>
                            </ControlTooltip>

                            {isPipAvailable && (
                              <ControlTooltip content="Picture in Picture (i)">
                                <button 
                                  onClick={togglePip} 
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90",
                                    isPipActive ? "text-primary" : "text-white/80 hover:bg-white/10"
                                  )}
                                >
                                  <Monitor className="h-5 w-5" />
                                </button>
                              </ControlTooltip>
                            )}

                            <ControlTooltip content={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}>
                              <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/10 active:scale-90">
                                {isFullscreen ? <Minimize className="h-5 w-5 text-white/80" /> : <Maximize className="h-5 w-5 text-white/80" />}
                              </button>
                            </ControlTooltip>
                          </div>
                        </div>
                      </TooltipProvider>


                    </div>
                  </div>
                </div>
                )}
            </div>
          )}

          {/* ── VIDEO ENDED OVERLAY ── */}
          <AnimatePresence>
            {hasEnded && isPlaying && (
              <motion.div
                key="ended"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 z-40 flex items-center justify-center bg-black/95 backdrop-blur-2xl overflow-hidden"
              >
                {posterUrl && (
                  <img src={posterUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="relative flex flex-col items-center text-center gap-8 max-w-lg px-6"
                >
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff8a3d]/80">Finished Watching</p>
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-2xl">{activeTitle}</h3>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        setHasEnded(false);
                        setIsPlaying(false);
                        setTimeout(() => beginPlayback(), 80);
                      }}
                      className="flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white shadow-2xl transition-all hover:bg-white/10 hover:scale-105 active:scale-95 group"
                    >
                      <RotateCcw className="h-5 w-5 text-white/60 group-hover:rotate-[-45deg] transition-transform" />
                      Replay
                    </button>
                    {hasNextEpisode && onPlayNext && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onPlayNext(); }}
                        className="flex h-14 items-center gap-3 rounded-2xl px-8 text-sm font-bold text-white shadow-[0_0_30px_rgba(255,138,61,0.35)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,138,61,0.5)] active:scale-95 btn-gradient-next"
                      >
                        Next Episode <SkipForward className="h-5 w-5 fill-current" />
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white/70 shadow-xl transition-all hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
                    >
                      <X className="h-5 w-5" /> Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
