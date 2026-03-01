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
  Airplay,
  PictureInPicture2,
  Settings,
  Gauge,
  ChevronDown
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

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

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
  const ignoreInitialTimeUpdateRef = useRef(false);
  const lastReportedTimeRef = useRef(0);
  const lastReportedDurationRef = useRef(0);
  const closingRef = useRef(false);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | "center" }>({ time: 0, side: "center" });
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [savedSpeed, setSavedSpeed] = useState(1);
  const isLongPressingRef = useRef(false);
  const savedSpeedRef = useRef(1);
  const [showGestureHints, setShowGestureHints] = useState(false);
  const gestureHintsShownRef = useRef(false);
  
  // Swipe gesture state (brightness left, volume right)
  const [brightness, setBrightness] = useState(1);
  const [swipeIndicator, setSwipeIndicator] = useState<{ side: "left" | "right"; value: number } | null>(null);
  const swipeRef = useRef<{ startY: number; startX: number; side: "left" | "right" | null; startValue: number; active: boolean }>({
    startY: 0, startX: 0, side: null, startValue: 0, active: false
  });
  const swipeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Double-tap skip animation state
  const [skipAnimation, setSkipAnimation] = useState<{
    side: "left" | "right";
    seconds: number;
    key: number;
  } | null>(null);

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
    if (!isOpen || !videoRef.current) return;
    const video = videoRef.current;
    ignoreInitialTimeUpdateRef.current = startTime > 0;
    if (startTime <= 0) { setCurrentTime(0); return; }
    const seekToStart = () => {
      if (!isNaN(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(startTime, video.duration);
        setCurrentTime(Math.min(startTime, video.duration));
      }
    };
    if (video.readyState >= 1 && video.duration > 0) {
      seekToStart();
    } else {
      video.addEventListener("loadedmetadata", seekToStart);
      return () => video.removeEventListener("loadedmetadata", seekToStart);
    }
  }, [isOpen, startTime]);

  // Pause video when closing
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Reset state every time player opens
  useEffect(() => {
    if (isOpen) {
      closingRef.current = false;
      lastReportedTimeRef.current = 0;
      lastReportedDurationRef.current = 0;
      setShowSpeedMenu(false);
      setIsLongPressing(false);
      isLongPressingRef.current = false;
      setPlaybackSpeed(1);
      savedSpeedRef.current = 1;
    }
  }, [isOpen, videoUrl]);

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    setShowSpeedMenu(false);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPlaying, resetControlsTimeout]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": e.preventDefault(); skip(-10); break;
        case "ArrowRight": e.preventDefault(); skip(10); break;
        case "m": e.preventDefault(); toggleMute(); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case "j": e.preventDefault(); skip(-10); break;
        case "l": e.preventDefault(); skip(10); break;
        case ",": e.preventDefault(); cycleSpeed(-1); break;
        case ".": e.preventDefault(); cycleSpeed(1); break;
        case "p": e.preventDefault(); togglePiP(); break;
        case "Escape":
          if (isFullscreen) exitFullscreen();
          else handleClose();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, isPlaying, playbackSpeed]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
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
        if (containerRef.current.requestFullscreen) await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) { console.error("Fullscreen error:", err); }
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      setIsFullscreen(false);
    } catch (err) { console.error("Exit fullscreen error:", err); }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Playback speed controls
  const cycleSpeed = (direction: number) => {
    const currentIdx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIdx = Math.max(0, Math.min(currentIdx + direction, PLAYBACK_SPEEDS.length - 1));
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIdx]);
  };

  // Picture-in-Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.log("PiP not supported");
    }
  };

  // Long-press for 2x speed — use refs to avoid stale closures
  const handleLongPressStart = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      if (videoRef.current) {
        savedSpeedRef.current = videoRef.current.playbackRate;
        setSavedSpeed(videoRef.current.playbackRate);
        setPlaybackSpeed(2);
        isLongPressingRef.current = true;
        setIsLongPressing(true);
      }
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressingRef.current) {
      setPlaybackSpeed(savedSpeedRef.current);
      isLongPressingRef.current = false;
      setIsLongPressing(false);
    }
  }, []);

  // Swipe gesture handlers for brightness (left) / volume (right)
  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeX = (touch.clientX - rect.left) / rect.width;
    // Only activate on the outer thirds
    const side: "left" | "right" | null = relativeX < 0.35 ? "left" : relativeX > 0.65 ? "right" : null;
    swipeRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      side,
      startValue: side === "left" ? brightness : volume,
      active: false,
    };
  }, [brightness, volume]);

  const handleSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !swipeRef.current.side) return;
    const touch = e.touches[0];
    const deltaY = swipeRef.current.startY - touch.clientY;
    const deltaX = Math.abs(touch.clientX - swipeRef.current.startX);
    
    // Require vertical movement to exceed horizontal to activate
    if (!swipeRef.current.active) {
      if (Math.abs(deltaY) < 15) return; // dead zone
      if (deltaX > Math.abs(deltaY)) { swipeRef.current.side = null; return; } // horizontal — ignore
      swipeRef.current.active = true;
    }
    
    // Scale: full container height = full range (0 to 1)
    const containerHeight = (e.currentTarget as HTMLElement).getBoundingClientRect().height;
    const change = deltaY / (containerHeight * 0.6);
    const newValue = Math.max(0, Math.min(1, swipeRef.current.startValue + change));
    
    if (swipeRef.current.side === "right") {
      if (videoRef.current) {
        videoRef.current.volume = newValue;
        videoRef.current.muted = newValue === 0;
      }
      setVolume(newValue);
      setIsMuted(newValue === 0);
      setSwipeIndicator({ side: "right", value: newValue });
    } else {
      setBrightness(newValue);
      setSwipeIndicator({ side: "left", value: newValue });
    }
    
    // Clear any existing dismiss timeout
    if (swipeIndicatorTimeoutRef.current) clearTimeout(swipeIndicatorTimeoutRef.current);
  }, []);

  const handleSwipeTouchEnd = useCallback(() => {
    if (swipeRef.current.active) {
      // Keep indicator visible briefly after release
      swipeIndicatorTimeoutRef.current = setTimeout(() => setSwipeIndicator(null), 800);
    }
    swipeRef.current = { startY: 0, startX: 0, side: null, startValue: 0, active: false };
  }, []);

  // Double-tap to skip ±10s
  const handleVideoAreaTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number;
    if ('touches' in e) {
      if (e.touches.length > 0) clientX = e.touches[0].clientX;
      else if ((e as React.TouchEvent).changedTouches.length > 0) clientX = (e as React.TouchEvent).changedTouches[0].clientX;
      else return;
    } else {
      clientX = e.clientX;
    }
    
    const relativeX = (clientX - rect.left) / rect.width;
    const side: "left" | "right" | "center" = relativeX < 0.35 ? "left" : relativeX > 0.65 ? "right" : "center";
    
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current.time;
    const sameSide = lastTapRef.current.side === side;
    
    if (timeSinceLastTap < 350 && sameSide && side !== "center") {
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
      const skipSeconds = side === "left" ? -10 : 10;
      skip(skipSeconds);
      setSkipAnimation({ side, seconds: Math.abs(skipSeconds), key: now });
      lastTapRef.current = { time: 0, side: "center" };
    } else {
      lastTapRef.current = { time: now, side };
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
      doubleTapTimerRef.current = setTimeout(() => {
        setShowControls(prev => !prev);
      }, 300);
    }
  }, [duration]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const nextTime = videoRef.current.currentTime;
      const nextDuration = videoRef.current.duration;
      setCurrentTime(nextTime);
      if (ignoreInitialTimeUpdateRef.current && startTime > 0 && nextTime < Math.max(1, startTime - 1.5)) return;
      ignoreInitialTimeUpdateRef.current = false;
      if (Number.isFinite(nextDuration) && nextDuration > 0) lastReportedDurationRef.current = nextDuration;
      if (Number.isFinite(nextTime) && nextTime >= 0) lastReportedTimeRef.current = Math.max(lastReportedTimeRef.current, nextTime);
      onTimeUpdate?.(nextTime, nextDuration);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
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

  const handleProgressLeave = () => { setPreviewTime(null); };

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (videoRef.current) {
      const video = videoRef.current;
      const finalTime = Math.max(lastReportedTimeRef.current, currentTime, video.currentTime || 0);
      const finalDuration = (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0) || lastReportedDurationRef.current || duration;
      if (finalDuration > 0 && finalTime > 0) onTimeUpdate?.(finalTime, finalDuration);
      video.pause();
    }
    ignoreInitialTimeUpdateRef.current = false;
    if (isFullscreen) exitFullscreen();
    onClose();
  };

  // Time display
  const timeDisplay = showRemainingTime && duration > 0
    ? `-${formatTime(duration - currentTime)}`
    : formatTime(currentTime);
  const durationDisplay = formatTime(duration);

  // Progress percentage for custom bar
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

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
          className="relative w-full h-full flex flex-col bg-black select-none"
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Video Container */}
          <div 
            className="relative flex-1 flex items-center justify-center bg-black min-h-0"
            onClick={handleVideoAreaTap}
            onTouchEnd={(e) => { handleVideoAreaTap(e); handleSwipeTouchEnd(); }}
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onTouchStart={(e) => { handleLongPressStart(); handleSwipeTouchStart(e); }}
            onTouchMove={handleSwipeTouchMove}
            onTouchCancel={() => { handleLongPressEnd(); handleSwipeTouchEnd(); }}
          >
            {/* Brightness overlay */}
            {brightness < 1 && (
              <div 
                className="absolute inset-0 bg-black pointer-events-none z-[5]"
                style={{ opacity: 1 - brightness }}
              />
            )}

            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onPlay={() => {
                setIsPlaying(true);
                if (!gestureHintsShownRef.current && !localStorage.getItem("sp_gesture_hints_seen")) {
                  gestureHintsShownRef.current = true;
                  setShowGestureHints(true);
                  setTimeout(() => setShowGestureHints(false), 4000);
                  localStorage.setItem("sp_gesture_hints_seen", "1");
                }
              }}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
            />

            {/* Buffering — pulsing ring */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-[3px] border-primary/30 border-t-primary animate-spin" />
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-[3px] border-transparent border-b-primary/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
              </div>
            )}

            {/* Swipe gesture indicator — vertical bar */}
            {swipeIndicator && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 animate-in fade-in duration-150",
                swipeIndicator.side === "left" ? "left-5" : "right-5"
              )}>
                <div className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10">
                  {swipeIndicator.side === "left" ? (
                    <svg className="w-5 h-5 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    isMuted || swipeIndicator.value === 0 ? (
                      <VolumeX className="w-5 h-5 text-white/90" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-white/90" />
                    )
                  )}
                  {/* Vertical bar */}
                  <div className="relative w-1 h-24 rounded-full bg-white/20 overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 right-0 rounded-full bg-white transition-all duration-75"
                      style={{ height: `${swipeIndicator.value * 100}%` }}
                    />
                  </div>
                  <span className="text-white text-[10px] font-bold tabular-nums">{Math.round(swipeIndicator.value * 100)}%</span>
                </div>
              </div>
            )}

            {/* Long-press 2x speed indicator — frosted pill */}
            {isLongPressing && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
                  <Gauge className="w-4 h-4 text-primary" />
                  <span className="text-primary text-sm font-bold tracking-wide">2× Speed</span>
                </div>
              </div>
            )}

            {/* Double-tap skip animation */}
            {skipAnimation && (
              <DoubleTapRipple
                key={skipAnimation.key}
                side={skipAnimation.side}
                seconds={skipAnimation.seconds}
                onDone={() => setSkipAnimation(null)}
              />
            )}

            {/* Gesture hints overlay */}
            {showGestureHints && (
              <div className="absolute inset-0 z-40 pointer-events-none animate-in fade-in duration-500">
                {/* Left hint — swipe + double tap */}
                <div className="absolute left-[12%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-8 h-8 rounded-full border-2 border-white/40 animate-ping" style={{ animationDuration: '1.5s' }} />
                    <div className="w-8 h-8 rounded-full border-2 border-white/40 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/10">
                    <p className="text-white text-[11px] font-semibold text-center">Double tap<br/><span className="text-white/60 font-normal">to rewind 10s</span></p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/10">
                    <p className="text-white text-[11px] font-semibold text-center">Swipe up/down<br/><span className="text-white/60 font-normal">for brightness</span></p>
                  </div>
                </div>

                {/* Right hint — swipe + double tap */}
                <div className="absolute right-[12%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-8 h-8 rounded-full border-2 border-white/40 animate-ping" style={{ animationDuration: '1.5s' }} />
                    <div className="w-8 h-8 rounded-full border-2 border-white/40 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/10">
                    <p className="text-white text-[11px] font-semibold text-center">Double tap<br/><span className="text-white/60 font-normal">to skip 10s</span></p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/10">
                    <p className="text-white text-[11px] font-semibold text-center">Swipe up/down<br/><span className="text-white/60 font-normal">for volume</span></p>
                  </div>
                </div>

                {/* Center hint — long press */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[25%] flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-white/20 animate-pulse" />
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/10">
                    <p className="text-white text-[11px] font-semibold text-center">Long press<br/><span className="text-white/60 font-normal">for 2× speed</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Center play button — glass morphism */}
            <div 
              className={cn(
                "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500",
                showControls && !isPlaying && !isBuffering ? "opacity-100 scale-100" : "opacity-0 scale-90"
              )}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="w-[72px] h-[72px] rounded-full bg-white/15 backdrop-blur-xl border border-white/20 flex items-center justify-center pointer-events-auto hover:bg-white/25 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </button>
            </div>

            {/* Top bar — frosted glass */}
            <div className={cn(
              "absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-3 md:px-5 md:py-4 transition-all duration-500",
              showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
            )}>
              {/* Back button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/15 active:scale-90 transition-all duration-200 pointer-events-auto"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>

              {/* Title — center on mobile */}
              <div className="flex-1 mx-3 md:hidden">
                <p className="text-white/90 text-sm font-semibold text-center truncate">{title}</p>
              </div>

              {/* Top-right actions */}
              <div className="flex items-center gap-1.5">
                {playbackSpeed !== 1 && (
                  <span className="px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-xl text-primary text-xs font-bold border border-primary/30">
                    {playbackSpeed}×
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                  className="hidden md:flex p-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/15 transition-all pointer-events-auto"
                >
                  <PictureInPicture2 className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>

            {/* Speed menu — centered frosted panel */}
            {showSpeedMenu && (
              <div 
                className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(false); }}
              >
                <div 
                  className="bg-black/70 backdrop-blur-2xl rounded-3xl border border-white/10 p-3 min-w-[220px] shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-bold text-white/50 uppercase tracking-widest px-4 pt-2 pb-3">Speed</p>
                  <div className="space-y-0.5">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          setShowSpeedMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
                          speed === playbackSpeed
                            ? "bg-primary/20 text-primary"
                            : "text-white/80 hover:bg-white/10 active:bg-white/15"
                        )}
                      >
                        <span>{speed === 1 ? "Normal" : `${speed}×`}</span>
                        {speed === playbackSpeed && (
                          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ Bottom Controls ═══ */}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 z-30 transition-all duration-500 pointer-events-auto",
                showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />

              <div className="relative px-3 md:px-5 pb-4 md:pb-5 pt-16">

                {/* Progress bar */}
                <div 
                  className="relative mb-3 md:mb-4 group/progress"
                  onMouseMove={handleProgressHover}
                  onMouseLeave={handleProgressLeave}
                >
                  {/* Hover time preview */}
                  {previewTime !== null && (
                    <div 
                      className="absolute bottom-6 -translate-x-1/2 pointer-events-none z-10 animate-in fade-in duration-100"
                      style={{ left: previewPosition }}
                    >
                      <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-xl border border-white/10 shadow-lg">
                        <span className="text-white text-xs font-bold tabular-nums">{formatTime(previewTime)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Custom progress track */}
                  <div className="relative w-full h-[3px] group-hover/progress:h-[5px] transition-all duration-200 rounded-full overflow-visible cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = x / rect.width;
                      handleSeek([pct * duration]);
                    }}
                  >
                    {/* Background track */}
                    <div className="absolute inset-0 rounded-full bg-white/20" />
                    {/* Buffered (fake for now) */}
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white/10" style={{ width: `${Math.min(progressPercent + 15, 100)}%` }} />
                    {/* Played */}
                    <div className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-100" style={{ width: `${progressPercent}%` }}>
                      {/* Glow */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
                    </div>
                    {/* Thumb dot */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0 h-0 group-hover/progress:w-[14px] group-hover/progress:h-[14px] rounded-full bg-primary border-2 border-white shadow-lg transition-all duration-200 z-10"
                      style={{ left: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between gap-1">
                  {/* Left controls */}
                  <div className="flex items-center gap-0.5 md:gap-1">
                    {/* Play/Pause */}
                    <button 
                      onClick={togglePlay}
                      className="p-2 md:p-2.5 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-200"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 md:w-7 md:h-7 text-white" />
                      ) : (
                        <Play className="w-6 h-6 md:w-7 md:h-7 text-white fill-white" />
                      )}
                    </button>
                    
                    {/* Skip -10 */}
                    <button 
                      onClick={() => skip(-10)}
                      className="relative p-2 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-200"
                    >
                      <RotateCcw className="w-5 h-5 text-white/90" />
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90 mt-[1px]">10</span>
                    </button>
                    
                    {/* Skip +10 */}
                    <button 
                      onClick={() => skip(10)}
                      className="relative p-2 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-200"
                    >
                      <RotateCw className="w-5 h-5 text-white/90" />
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90 mt-[1px]">10</span>
                    </button>

                    {/* Volume — desktop expandable */}
                    <div className="hidden md:flex items-center gap-1 group/volume">
                      <button 
                        onClick={toggleMute}
                        className="p-2.5 hover:bg-white/10 rounded-full transition-colors"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-5 h-5 text-white/80" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-white/80" />
                        )}
                      </button>
                      <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 ease-out">
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={1}
                          step={0.01}
                          onValueChange={handleVolumeChange}
                          className="w-20 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_.relative]:h-1 [&_.relative]:rounded-full [&_.relative]:bg-white/20 [&_[data-state]]:bg-white"
                        />
                      </div>
                    </div>

                    {/* Time — tappable on mobile */}
                    <button 
                      className="text-white/70 text-xs tabular-nums ml-1 hover:text-white/90 transition-colors"
                      onClick={() => setShowRemainingTime(!showRemainingTime)}
                    >
                      <span className="text-white/90 font-medium">{timeDisplay}</span>
                      <span className="mx-1 text-white/40">/</span>
                      <span>{durationDisplay}</span>
                    </button>
                  </div>

                  {/* Center title — desktop */}
                  <div className="hidden md:flex items-center justify-center flex-1 min-w-0 px-4">
                    <span className="text-white/70 text-sm font-medium truncate">{title}</span>
                  </div>

                  {/* Right controls */}
                  <div className="flex items-center gap-0.5 md:gap-1">
                    {/* Speed */}
                    <button 
                      onClick={() => setShowSpeedMenu(true)}
                      className="p-2 md:p-2.5 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-200"
                      title="Playback speed"
                    >
                      <Settings className="w-5 h-5 text-white/80" />
                    </button>

                    {/* Orientation lock — mobile only */}
                    <button 
                      onClick={toggleOrientation}
                      className="md:hidden p-2 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-200"
                    >
                      <ScreenShare className={cn(
                        "w-5 h-5 text-white/80 transition-transform duration-300",
                        isLandscape ? "rotate-0" : "rotate-90"
                      )} />
                    </button>

                    {/* Next — desktop */}
                    <button 
                      className="hidden md:flex p-2.5 hover:bg-white/10 rounded-full transition-colors"
                      title="Next"
                    >
                      <SkipForward className="w-5 h-5 text-white/80" />
                    </button>

                    {/* Cast — desktop */}
                    <button 
                      className="hidden md:flex p-2.5 hover:bg-white/10 rounded-full transition-colors"
                      title="Cast"
                    >
                      <Airplay className="w-5 h-5 text-white/80" />
                    </button>
                    
                    {/* Fullscreen */}
                    <button 
                      onClick={toggleFullscreen}
                      className="p-2 md:p-2.5 hover:bg-white/10 active:scale-90 rounded-full transition-all duration-200"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5 text-white/80" />
                      ) : (
                        <Maximize className="w-5 h-5 text-white/80" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Movie Info Panel */}
          {!isFullscreen && movie && (
            <div className="flex-shrink-0 bg-gradient-to-t from-card to-card/95 border-t border-white/5 px-4 py-4 md:px-6 md:py-5">
              <div className="flex gap-4 md:gap-6 max-w-6xl mx-auto">
                {posterUrl && (
                  <div className="hidden sm:block w-16 md:w-24 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-foreground">
                        {title}
                        {year && <span className="text-muted-foreground font-normal ml-2 text-sm">{year}</span>}
                      </h3>
                      {description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 max-w-2xl leading-relaxed">{description}</p>
                      )}
                    </div>
                    {genres.length > 0 && (
                      <div className="hidden md:flex flex-wrap gap-2">
                        {genres.slice(0, 3).map((genre) => (
                          <span key={genre} className="px-3 py-1 text-[10px] font-bold rounded-full bg-primary/10 text-primary/80 border border-primary/20 uppercase tracking-wider">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hidden md:flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    {cast.length > 0 && (
                      <p>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Stars</span>{" "}
                        <span className="text-foreground">{(cast as CastMember[]).slice(0, 4).map(c => c.name).join(", ")}</span>
                      </p>
                    )}
                    {director && (
                      <p>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">Director</span>{" "}
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

/** Double-tap ripple animation component */
function DoubleTapRipple({ side, seconds, onDone }: { side: "left" | "right"; seconds: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 w-[40%] z-30 pointer-events-none flex items-center",
        side === "left" ? "left-0 justify-center rounded-r-[50%]" : "right-0 justify-center rounded-l-[50%]"
      )}
    >
      <div className={cn(
        "absolute inset-0 animate-in fade-in-0 duration-200",
        side === "left" ? "rounded-r-[50%]" : "rounded-l-[50%]"
      )} 
        style={{ background: "radial-gradient(circle at center, rgba(255,255,255,0.12) 0%, transparent 70%)" }}
      />
      <div className="flex flex-col items-center gap-1.5 animate-in zoom-in-75 duration-200">
        {side === "left" ? (
          <RotateCcw className="w-7 h-7 text-white drop-shadow-lg" />
        ) : (
          <RotateCw className="w-7 h-7 text-white drop-shadow-lg" />
        )}
        <span className="text-white text-xs font-bold drop-shadow-lg tracking-wide">{seconds}s</span>
      </div>
    </div>
  );
}
