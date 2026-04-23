import { useCallback, useEffect, useRef, useState } from "react";
import { X, Play, Pause, ChevronDown, Maximize, Minimize, SkipForward, SkipBack, RotateCcw, Volume2, VolumeX, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/api";
import { Slider } from "@/components/ui/slider";
import type { Movie, Series, SubtitleTrack, SkipSegment } from "@/types/movie";

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
  onPlayNext?: () => void;
  hasNextEpisode?: boolean;
}


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

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSessionKeyRef = useRef("");
  const pauseRequestedRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);

  const activeTitle = sessionTitle || title;
  const activeMovie = sessionMovie ?? movie ?? null;
  const posterUrl = activeMovie?.image_url ? getImageUrl(activeMovie.image_url) : null;
  const year = activeMovie?.year;
  const genres = activeMovie?.genres || [];
  const isEmbeddableVideo = /youtube\.com|youtu\.be|drive\.google\.com|vimeo\.com/i.test(videoUrl);
  const sessionKey = `${videoUrl}|${startTime}|${movie?.mobifliks_id ?? ""}`;
  const useNativeVideoControls = isTouchDevice && !isEmbeddableVideo;
  const controlsHideDelayMs = isTouchDevice ? 6500 : 4000;

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
    if (!isOpen || !videoUrl || !isPlaying) return;
    setIsBuffering(true);
  }, [isOpen, isPlaying, videoUrl]);

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
  }, [isEmbeddableVideo, isPlaying, startTime, videoUrl]);

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
      setDuration(0);
      setIsBuffering(false);
      setIsSeeking(false);
    } else {
      lastSessionKeyRef.current = "";
      pauseRequestedRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setHasEnded(false);
      setCurrentTime(0);
      setDuration(0);
      setIsBuffering(false);
      setIsSeeking(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (isFullscreen) document.exitFullscreen(); else handleClose(); }
      if (e.key === "f") toggleFullscreen();
      if (e.key === " ") {
        e.preventDefault();
        if (!isPlaying) beginPlayback();
        else togglePlay();
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [beginPlayback, handleClose, isFullscreen, isOpen, isPlaying, toggleFullscreen, togglePlay]);

  const iframeSrc = isPlaying && isEmbeddableVideo
    ? (() => {
        const sep = videoUrl.includes("?") ? "&" : "?";
        return videoUrl + `${sep}autoplay=1${startTime > 0 ? `&start=${Math.floor(startTime)}` : ""}`;
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
    if (isEmbeddableVideo) {
      sendCommand("seek", time);
    } else if (videoRef.current) {
      pauseRequestedRef.current = videoRef.current.paused;
      videoRef.current.currentTime = time;
    }
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
    if (startTime > 0 && Math.abs(video.currentTime - startTime) > 1) {
      video.currentTime = startTime;
    }
    setDuration(video.duration || 0);
  };

  const handleDirectTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    // Throttle state updates to once per second.
    // timeupdate fires ~4x/second; each setCurrentTime() re-renders the full
    // player component. Over 6 min that's ~1440 re-renders of complex overlay
    // UI, compounding memory pressure that causes the Chrome OOM crash.
    const now = Date.now();
    const shouldUpdate = now - lastTimeUpdateRef.current >= 1000;
    if (shouldUpdate) {
      lastTimeUpdateRef.current = now;
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
      }
      setDuration(video.duration || 0);
      onTimeUpdate?.(video.currentTime, video.duration || 0);
    }
  };

  const handleDirectPlay = () => {
    pauseRequestedRef.current = false;
    setIsPaused(false);
    setHasEnded(false);
  };

  const handleDirectPause = () => {
    setIsPaused(true);
    setIsBuffering(false);
  };

  const handleDirectPlaying = () => {
    pauseRequestedRef.current = false;
    setIsPaused(false);
    setIsBuffering(false);
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

  const handleDirectError = () => {
    pauseRequestedRef.current = false;
    setIsPaused(true);
    setIsBuffering(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 overflow-hidden rounded-none border-none bg-[#040404] p-0">
        <DialogTitle className="sr-only">{activeTitle}</DialogTitle>
        <DialogDescription className="sr-only">Video player for {activeTitle}</DialogDescription>

        <div
          ref={containerRef}
          className="relative flex h-full w-full flex-col overflow-hidden bg-black select-none"
          onPointerMove={() => {
            if (!isPlaying || useNativeVideoControls) return;
            resetControlsTimeout();
          }}
          onPointerDown={() => {
            if (!isPlaying || useNativeVideoControls) return;
            if (showControls) {
              resetControlsTimeout();
              return;
            }
            setShowControls(true);
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
                className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden"
              >
                {/* Blurred poster background */}
                {posterUrl && (
                  <>
                    <img
                      src={posterUrl}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/50" />
                  </>
                )}
                {!posterUrl && (
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,122,24,0.18),transparent_60%),linear-gradient(180deg,#090909,#050505)]" />
                )}

                {/* Close button */}
                <button
                  onClick={handleClose}
                  aria-label="Close player"
                  className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/50 text-white backdrop-blur-xl transition-all hover:bg-white/10 active:scale-95"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>

                {/* Title row */}
                <div className="absolute top-4 left-16 right-16 z-10 text-center">
                  <p className="truncate text-sm font-semibold text-white/80 tracking-wide">{activeTitle}</p>
                  <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-white/40">
                    {activeMovie?.type === "series" ? (
                      <span className="rounded bg-primary/20 px-1.5 py-0.5 text-primary text-[9px] font-bold uppercase tracking-widest">Series</span>
                    ) : (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold uppercase tracking-widest">Movie</span>
                    )}
                    {year && <span>· {year}</span>}
                    {genres[0] && <span>· {genres[0]}</span>}
                  </div>
                </div>

                {/* Poster */}
                {posterUrl && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 mb-8 w-40 sm:w-52 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)] border border-white/10"
                  >
                    <img src={posterUrl} alt={activeTitle} className="w-full aspect-[2/3] object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </motion.div>
                )}

                {/* BIG PLAY BUTTON */}
                <motion.button
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={beginPlayback}
                  aria-label="Play"
                  className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full shadow-[0_0_60px_rgba(255,138,61,0.45),0_0_0_1px_rgba(255,138,61,0.3)] transition-shadow hover:shadow-[0_0_80px_rgba(255,138,61,0.6)] btn-cinematic-play"
                >
                  <Play className="ml-1.5 h-9 w-9 fill-white text-white drop-shadow-lg" />

                  {/* Pulse ring */}
                  <span className="absolute inset-0 rounded-full border-2 border-[#ff8a3d]/40 animate-ping [animation-duration:1.8s]" />
                </motion.button>

                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="relative z-10 mt-5 text-sm font-semibold text-white/60 tracking-widest uppercase"
                >
                  Tap to Play
                </motion.p>

                {/* Subtle bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── IFRAME PLAYER ── */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div
                key="player"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 z-10 bg-black"
              >
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
                    key={`${videoUrl}-${startTime}`}
                    src={videoUrl}
                    autoPlay
                    controls={useNativeVideoControls}
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
                    <div className="text-center">
                      <p className="text-sm font-semibold tracking-wide text-white">Loading movie...</p>
                      <p className="mt-1 text-xs text-white/60">{activeTitle}</p>
                    </div>
                  </div>
                )}

                {useNativeVideoControls && (
                  <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between bg-gradient-to-b from-black/85 via-black/45 to-transparent px-4 pb-10 pt-4 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-3">
                      <button
                        onClick={handleClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md transition-all active:scale-95"
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

                {/* Custom Overlay Controls */}
                {!useNativeVideoControls && (
                <div
                  className={cn(
                    "absolute inset-0 z-30 transition-all duration-500",
                    showControls ? "opacity-100" : "opacity-0 cursor-none"
                  )}
                  onClick={() => setShowControls(prev => !prev)}
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
                      <button onClick={handleClose} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <X className="h-5 w-5 text-white" />
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
                      
                      {/* Timeline / Seek Bar */}
                      <div className="group relative pt-4 pb-2 px-1">
                        <Slider
                          value={[currentTime]}
                          max={duration || 100}
                          step={0.1}
                          onPointerDown={() => setIsSeeking(true)}
                          onPointerUp={() => { setIsSeeking(false); }}
                          onValueChange={handleSeek}
                          className="relative z-10 cursor-pointer"
                        />
                        <div className="flex justify-between mt-2 px-1 text-[11px] font-bold tracking-widest text-white/40 tabular-nums">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>

                      {/* Control Buttons Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white/70 hover:text-white transition-colors">
                            <SkipBack className="h-6 w-6" />
                          </button>
                          
                          <button 
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
                            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                          >
                            {isPaused ? (
                              <Play className="h-6 w-6 fill-black ml-0.5" />
                            ) : (
                              <Pause className="h-6 w-6 fill-black" />
                            )}
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white/70 hover:text-white transition-colors">
                            <SkipForward className="h-6 w-6" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-3 group">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextMuted = !isMuted;
                                setIsMuted(nextMuted);
                                if (isEmbeddableVideo) {
                                  sendCommand("muted", nextMuted);
                                } else if (videoRef.current) {
                                  videoRef.current.muted = nextMuted;
                                }
                              }}
                              className="text-white/70 hover:text-white transition-colors"
                            >
                              {isMuted || volume === 0 ? <VolumeX className="h-6 w-6 text-red-400" /> : <Volume2 className="h-6 w-6" />}
                            </button>
                            <div className="w-24 opacity-0 group-hover:opacity-100 transition-all origin-left">
                              <Slider 
                                value={[isMuted ? 0 : volume * 100]} 
                                max={100} 
                                onValueChange={(v) => {
                                  const vol = v[0] / 100;
                                  setVolume(vol);
                                  setIsMuted(vol === 0);
                                  if (isEmbeddableVideo) {
                                    sendCommand("volume", vol);
                                  } else if (videoRef.current) {
                                    videoRef.current.volume = vol;
                                    videoRef.current.muted = vol === 0;
                                  }
                                }}
                              />
                            </div>
                          </div>

                          <div className="relative group">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/80 transition-all hover:bg-white/10 hover:text-white">
                              {playbackRate}x <Settings className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 invisible group-hover:visible bg-black/90 border border-white/10 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl min-w-[100px]">
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                <button
                                  key={rate}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPlaybackRate(rate);
                                    if (isEmbeddableVideo) {
                                      sendCommand("rate", rate);
                                    } else if (videoRef.current) {
                                      videoRef.current.playbackRate = rate;
                                    }
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 text-xs text-left transition-colors hover:bg-white/10",
                                    playbackRate === rate ? "text-primary bg-primary/5" : "text-white/60"
                                  )}
                                >
                                  {rate}x {rate === 1 && "(Normal)"}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
