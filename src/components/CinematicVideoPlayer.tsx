import { useRef, useState, useEffect, useCallback, useMemo } from "react";
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
  SkipForward,
  PictureInPicture2,
  Settings,
  Gauge,
  ChevronDown,
  Airplay,
  Keyboard,
  Captions,
  FastForward,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/api";
import type { Movie, Series, CastMember, SubtitleTrack, SkipSegment } from "@/types/movie";

interface CinematicVideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  movie?: Movie | Series | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startTime?: number;
  subtitles?: SubtitleTrack[];
  skipSegments?: SkipSegment[];
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function CinematicVideoPlayer({
  isOpen,
  onClose,
  videoUrl,
  title,
  movie,
  onTimeUpdate,
  startTime = 0,
  subtitles = [],
  skipSegments = [],
}: CinematicVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ignoreInitialTimeUpdateRef = useRef(false);
  const lastReportedTimeRef = useRef(0);
  const lastPersistedTimeRef = useRef(0);
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
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string>("off");
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);

  // Swipe gesture state
  const [brightness, setBrightness] = useState(1);
  const [swipeIndicator, setSwipeIndicator] = useState<{ side: "left" | "right"; value: number } | null>(null);
  const swipeRef = useRef<{ startY: number; startX: number; side: "left" | "right" | null; startValue: number; active: boolean }>({
    startY: 0, startX: 0, side: null, startValue: 0, active: false,
  });
  const swipeIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Double-tap skip animation
  const [skipAnimation, setSkipAnimation] = useState<{ side: "left" | "right"; seconds: number; key: number } | null>(null);

  // Buffered ranges
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // Progress bar touch drag
  const [isScrubbing, setIsScrubbing] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const toggleOrientation = useCallback(async () => {
    try {
      const screen = window.screen as any;
      if (screen.orientation?.lock) {
        if (isLandscape) { await screen.orientation.lock("portrait"); setIsLandscape(false); }
        else { await screen.orientation.lock("landscape"); setIsLandscape(true); }
      }
    } catch {
      try {
        if (containerRef.current && !document.fullscreenElement) await containerRef.current.requestFullscreen();
        const screen = window.screen as any;
        if (screen.orientation?.lock) {
          if (isLandscape) { await screen.orientation.lock("portrait"); setIsLandscape(false); }
          else { await screen.orientation.lock("landscape"); setIsLandscape(true); }
        }
      } catch { /* not supported */ }
    }
  }, [isLandscape]);

  useEffect(() => {
    const handleOrientationChange = () => {
      const screen = window.screen as any;
      setIsLandscape((screen.orientation?.type || "").includes("landscape"));
    };
    const screen = window.screen as any;
    if (screen.orientation) {
      screen.orientation.addEventListener("change", handleOrientationChange);
      return () => screen.orientation.removeEventListener("change", handleOrientationChange);
    }
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
    if (video.readyState >= 1 && video.duration > 0) seekToStart();
    else {
      video.addEventListener("loadedmetadata", seekToStart);
      return () => video.removeEventListener("loadedmetadata", seekToStart);
    }
  }, [isOpen, startTime]);

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      const video = videoRef.current;
      const finalTime = video.currentTime > 0 ? video.currentTime : (currentTime > 0 ? currentTime : lastReportedTimeRef.current);
      const finalDuration = (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0) || lastReportedDurationRef.current || duration;
      if (finalDuration > 0 && finalTime > 0 && finalTime !== lastPersistedTimeRef.current) {
        onTimeUpdate?.(finalTime, finalDuration);
        lastPersistedTimeRef.current = finalTime;
      }
      video.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      closingRef.current = false;
      lastReportedTimeRef.current = 0;
      lastPersistedTimeRef.current = 0;
      lastReportedDurationRef.current = 0;
      setShowSpeedMenu(false);
      setIsLongPressing(false);
      isLongPressingRef.current = false;
      setPlaybackSpeed(1);
      savedSpeedRef.current = 1;
      setShowSubtitlesMenu(false);
    }
  }, [isOpen, videoUrl]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  const persistProgress = useCallback((timeArg?: number, durationArg?: number) => {
    const video = videoRef.current;
    const finalTime = timeArg ?? (video?.currentTime && video.currentTime > 0 ? video.currentTime : (currentTime > 0 ? currentTime : lastReportedTimeRef.current));
    const finalDuration = durationArg ?? (((video?.duration && Number.isFinite(video.duration) && video.duration > 0) ? video.duration : 0) || lastReportedDurationRef.current || duration);
    if (finalDuration > 0 && finalTime > 0) {
      onTimeUpdate?.(finalTime, finalDuration);
      lastPersistedTimeRef.current = finalTime;
    }
  }, [currentTime, duration, onTimeUpdate]);

  const clearControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);

  const hideControlsOverlay = useCallback(() => {
    clearControlsTimeout();
    setShowControls(false);
    setShowSpeedMenu(false);
    setShowSubtitlesMenu(false);
    setShowVolumeSlider(false);
  }, [clearControlsTimeout]);

  const resetControlsTimeout = useCallback(() => {
    clearControlsTimeout();
    setShowControls(true);
    setShowSpeedMenu(false);
    setShowSubtitlesMenu(false);
    if (isPlaying && !isScrubbing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowVolumeSlider(false);
      }, 3500);
    }
  }, [clearControlsTimeout, isPlaying, isScrubbing]);

  useEffect(() => {
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPlaying, resetControlsTimeout]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": case "j": e.preventDefault(); skip(-10); break;
        case "ArrowRight": case "l": e.preventDefault(); skip(10); break;
        case "ArrowUp": e.preventDefault(); handleVolumeChange(Math.min(1, volume + 0.1)); break;
        case "ArrowDown": e.preventDefault(); handleVolumeChange(Math.max(0, volume - 0.1)); break;
        case "m": e.preventDefault(); toggleMute(); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case ",": e.preventDefault(); cycleSpeed(-1); break;
        case ".": e.preventDefault(); cycleSpeed(1); break;
        case "p": e.preventDefault(); togglePiP(); break;
        case "?": e.preventDefault(); setShowKeyboardShortcuts(v => !v); break;
        case "Escape":
          if (showKeyboardShortcuts) { setShowKeyboardShortcuts(false); break; }
          if (isFullscreen) exitFullscreen();
          else handleClose();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, isPlaying, playbackSpeed, volume, showKeyboardShortcuts]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        persistProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
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

  const handleVolumeChange = (newVolume: number) => {
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
      try { await containerRef.current.requestFullscreen(); setIsFullscreen(true); } catch { /* */ }
    } else { exitFullscreen(); }
  };

  const exitFullscreen = async () => {
    try { await document.exitFullscreen(); setIsFullscreen(false); } catch { /* */ }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const cycleSpeed = (direction: number) => {
    const currentIdx = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    setPlaybackSpeed(PLAYBACK_SPEEDS[Math.max(0, Math.min(currentIdx + direction, PLAYBACK_SPEEDS.length - 1))]);
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (videoRef.current.requestPictureInPicture) await videoRef.current.requestPictureInPicture();
    } catch { /* not supported */ }
  };

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
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (isLongPressingRef.current) {
      setPlaybackSpeed(savedSpeedRef.current);
      isLongPressingRef.current = false;
      setIsLongPressing(false);
    }
  }, []);

  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeX = (touch.clientX - rect.left) / rect.width;
    const side: "left" | "right" | null = relativeX < 0.35 ? "left" : relativeX > 0.65 ? "right" : null;
    swipeRef.current = { startY: touch.clientY, startX: touch.clientX, side, startValue: side === "left" ? brightness : volume, active: false };
  }, [brightness, volume]);

  const handleSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !swipeRef.current.side) return;
    const touch = e.touches[0];
    const deltaY = swipeRef.current.startY - touch.clientY;
    const deltaX = Math.abs(touch.clientX - swipeRef.current.startX);
    if (!swipeRef.current.active) {
      if (Math.abs(deltaY) < 15) return;
      if (deltaX > Math.abs(deltaY)) { swipeRef.current.side = null; return; }
      swipeRef.current.active = true;
    }
    const containerHeight = (e.currentTarget as HTMLElement).getBoundingClientRect().height;
    const change = deltaY / (containerHeight * 0.6);
    const newValue = Math.max(0, Math.min(1, swipeRef.current.startValue + change));
    if (swipeRef.current.side === "right") {
      if (videoRef.current) { videoRef.current.volume = newValue; videoRef.current.muted = newValue === 0; }
      setVolume(newValue); setIsMuted(newValue === 0);
      setSwipeIndicator({ side: "right", value: newValue });
    } else {
      setBrightness(newValue);
      setSwipeIndicator({ side: "left", value: newValue });
    }
    if (swipeIndicatorTimeoutRef.current) clearTimeout(swipeIndicatorTimeoutRef.current);
  }, []);

  const swipeWasActiveRef = useRef(false);

  const handleSwipeTouchEnd = useCallback(() => {
    swipeWasActiveRef.current = swipeRef.current.active;
    if (swipeRef.current.active) {
      swipeIndicatorTimeoutRef.current = setTimeout(() => setSwipeIndicator(null), 800);
    }
    swipeRef.current = { startY: 0, startX: 0, side: null, startValue: 0, active: false };
  }, []);

  const handleVideoAreaTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (swipeWasActiveRef.current) { swipeWasActiveRef.current = false; return; }
    if (isScrubbing) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let clientX: number;
    if ("touches" in e) {
      if (e.touches.length > 0) clientX = e.touches[0].clientX;
      else if ((e as React.TouchEvent).changedTouches.length > 0) clientX = (e as React.TouchEvent).changedTouches[0].clientX;
      else return;
    } else { clientX = e.clientX; }
    const relativeX = (clientX - rect.left) / rect.width;
    const side: "left" | "right" | "center" = relativeX < 0.35 ? "left" : relativeX > 0.65 ? "right" : "center";
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current.time;
    const sameSide = lastTapRef.current.side === side;
    const isTouchInteraction = "changedTouches" in e;

    if (timeSinceLastTap < 350 && sameSide && side !== "center") {
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
      const skipSeconds = side === "left" ? -10 : 10;
      skip(skipSeconds);
      resetControlsTimeout();
      setSkipAnimation({ side, seconds: Math.abs(skipSeconds), key: now });
      lastTapRef.current = { time: 0, side: "center" };
      return;
    }

    lastTapRef.current = { time: now, side };
    if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);

    if (side === "center" || isTouchInteraction) {
      if (showControls) {
        hideControlsOverlay();
      } else {
        resetControlsTimeout();
      }
      return;
    }

    doubleTapTimerRef.current = setTimeout(() => {
      if (showControls) {
        hideControlsOverlay();
      } else {
        resetControlsTimeout();
      }
    }, 300);
  }, [hideControlsOverlay, isScrubbing, resetControlsTimeout, showControls]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const nextTime = videoRef.current.currentTime;
      const nextDuration = videoRef.current.duration;
      setCurrentTime(nextTime);
      // Update buffered
      if (videoRef.current.buffered.length > 0) {
        const buffered = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBufferedPercent(nextDuration > 0 ? (buffered / nextDuration) * 100 : 0);
      }
      if (ignoreInitialTimeUpdateRef.current && startTime > 0 && nextTime < Math.max(1, startTime - 1.5)) return;
      ignoreInitialTimeUpdateRef.current = false;
      if (Number.isFinite(nextDuration) && nextDuration > 0) lastReportedDurationRef.current = nextDuration;
      if (Number.isFinite(nextTime) && nextTime >= 0) lastReportedTimeRef.current = nextTime;

      // Throttle reports to every 5 seconds or if it's nearing the end
      const timeSinceLastReport = Math.abs(nextTime - lastPersistedTimeRef.current);
      if (timeSinceLastReport >= 5 || (nextDuration > 0 && nextDuration - nextTime < 5)) {
        onTimeUpdate?.(nextTime, nextDuration);
        lastPersistedTimeRef.current = nextTime;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (pct: number) => {
    if (videoRef.current) {
      const t = pct * duration;
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  };

  const skipToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      resetControlsTimeout();
    }
  };

  const activeSkipSegment = useMemo(() => {
    return skipSegments?.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
  }, [currentTime, skipSegments]);

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setPreviewTime((x / rect.width) * duration);
    setPreviewPosition(x);
  };

  const handleProgressLeave = () => setPreviewTime(null);

  const getProgressPct = useCallback((clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const pct = getProgressPct(e.touches[0].clientX);
    setIsScrubbing(true);
    if (videoRef.current) {
      const t = pct * (videoRef.current.duration || 0);
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  }, [getProgressPct]);

  const handleProgressTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isScrubbing) return;
    e.stopPropagation();
    e.preventDefault();
    const pct = getProgressPct(e.touches[0].clientX);
    if (videoRef.current) {
      const t = pct * (videoRef.current.duration || 0);
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  }, [isScrubbing, getProgressPct]);

  const handleProgressTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsScrubbing(false);
    resetControlsTimeout();
    persistProgress();
  }, [persistProgress, resetControlsTimeout]);

  useEffect(() => {
    if (!isOpen) return;

    const flushProgress = () => persistProgress();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushProgress();
      }
    };

    window.addEventListener("pagehide", flushProgress);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushProgress);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen, persistProgress]);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (videoRef.current) {
      const video = videoRef.current;
      persistProgress(
        video.currentTime > 0 ? video.currentTime : (currentTime > 0 ? currentTime : lastReportedTimeRef.current),
        (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0) || lastReportedDurationRef.current || duration
      );
      video.pause();
    }
    ignoreInitialTimeUpdateRef.current = false;
    if (isFullscreen) exitFullscreen();
    onClose();
  };

  const handleEnded = useCallback(() => {
    if (!videoRef.current) return;
    persistProgress(videoRef.current.duration || duration, videoRef.current.duration || duration);
    setIsPlaying(false);
  }, [duration, persistProgress]);

  const timeDisplay = showRemainingTime && duration > 0 ? `-${formatTime(duration - currentTime)}` : formatTime(currentTime);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const posterUrl = movie?.image_url ? getImageUrl(movie.image_url) : null;
  const year = movie?.year;
  const description = movie?.description;
  const genres = movie?.genres || [];
  const cast = movie?.cast || (movie?.stars || []).map((name: string) => ({ name }));

  // Volume icon
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume2 : Volume2;

  // ── Imperatively set CSS custom properties on the container so no style={} props are needed in JSX ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty("--brightness-opacity", String(1 - brightness));
    el.style.setProperty("--fill-h", swipeIndicator ? `${swipeIndicator.value * 100}%` : "0%");
    el.style.setProperty("--preview-left", previewTime !== null ? `${previewPosition}px` : "0px");
    el.style.setProperty("--buffered-w", `${bufferedPercent}%`);
    el.style.setProperty("--progress-w", `${progressPercent}%`);
  }, [brightness, swipeIndicator, previewPosition, previewTime, bufferedPercent, progressPercent]);

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
          {/* ══════════════════════════════════════════════════════ */}
          {/* VIDEO AREA */}
          {/* ══════════════════════════════════════════════════════ */}
          <div
            className="relative flex-1 flex items-center justify-center bg-black min-h-0"
            onClick={(e) => {
              if ((e as any).nativeEvent?.pointerType === "touch" || "ontouchstart" in window) return;
              handleVideoAreaTap(e);
            }}
            onTouchEnd={(e) => { handleLongPressEnd(); handleSwipeTouchEnd(); handleVideoAreaTap(e); }}
            onMouseDown={() => { if (!("ontouchstart" in window)) handleLongPressStart(); }}
            onMouseUp={() => { if (!("ontouchstart" in window)) handleLongPressEnd(); }}
            onTouchStart={(e) => { handleLongPressStart(); handleSwipeTouchStart(e); }}
            onTouchMove={(e) => { handleSwipeTouchMove(e); if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } }}
            onTouchCancel={() => { handleLongPressEnd(); handleSwipeTouchEnd(); }}
          >
            {/* Brightness overlay */}
            {brightness < 1 && (
              <div className="absolute inset-0 bg-black pointer-events-none z-[5] [opacity:var(--brightness-opacity)]" />
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
              onEnded={handleEnded}
            >
              {subtitles.map(track => (
                <track
                  key={track.id}
                  label={track.label}
                  srclang={track.language}
                  src={track.url}
                  kind="subtitles"
                  default={track.id === selectedSubtitleId}
                />
              ))}
            </video>

            {/* ─── BUFFERING INDICATOR ─── */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="relative w-16 h-16">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                  {/* Spinning arc */}
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#c8f547] animate-spin" />
                  {/* Inner glowing dot */}
                  <div className="absolute inset-[22%] rounded-full bg-[#c8f547]/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#c8f547] animate-pulse shadow-[0_0_8px_#c8f547]" />
                  </div>
                </div>
              </div>
            )}

            {/* ─── SWIPE INDICATOR ─── */}
            {swipeIndicator && (
              <div className={cn(
                "absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-2 animate-in fade-in duration-150",
                swipeIndicator.side === "left" ? "left-5" : "right-5"
              )}>
                <div className="flex flex-col items-center gap-2 px-3.5 py-3 rounded-2xl bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl">
                  {swipeIndicator.side === "left" ? (
                    <svg className="w-5 h-5 text-[#c8f547]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <VolumeIcon className={cn("w-5 h-5", swipeIndicator.value === 0 ? "text-white/40" : "text-[#c8f547]")} />
                  )}
                  {/* Vertical track */}
                  <div className="relative w-1.5 h-20 rounded-full bg-white/10 overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 rounded-full bg-[#c8f547] transition-all duration-75 shadow-[0_0_6px_#c8f547] [height:var(--fill-h)]" />
                  </div>
                  <span className="text-white text-[10px] font-bold tabular-nums">{Math.round(swipeIndicator.value * 100)}%</span>
                </div>
              </div>
            )}

            {/* ─── LONG PRESS 2× INDICATOR ─── */}
            {isLongPressing && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in zoom-in-90 duration-200">
                <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-black/70 backdrop-blur-2xl border border-[#c8f547]/30 shadow-[0_0_20px_rgba(200,245,71,0.2)]">
                  <Gauge className="w-4 h-4 text-[#c8f547]" />
                  <span className="text-[#c8f547] text-sm font-bold tracking-widest">2× FAST</span>
                </div>
              </div>
            )}

            {/* ─── DOUBLE TAP SKIP ANIMATION ─── */}
            {skipAnimation && (
              <DoubleTapRipple
                key={skipAnimation.key}
                side={skipAnimation.side}
                seconds={skipAnimation.seconds}
                onDone={() => setSkipAnimation(null)}
              />
            )}

            {/* ─── GESTURE HINTS ─── */}
            {showGestureHints && (
              <div className="absolute inset-0 z-40 pointer-events-none animate-in fade-in duration-500">
                {[
                  { side: "left", tap: "Rewind 10s", swipe: "Brightness" },
                  { side: "right", tap: "Skip 10s", swipe: "Volume" },
                ].map(({ side, tap, swipe }) => (
                  <div
                    key={side}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-3",
                      side === "left" ? "left-[10%]" : "right-[10%]"
                    )}
                  >
                    <div className="flex gap-1 mb-1">
                      <div className="w-7 h-7 rounded-full border-2 border-[#c8f547]/50 animate-ping [animation-duration:1.5s]" />
                      <div className="w-7 h-7 rounded-full border-2 border-[#c8f547]/50 animate-ping [animation-duration:1.5s] delay-200" />
                    </div>
                    <HintPill label="Double tap" sub={tap} />
                    <HintPill label="Swipe ↕" sub={swipe} />
                  </div>
                ))}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[28%] flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full border-2 border-[#c8f547]/30 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-[#c8f547]/20 animate-pulse" />
                  </div>
                  <HintPill label="Hold" sub="2× speed" />
                </div>
              </div>
            )}

            {/* ─── CENTER PLAY BUTTON ─── */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-300",
              showControls && !isPlaying && !isBuffering ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}>
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                aria-label="Play"
                title="Play"
                className="w-20 h-20 rounded-full border-2 border-[#c8f547]/60 bg-black/40 backdrop-blur-xl flex items-center justify-center pointer-events-auto hover:bg-[#c8f547]/10 hover:border-[#c8f547] hover:scale-110 active:scale-95 transition-all duration-200 shadow-[0_0_40px_rgba(200,245,71,0.2),inset_0_0_20px_rgba(200,245,71,0.05)]"
              >
                <Play className="w-9 h-9 text-[#c8f547] fill-[#c8f547] ml-1 drop-shadow-lg" />
              </button>
            </div>

            {/* ══════════════════════════════════════════════════════ */}
            {/* TOP BAR */}
            {/* ══════════════════════════════════════════════════════ */}
            <div className={cn(
              "absolute top-0 left-0 right-0 z-50 transition-all duration-400",
              showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none"
            )}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Top gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none" />
              <div className="relative flex items-center gap-3 px-3 py-3 md:px-5 md:py-4">
                {/* Back */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleClose(); }}
                  aria-label="Go back"
                  title="Back"
                  data-testid="button-player-back"
                  className="flex-shrink-0 p-2 rounded-full hover:bg-white/10 active:scale-90 transition-all duration-200 pointer-events-auto group"
                >
                  <ChevronDown className="w-6 h-6 text-white group-hover:text-[#c8f547] transition-colors" />
                </button>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate leading-tight">{title}</p>
                  {year && <p className="text-white/40 text-xs">{year}</p>}
                </div>

                {/* Top-right badges + actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {playbackSpeed !== 1 && (
                    <span className="px-2.5 py-1 rounded-md bg-[#c8f547]/15 text-[#c8f547] text-xs font-bold border border-[#c8f547]/30 tracking-wider shadow-[0_0_10px_rgba(200,245,71,0.15)]">
                      {playbackSpeed}×
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                    className="hidden md:flex p-2 rounded-full hover:bg-white/10 transition-all pointer-events-auto group"
                    title="Picture in Picture (P)"
                  >
                    <PictureInPicture2 className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowKeyboardShortcuts(v => !v); }}
                    className="hidden md:flex p-2 rounded-full hover:bg-white/10 transition-all pointer-events-auto group"
                    title="Keyboard shortcuts (?)"
                  >
                    <Keyboard className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    aria-label="Close player"
                    title="Close"
                    className="p-2 rounded-full hover:bg-white/10 transition-all pointer-events-auto group"
                  >
                    <X className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                  </button>
                </div>
              </div>
            </div>

            {/* ─── SKIP INTRO / AD / RECAP ─── */}
            <AnimatePresence>
              {activeSkipSegment && (
                <motion.button
                  key="skip-btn"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={(e) => { e.stopPropagation(); skipToTime(activeSkipSegment.endTime); }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                  className="absolute bottom-24 right-6 md:right-10 z-30 px-5 md:px-7 py-3 md:py-4 rounded-2xl bg-[#c8f547] text-black font-black text-xs md:text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(200,245,71,0.3)] flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all group"
                >
                  <FastForward className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  Skip {activeSkipSegment.label}
                </motion.button>
              )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════ */}
            {/* KEYBOARD SHORTCUTS PANEL */}
            {/* ══════════════════════════════════════════════════════ */}
            {showKeyboardShortcuts && (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={() => setShowKeyboardShortcuts(false)}
              >
                <div
                  className="bg-[#0d0d0d]/95 border border-white/10 rounded-2xl p-6 w-[min(480px,90vw)] shadow-2xl animate-in zoom-in-95 duration-200"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white font-bold text-base tracking-wide">Keyboard Shortcuts</h3>
                    <button onClick={() => setShowKeyboardShortcuts(false)} aria-label="Close shortcuts" title="Close" className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {[
                      ["Space / K", "Play / Pause"],
                      ["← / J", "Rewind 10s"],
                      ["→ / L", "Skip 10s"],
                      ["↑ / ↓", "Volume ±10%"],
                      ["M", "Mute"],
                      ["F", "Fullscreen"],
                      ["< / >", "Speed down/up"],
                      ["P", "Picture-in-Picture"],
                      ["?", "This panel"],
                      ["Esc", "Close"],
                    ].map(([key, label]) => (
                      <div key={key} className="flex items-center gap-3">
                        <kbd className="px-2 py-1 rounded-md bg-white/10 border border-white/15 text-[#c8f547] text-xs font-mono font-bold min-w-[48px] text-center shadow-inner">
                          {key}
                        </kbd>
                        <span className="text-white/60 text-xs">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* SPEED MENU */}
            {/* ══════════════════════════════════════════════════════ */}
            {showSpeedMenu && (
              <div
                className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(false); }}
              >
                <div
                  className="bg-[#0d0d0d]/95 rounded-2xl border border-white/10 p-3 min-w-[200px] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 pt-1 pb-3">Playback Speed</p>
                  <div className="space-y-0.5">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                          speed === playbackSpeed
                            ? "bg-[#c8f547]/15 text-[#c8f547]"
                            : "text-white/70 hover:bg-white/8 hover:text-white"
                        )}
                      >
                        <span>{speed === 1 ? "Normal" : `${speed}×`}</span>
                        {speed === playbackSpeed && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c8f547] shadow-[0_0_6px_#c8f547]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* SUBTITLES MENU */}
            {/* ══════════════════════════════════════════════════════ */}
            {showSubtitlesMenu && subtitles.length > 0 && (
              <div
                className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={(e) => { e.stopPropagation(); setShowSubtitlesMenu(false); }}
              >
                <div
                  className="bg-[#0d0d0d]/95 rounded-2xl border border-white/10 p-3 min-w-[220px] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 pt-1 pb-3">Subtitles</p>
                  <div className="space-y-0.5 max-h-[60vh] overflow-y-auto no-scrollbar">
                    <button
                      onClick={() => { setSelectedSubtitleId("off"); setShowSubtitlesMenu(false); }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                        selectedSubtitleId === "off"
                          ? "bg-[#c8f547]/15 text-[#c8f547]"
                          : "text-white/70 hover:bg-white/8 hover:text-white"
                      )}
                    >
                      <span>Off</span>
                      {selectedSubtitleId === "off" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#c8f547] shadow-[0_0_6px_#c8f547]" />
                      )}
                    </button>
                    {subtitles.map((track) => (
                      <button
                        key={track.id}
                        onClick={() => { setSelectedSubtitleId(track.id); setShowSubtitlesMenu(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                          track.id === selectedSubtitleId
                            ? "bg-[#c8f547]/15 text-[#c8f547]"
                            : "text-white/70 hover:bg-white/8 hover:text-white"
                        )}
                      >
                        <span>{track.label}</span>
                        {track.id === selectedSubtitleId && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c8f547] shadow-[0_0_6px_#c8f547]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 z-30 transition-all duration-400 pointer-events-auto",
                showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Bottom gradient scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

              <div className="relative px-3 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-6 pt-12">

                {/* ── PROGRESS BAR ── */}
                <div
                  ref={progressBarRef}
                  className="relative mb-3 group/progress cursor-pointer"
                  onMouseMove={handleProgressHover}
                  onMouseLeave={handleProgressLeave}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleSeek((e.clientX - rect.left) / rect.width);
                  }}
                  onTouchStart={handleProgressTouchStart}
                  onTouchMove={handleProgressTouchMove}
                  onTouchEnd={handleProgressTouchEnd}
                  onTouchCancel={() => { setIsScrubbing(false); resetControlsTimeout(); }}
                >
                  {/* Expanded touch target for mobile */}
                  <div className="absolute -inset-y-3 inset-x-0 md:hidden" />

                  {/* Time preview bubble */}
                  {previewTime !== null && (
                    <div className="absolute bottom-7 pointer-events-none z-10 -translate-x-1/2 animate-in fade-in duration-100 [left:var(--preview-left)]">
                      <div className="px-3 py-1.5 rounded-lg bg-[#0d0d0d]/90 border border-white/10 backdrop-blur-xl shadow-xl">
                        <span className="text-white text-xs font-bold tabular-nums tracking-wider">{formatTime(previewTime)}</span>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-white/10" />
                    </div>
                  )}

                  {/* Scrub time preview for mobile */}
                  {isScrubbing && duration > 0 && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-10 md:hidden">
                      <div className="px-4 py-2 rounded-xl bg-black/90 border border-[#c8f547]/30 backdrop-blur-xl shadow-xl">
                        <span className="text-[#c8f547] text-sm font-bold tabular-nums">{formatTime(currentTime)}</span>
                        <span className="text-white/30 mx-1">/</span>
                        <span className="text-white/50 text-sm tabular-nums">{formatTime(duration)}</span>
                      </div>
                    </div>
                  )}

                  {/* Track */}
                  <div className={cn(
                    "relative w-full rounded-full transition-[height] duration-200",
                    isScrubbing ? "h-[6px]" : "h-[3px] md:h-[3px] group-hover/progress:h-[5px]"
                  )}>
                    <div className="absolute inset-0 rounded-full bg-white/15" />
                    <div className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-[width] duration-300 [width:var(--buffered-w)]" />
                    <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 bg-gradient-to-r from-[#a8d40a] to-[#c8f547] shadow-[0_0_8px_rgba(200,245,71,0.4)] [width:var(--progress-w)]" />
                    {/* Thumb — always visible on mobile, hover-only on desktop */}
                    <div className={cn(
                      "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#c8f547] border-2 border-[#0d0d0d] shadow-[0_0_10px_rgba(200,245,71,0.6)] transition-all duration-200 z-10 [left:var(--progress-w)]",
                      isScrubbing
                        ? "w-[18px] h-[18px]"
                        : "w-[12px] h-[12px] md:w-0 md:h-0 md:group-hover/progress:w-[14px] md:group-hover/progress:h-[14px]"
                    )} />
                  </div>
                </div>

                {/* ── CONTROLS ROW ── */}
                <div className="flex items-center gap-1">

                  {/* LEFT controls */}
                  <div className="flex items-center gap-0.5">
                    {/* Play/Pause */}
                    <CtrlBtn onClick={togglePlay} title={isPlaying ? "Pause (K)" : "Play (K)"}>
                      {isPlaying
                        ? <Pause className="w-5 h-5 text-white" />
                        : <Play className="w-5 h-5 text-[#c8f547] fill-[#c8f547]" />
                      }
                    </CtrlBtn>

                    {/* Skip -10 */}
                    <CtrlBtn onClick={() => skip(-10)} title="Rewind 10s (J)">
                      <div className="relative">
                        <RotateCcw className="w-4.5 h-4.5 text-white/80" />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white mt-[1px] pointer-events-none">10</span>
                      </div>
                    </CtrlBtn>

                    {/* Skip +10 */}
                    <CtrlBtn onClick={() => skip(10)} title="Skip 10s (L)">
                      <div className="relative">
                        <RotateCw className="w-4.5 h-4.5 text-white/80" />
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white mt-[1px] pointer-events-none">10</span>
                      </div>
                    </CtrlBtn>

                    {/* Volume group — desktop */}
                    <div className="hidden md:flex items-center gap-1 group/vol">
                      <CtrlBtn onClick={toggleMute} title="Mute (M)">
                        <VolumeIcon className={cn("w-4.5 h-4.5", isMuted || volume === 0 ? "text-white/40" : "text-white/80")} />
                      </CtrlBtn>
                      {/* Volume slider — expands on hover */}
                      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-[width] duration-300 ease-out flex items-center">
                        <input
                          type="range"
                          min={0} max={1} step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                          aria-label="Volume"
                          title="Volume"
                          className="w-20 h-1 cursor-pointer accent-[#c8f547]"
                        />
                      </div>
                    </div>

                    {/* Time */}
                    <button
                      className="ml-1 text-[11px] md:text-xs tabular-nums font-medium hover:text-[#c8f547] transition-colors whitespace-nowrap"
                      onClick={() => setShowRemainingTime(!showRemainingTime)}
                    >
                      <span className="text-white/90">{timeDisplay}</span>
                      <span className="text-white/30 mx-1">/</span>
                      <span className="text-white/50">{formatTime(duration)}</span>
                    </button>
                  </div>

                  {/* SPACER */}
                  <div className="flex-1" />

                  {/* RIGHT controls */}
                  <div className="flex items-center gap-0.5">
                    {/* Speed */}
                    <CtrlBtn onClick={() => setShowSpeedMenu(true)} title="Speed (< >)">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-4 h-4 text-white/70" />
                        <span className={cn(
                          "text-[10px] font-bold tabular-nums hidden md:block",
                          playbackSpeed !== 1 ? "text-[#c8f547]" : "text-white/50"
                        )}>
                          {playbackSpeed}×
                        </span>
                      </div>
                    </CtrlBtn>

                    {/* Subtitles */}
                    {subtitles.length > 0 && (
                      <CtrlBtn onClick={() => setShowSubtitlesMenu(true)} title="Subtitles (C)">
                        <Captions className={cn("w-4.5 h-4.5", selectedSubtitleId !== "off" ? "text-[#c8f547]" : "text-white/70")} />
                      </CtrlBtn>
                    )}

                    {/* Airplay — desktop */}
                    <CtrlBtn className="hidden md:flex" onClick={() => { }} title="Cast">
                      <Airplay className="w-4 h-4 text-white/60" />
                    </CtrlBtn>

                    {/* Orientation — mobile */}
                    <CtrlBtn className="md:hidden" onClick={toggleOrientation} title="Rotate">
                      <ScreenShare className={cn("w-4 h-4 text-white/70 transition-transform duration-300", isLandscape ? "rotate-0" : "rotate-90")} />
                    </CtrlBtn>

                    {/* Fullscreen */}
                    <CtrlBtn onClick={toggleFullscreen} title="Fullscreen (F)">
                      {isFullscreen
                        ? <Minimize className="w-4.5 h-4.5 text-white/80" />
                        : <Maximize className="w-4.5 h-4.5 text-white/80" />
                      }
                    </CtrlBtn>
                  </div>
                </div>
              </div>
            </div>

          </div>{/* end video area */}

          {/* ══════════════════════════════════════════════════════ */}
          {/* MOVIE INFO PANEL (below player, non-fullscreen) */}
          {/* ══════════════════════════════════════════════════════ */}
          {!isFullscreen && movie && (
            <div className="hidden md:block flex-shrink-0 bg-[#0a0a0a] border-t border-white/5 px-4 py-4 md:px-6 md:py-5">
              <div className="flex gap-4 md:gap-5 max-w-5xl mx-auto">
                {posterUrl && (
                  <div className="hidden sm:block w-14 md:w-20 flex-shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                    <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="text-white font-bold text-base md:text-lg leading-tight">
                        {title}
                        {year && <span className="text-white/30 font-normal ml-2 text-sm">{year}</span>}
                      </h3>
                      {description && (
                        <p className="text-white/40 text-xs mt-1.5 line-clamp-2 leading-relaxed max-w-2xl">{description}</p>
                      )}
                    </div>
                    {genres.length > 0 && (
                      <div className="hidden md:flex flex-wrap gap-1.5 flex-shrink-0">
                        {genres.slice(0, 3).map((genre) => (
                          <span key={genre} className="px-2.5 py-1 text-[9px] font-bold rounded-full bg-[#c8f547]/10 text-[#c8f547]/70 border border-[#c8f547]/20 uppercase tracking-widest">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {cast.length > 0 && (
                    <p className="hidden md:block text-xs">
                      <span className="text-white/25 uppercase tracking-widest text-[9px] mr-2">Stars</span>
                      <span className="text-white/50">{(cast as CastMember[]).slice(0, 4).map(c => c.name).join(", ")}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Small reusable control button ────────────────────────────────────────────
function CtrlBtn({
  onClick,
  children,
  title,
  className,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      title={title}
      className={cn(
        "flex items-center justify-center p-2 md:p-2.5 rounded-full hover:bg-white/10 active:scale-90 active:bg-white/15 transition-all duration-150 text-white",
        className
      )}
    >
      {children}
    </button>
  );
}

// ─── Gesture hint pill ────────────────────────────────────────────────────────
function HintPill({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10">
      <p className="text-white text-[10px] font-semibold text-center">
        {label}<br />
        <span className="text-white/50 font-normal">{sub}</span>
      </p>
    </div>
  );
}

// ─── Double-tap ripple ────────────────────────────────────────────────────────
function DoubleTapRipple({ side, seconds, onDone }: { side: "left" | "right"; seconds: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={cn(
      "absolute top-0 bottom-0 w-[38%] z-30 pointer-events-none flex items-center justify-center",
      side === "left" ? "left-0 rounded-r-[60%]" : "right-0 rounded-l-[60%]"
    )}>
      {/* Ripple glow */}
      <div
        className={cn(
          "absolute inset-0 animate-in fade-in-0 duration-150 bg-[radial-gradient(ellipse_at_center,rgba(200,245,71,0.12)_0%,transparent_70%)]",
          side === "left" ? "rounded-r-[60%]" : "rounded-l-[60%]"
        )}
      />
      {/* Icon + label */}
      <div className="flex flex-col items-center gap-1 animate-in zoom-in-75 duration-150">
        {side === "left"
          ? <RotateCcw className="w-7 h-7 text-[#c8f547] drop-shadow-[0_0_8px_rgba(200,245,71,0.8)]" />
          : <RotateCw className="w-7 h-7 text-[#c8f547] drop-shadow-[0_0_8px_rgba(200,245,71,0.8)]" />
        }
        <span className="text-[#c8f547] text-xs font-bold tracking-wider drop-shadow-lg">{seconds}s</span>
      </div>
    </div>
  );
}
