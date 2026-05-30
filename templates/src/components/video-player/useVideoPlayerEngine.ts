"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getImageUrl, buildMediaUrl, forceProxyPlaybackUrl, isReferrerLockedMediaUrl, unwrapLegacyWorkerUrl } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { incrementUserStat } from "@/lib/stats";
import type { Movie, Series, SkipSegment, SubtitleTrack } from "@/types/movie";
import type { GestureFlash, PosterGradient } from "./types";
import {
  detectPlayerLayout,
  extractPosterGradient,
  fallbackPosterGradient,
  formatRuntimeLabel,
  isEmbeddableUrl,
} from "./utils";

type EngineOptions = {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  movie?: Movie | Series | null;
  onTimeUpdate?: (currentTime: number, duration: number, force?: boolean) => void;
  startTime?: number;
  subtitles?: SubtitleTrack[];
  skipSegments?: SkipSegment[];
};

export function useVideoPlayerEngine({
  isOpen,
  onClose,
  videoUrl,
  title,
  movie,
  onTimeUpdate,
  startTime = 0,
  subtitles = [],
  skipSegments = [],
}: EngineOptions) {
  const { user } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [sessionTitle, setSessionTitle] = useState(title);
  const [sessionMovie, setSessionMovie] = useState<Movie | Series | null>(movie ?? null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );
  const [activeVideoUrl, setActiveVideoUrl] = useState(() => forceProxyPlaybackUrl(videoUrl, title));
  const [resumeTime, setResumeTime] = useState(startTime);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isPipAvailable, setIsPipAvailable] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [showSplashDetails, setShowSplashDetails] = useState(false);
  const [posterGradient, setPosterGradient] = useState<PosterGradient>(fallbackPosterGradient);
  const [gestureFlashes, setGestureFlashes] = useState<GestureFlash[]>([]);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSessionKeyRef = useRef("");
  const pauseRequestedRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);
  const watchStatSecondsRef = useRef(0);
  const lastTrackedPlaybackTimeRef = useRef<number | null>(null);
  const iframeStatTimestampRef = useRef<number | null>(null);
  const stallRecoveryTimeoutRef = useRef<number | null>(null);
  const lastPlaybackProgressRef = useRef(Date.now());
  const gestureFlashIdRef = useRef(0);
  const lastTapRef = useRef({ time: 0, side: null as "left" | "right" | "center" | null });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const getVideoElement = useCallback(() => {
    const video = videoRef.current || containerRef.current?.querySelector("video");
    if (video && videoRef.current !== video) {
      videoRef.current = video;
    }
    return video;
  }, []);

  const activeTitle = sessionTitle || title;
  const activeMovie = sessionMovie ?? movie ?? null;
  const posterUrl = activeMovie?.image_url ? getImageUrl(activeMovie.image_url) : null;
  const year = activeMovie?.year;
  const genres = activeMovie?.genres || [];
  const runtimeLabel = formatRuntimeLabel(activeMovie?.runtime_minutes);
  const rating = activeMovie?.views
    ? Math.min(4.5 + (activeMovie.views / 100000) * 0.5, 5).toFixed(1)
    : "4.5";
  const primaryGenre = genres[0] || (activeMovie?.type === "series" ? "Series" : "Movie");
  const isEmbeddableVideo = isEmbeddableUrl(activeVideoUrl);
  const sessionKey = `${videoUrl}|${startTime}|${movie?.mobifliks_id ?? ""}`;
  const controlsHideDelayMs = isTouchDevice ? 4000 : 2800;
  const isRawReferrerLockedUrl = useCallback((url?: string | null) => {
    if (!url) return false;
    const parsed = (() => {
      try {
        return new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      } catch {
        return null;
      }
    })();
    return !/cdn\.s-u\.in$/i.test(parsed?.hostname || "") && isReferrerLockedMediaUrl(url);
  }, []);

  const layout = detectPlayerLayout(isTouchDevice, isLandscape, viewportWidth);
  const controlsVisible = showControls || hasEnded || !isPlaying || isSeeking || !!playbackError;

  const usableSubtitles = useMemo(
    () => subtitles.filter((track) => track.url?.trim()),
    [subtitles],
  );

  const activeSkipSegment = useMemo(() => {
    if (!isPlaying || hasEnded) return null;
    return (
      skipSegments.find(
        (segment) =>
          currentTime >= segment.startTime &&
          currentTime < segment.endTime - 0.5,
      ) ?? null
    );
  }, [currentTime, hasEnded, isPlaying, skipSegments]);

  const splashGradientStyle = {
    "--poster-gradient-top": posterGradient.top,
    "--poster-gradient-middle": posterGradient.middle,
    "--poster-gradient-bottom": posterGradient.bottom,
    "--poster-gradient-surface": posterGradient.surface,
  } as React.CSSProperties;

  const lockOrientation = useCallback(async (orientation: "landscape" | "portrait-primary") => {
    const orientationApi = window.screen?.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    if (!orientationApi?.lock) return false;
    try {
      await orientationApi.lock(orientation);
      return true;
    } catch {
      return false;
    }
  }, []);

  const shouldUseMobileOrientation = useCallback(() => {
    if (typeof window === "undefined") return false;
    return (
      viewportWidth < 900 ||
      window.matchMedia("(pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0
    );
  }, [viewportWidth]);

  const enterMobileLandscape = useCallback(async () => {
    if (!shouldUseMobileOrientation() || !containerRef.current) return;
    try {
      if (!document.fullscreenElement && containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      /* best effort */
    }
    const locked = await lockOrientation("landscape");
    if (locked || window.innerWidth > window.innerHeight) {
      setIsLandscape(true);
    }
  }, [lockOrientation, shouldUseMobileOrientation]);

  const flushWatchStats = useCallback(() => {
    if (!user?.id) return;
    const minutes = Math.floor(watchStatSecondsRef.current / 60);
    if (minutes <= 0) return;
    watchStatSecondsRef.current -= minutes * 60;
    void incrementUserStat(user.id, "watch_time", minutes);
    void incrementUserStat(user.id, "activity_points", minutes * 10);
  }, [user?.id]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (!isPlaying || isSeeking || hasEnded) return;
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), controlsHideDelayMs);
  }, [controlsHideDelayMs, hasEnded, isPlaying, isSeeking]);

  const pushGestureFlash = useCallback((side: GestureFlash["side"], label: string) => {
    const id = ++gestureFlashIdRef.current;
    setGestureFlashes((prev) => [...prev.slice(-2), { side, label, id }]);
    window.setTimeout(() => {
      setGestureFlashes((prev) => prev.filter((item) => item.id !== id));
    }, 700);
  }, []);

  const sendCommand = useCallback((type: string, val?: unknown) => {
    iframeRef.current?.contentWindow?.postMessage({ type, val }, "*");
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration || time, time));
      setCurrentTime(clamped);
      setResumeTime(clamped);
      if (isEmbeddableVideo) {
        sendCommand("seek", clamped);
      } else {
        const video = getVideoElement();
        if (video) {
          pauseRequestedRef.current = video.paused;
          video.currentTime = clamped;
        }
      }
      resetControlsTimeout();
    },
    [duration, getVideoElement, isEmbeddableVideo, resetControlsTimeout, sendCommand],
  );

  const skip = useCallback(
    (amount: number) => {
      const next = Math.max(0, Math.min(duration, currentTime + amount));
      handleSeek(next);
      pushGestureFlash(amount < 0 ? "left" : "right", `${amount > 0 ? "+" : ""}${amount}s`);
    },
    [currentTime, duration, handleSeek, pushGestureFlash],
  );

  const beginPlayback = useCallback(() => {
    pauseRequestedRef.current = false;
    setHasEnded(false);
    setIsPaused(false);
    setIsPlaying(true);
    setShowControls(true);
    void enterMobileLandscape();

    const video = getVideoElement();
    if (video) {
      if (video.readyState >= 3) {
        setIsBuffering(false);
      } else {
        setIsBuffering(true);
      }
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (e.name === "AbortError") return;
          setIsPaused(true);
          setIsBuffering(false);
        });
      }
    } else {
      setIsBuffering(true);
    }
    resetControlsTimeout();
  }, [enterMobileLandscape, getVideoElement, resetControlsTimeout]);

  const togglePlay = useCallback(() => {
    if (!isPlaying) {
      beginPlayback();
      return;
    }

    const video = getVideoElement();
    if (!isEmbeddableVideo && video) {
      if (video.paused) {
        pauseRequestedRef.current = false;
        setIsPaused(false);
        setIsBuffering(video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            if (e.name === "AbortError") return;
            setIsPaused(true);
            setIsBuffering(false);
          });
        }
      } else {
        pauseRequestedRef.current = true;
        setIsBuffering(false);
        video.pause();
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
    resetControlsTimeout();
  }, [beginPlayback, getVideoElement, isEmbeddableVideo, isPaused, isPlaying, resetControlsTimeout, sendCommand]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        if (shouldUseMobileOrientation()) {
          const locked = await lockOrientation("landscape");
          if (locked || window.innerWidth > window.innerHeight) setIsLandscape(true);
        }
      } catch {
        /* */
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setIsLandscape(false);
      } catch {
        /* */
      }
    }
    resetControlsTimeout();
  }, [isFullscreen, lockOrientation, resetControlsTimeout, shouldUseMobileOrientation]);

  const toggleMobileOrientation = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement && containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      /* */
    }
    const nextOrientation = isLandscape ? "portrait-primary" : "landscape";
    const locked = await lockOrientation(nextOrientation);
    setIsLandscape(locked ? !isLandscape : window.innerWidth > window.innerHeight);
    resetControlsTimeout();
  }, [isLandscape, lockOrientation, resetControlsTimeout]);

  const togglePip = useCallback(async () => {
    if (!videoRef.current || isEmbeddableVideo) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      /* */
    }
  }, [isEmbeddableVideo]);

  const changePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  }, []);

  const handleClose = useCallback(() => {
    // Force save progress before closing
    if (videoRef.current) {
      onTimeUpdate?.(videoRef.current.currentTime, videoRef.current.duration || 0, true);
    } else {
      onTimeUpdate?.(currentTime, duration, true);
    }

    // Clean up the video element while still fully in the DOM!
    const docVideo = containerRef.current?.querySelector("video");
    const globalVideo = typeof window !== "undefined" ? (window as any).__activeVideoElement : null;
    const video = videoRef.current || docVideo || globalVideo;
    if (video) {
      try {
        console.log("[Player Engine HandleClose] Tearing down active media stream connection...");
        video.pause();
        video.src = "";
        video.removeAttribute("src");
        while (video.firstChild) {
          video.removeChild(video.firstChild);
        }
        video.load();
        if (typeof window !== "undefined") {
          (window as any).__activeVideoElement = null;
        }
      } catch (e) {
        console.warn("[Player Engine HandleClose] Video stream cleanup failed:", e);
      }
    }

    window.screen?.orientation?.unlock?.();
    setIsLandscape(false);
    if (isFullscreen) document.exitFullscreen().catch(() => undefined);
    wakeLockRef.current?.release?.().catch(() => undefined);
    wakeLockRef.current = null;
    onClose();
  }, [isFullscreen, onClose, onTimeUpdate, currentTime, duration]);

  const handleRetryPlayback = useCallback(() => {
    pauseRequestedRef.current = false;
    setPlaybackError(null);
    setHasEnded(false);
    setIsPaused(false);
    setIsBuffering(true);
    setActiveVideoUrl(forceProxyPlaybackUrl(videoUrl, activeTitle));
    const resumeAt = currentTime || startTime;
    setResumeTime(resumeAt);
    setCurrentTime(resumeAt);
    videoRef.current?.load();
    beginPlayback();
  }, [activeTitle, beginPlayback, currentTime, startTime, videoUrl]);

  const skipActiveSegment = useCallback(() => {
    if (!activeSkipSegment) return;
    handleSeek(activeSkipSegment.endTime);
  }, [activeSkipSegment, handleSeek]);

  const handlePointerTap = useCallback(
    (side: "left" | "right" | "center") => {
      if (side === "center") {
        togglePlay();
        return;
      }

      const now = Date.now();
      const last = lastTapRef.current;

      if (now - last.time < 320 && last.side === side) {
        lastTapRef.current = { time: 0, side: null };
        skip(side === "left" ? -10 : 10);
        return;
      }

      lastTapRef.current = { time: now, side };

      setShowControls(true);
      resetControlsTimeout();
    },
    [resetControlsTimeout, skip, togglePlay],
  );

  const handleMouseMoveOnSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    setHoverTime(percent * duration);
    setHoverPosition(x);
  };

  const iframeSrc =
    isPlaying && isEmbeddableVideo
      ? (() => {
          const sep = activeVideoUrl.includes("?") ? "&" : "?";
          return (
            activeVideoUrl +
            `${sep}autoplay=1${resumeTime > 0 ? `&start=${Math.floor(resumeTime)}` : ""}`
          );
        })()
      : undefined;

  /* ── Effects (session, device, stats, keyboard, video events) ── */

  useEffect(() => {
    if (!isOpen) return;
    if (lastSessionKeyRef.current === sessionKey) return;
    lastSessionKeyRef.current = sessionKey;
    setSessionTitle(title);
    setSessionMovie(movie ?? null);
  }, [isOpen, movie, sessionKey, title]);

  useEffect(() => {
    if (!isOpen) return;
    triedUrlsRef.current.clear();
    lastSessionKeyRef.current = sessionKey;
    lastPlaybackProgressRef.current = Date.now();
    pauseRequestedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setHasEnded(false);
    setShowControls(true);
    setCurrentTime(startTime);
    setActiveVideoUrl(forceProxyPlaybackUrl(videoUrl, title));
    setResumeTime(startTime);
    setPlaybackError(null);
    setDuration(0);
    setIsBuffering(false);
    setIsSeeking(false);
    setShowSplashDetails(false);
    setGestureFlashes([]);
    const defaultSubtitle = usableSubtitles.find((t) => t.language === "en") ?? usableSubtitles[0];
    setActiveSubtitleId(defaultSubtitle?.id ?? null);
  }, [isOpen, sessionKey, startTime, title, usableSubtitles, videoUrl]);

  useEffect(() => {
    if (!isOpen) {
      lastSessionKeyRef.current = "";
      pauseRequestedRef.current = false;
      setIsPlaying(false);
      setGestureFlashes([]);
      wakeLockRef.current?.release?.().catch(() => undefined);
      wakeLockRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      // Find the video element either from the ref, DOM container, or global window registry
      const docVideo = containerRef.current?.querySelector("video");
      const globalVideo = typeof window !== "undefined" ? (window as any).__activeVideoElement : null;
      const video = videoRef.current || docVideo || globalVideo;

      if (video) {
        try {
          console.log("[Player Engine Cleanup] Tearing down active media stream connection...");
          video.pause();
          video.src = "";
          video.removeAttribute("src");
          
          // Clear any children <source> elements to abort downloading entirely
          while (video.firstChild) {
            video.removeChild(video.firstChild);
          }
          video.load();
          if (typeof window !== "undefined") {
            (window as any).__activeVideoElement = null;
          }
        } catch (e) {
          console.warn("[Player Engine Cleanup] Video element stream cleanup failed:", e);
        }
      }

      // Abort any active iframe embed connections
      if (iframeRef.current) {
        try {
          iframeRef.current.src = "about:blank";
        } catch (e) {
          /* */
        }
      }
    };
  }, []);


  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    
    const handleSaveProgress = () => {
      const currentOnTimeUpdate = onTimeUpdateRef.current;
      if (videoRef.current) {
        currentOnTimeUpdate?.(videoRef.current.currentTime, videoRef.current.duration || 0, true);
      } else {
        currentOnTimeUpdate?.(currentTimeRef.current, durationRef.current, true);
      }
    };

    const handleBeforeUnload = () => handleSaveProgress();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleSaveProgress();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen, isPlaying]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setIsTouchDevice(
        coarsePointerQuery.matches || window.innerWidth < 768 || navigator.maxTouchPoints > 0,
      );
      setViewportWidth(window.innerWidth);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    update();
    window.addEventListener("resize", update, { passive: true });
    coarsePointerQuery.addEventListener("change", update);
    window.screen?.orientation?.addEventListener?.("change", update);
    return () => {
      window.removeEventListener("resize", update);
      coarsePointerQuery.removeEventListener("change", update);
      window.screen?.orientation?.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !activeVideoUrl || !isPlaying) return;
    setIsBuffering(true);
  }, [activeVideoUrl, isOpen, isPlaying]);

  useEffect(() => {
    if (!isOpen || !activeVideoUrl || !isRawReferrerLockedUrl(activeVideoUrl)) return;

    let cancelled = false;
    buildMediaUrl({
      url: activeVideoUrl,
      title: activeTitle,
      mobifliksId: activeMovie?.mobifliks_id,
      detailsUrl: activeMovie?.video_page_url || activeMovie?.details_url,
      play: true,
    }).then((proxiedUrl) => {
      if (!cancelled && proxiedUrl && proxiedUrl !== activeVideoUrl) {
        setActiveVideoUrl(proxiedUrl);
      }
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activeMovie, activeTitle, activeVideoUrl, isOpen, isRawReferrerLockedUrl]);

  useEffect(() => {
    if (!isOpen || !activeVideoUrl || isEmbeddableVideo || isPlaying) return;
    // Touch devices show the splash first; desktop can start immediately.
    if (isTouchDevice) return;
    beginPlayback();
  }, [activeVideoUrl, beginPlayback, isEmbeddableVideo, isOpen, isPlaying, isTouchDevice]);

  const handleReplay = useCallback(() => {
    setHasEnded(false);
    setIsPaused(false);
    setPlaybackError(null);
    handleSeek(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (e.name === "AbortError") return;
          setIsPaused(true);
        });
      }
    } else {
      beginPlayback();
    }
    resetControlsTimeout();
  }, [beginPlayback, handleSeek, resetControlsTimeout]);

  useEffect(() => {
    if (!isPlaying) return;
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPaused, isPlaying, resetControlsTimeout]);

  useEffect(() => {
    let cancelled = false;
    setPosterGradient(fallbackPosterGradient);
    if (!posterUrl) return;
    extractPosterGradient(posterUrl).then((gradient) => {
      if (!cancelled) setPosterGradient(gradient ?? fallbackPosterGradient);
    });
    return () => {
      cancelled = true;
    };
  }, [posterUrl]);

  useEffect(() => {
    if (typeof document === "undefined" || isEmbeddableVideo) return;
    const checkPip = () => {
      setIsPipAvailable(document.pictureInPictureEnabled && !!videoRef.current);
    };
    checkPip();
    const video = videoRef.current;
    if (!video) return;
    const onEnterPip = () => setIsPipActive(true);
    const onLeavePip = () => setIsPipActive(false);
    video.addEventListener("enterpictureinpicture", onEnterPip);
    video.addEventListener("leavepictureinpicture", onLeavePip);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnterPip);
      video.removeEventListener("leavepictureinpicture", onLeavePip);
    };
  }, [isEmbeddableVideo, isPlaying]);

  useEffect(() => {
    const handleFSChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      if (!fullscreen) setIsLandscape(window.innerWidth > window.innerHeight);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  useEffect(() => {
    if (!isOpen || !isPlaying || isPaused || hasEnded) {
      wakeLockRef.current?.release?.().catch(() => undefined);
      wakeLockRef.current = null;
      return;
    }
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock
      ?.request("screen")
      .then((lock) => {
        wakeLockRef.current = lock;
      })
      .catch(() => undefined);
    return () => {
      wakeLockRef.current?.release?.().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, [hasEnded, isOpen, isPaused, isPlaying]);

  useEffect(() => {
    if (!isOpen || !user?.id || !isPlaying || isPaused || hasEnded) return;

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
  }, [
    activeVideoUrl,
    flushWatchStats,
    hasEnded,
    isBuffering,
    isEmbeddableVideo,
    isOpen,
    isPaused,
    isPlaying,
    user?.id,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "escape":
          if (isFullscreen) document.exitFullscreen();
          else handleClose();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "r":
          if (shouldUseMobileOrientation()) toggleMobileOrientation();
          break;
        case "i":
          togglePip();
          break;
        case "m": {
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          if (isEmbeddableVideo) sendCommand("muted", nextMuted);
          else if (videoRef.current) videoRef.current.muted = nextMuted;
          break;
        }
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
        case "arrowup": {
          e.preventDefault();
          const upVol = Math.min(1, volume + 0.05);
          setVolume(upVol);
          if (isEmbeddableVideo) sendCommand("volume", upVol);
          else if (videoRef.current) videoRef.current.volume = upVol;
          break;
        }
        case "arrowdown": {
          e.preventDefault();
          const downVol = Math.max(0, volume - 0.05);
          setVolume(downVol);
          if (isEmbeddableVideo) sendCommand("volume", downVol);
          else if (videoRef.current) videoRef.current.volume = downVol;
          break;
        }
        case "home":
          e.preventDefault();
          handleSeek(0);
          break;
        case "end":
          e.preventDefault();
          handleSeek(duration);
          break;
        default:
          if (/^[0-9]$/.test(e.key)) {
            handleSeek((duration * parseInt(e.key, 10)) / 10);
          }
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [
    beginPlayback,
    duration,
    handleClose,
    handleSeek,
    isEmbeddableVideo,
    isFullscreen,
    isMuted,
    isOpen,
    isPlaying,
    sendCommand,
    shouldUseMobileOrientation,
    skip,
    toggleFullscreen,
    toggleMobileOrientation,
    togglePip,
    togglePlay,
    volume,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isEmbeddableVideo) return;
    Array.from(video.textTracks).forEach((track, index) => {
      const subtitle = usableSubtitles[index];
      const isActive = subtitle && activeSubtitleId === subtitle.id;
      track.mode = isActive ? "showing" : "hidden";
    });
  }, [activeSubtitleId, isEmbeddableVideo, isPlaying, usableSubtitles]);

  const triedUrlsRef = useRef<Set<string>>(new Set());

  const videoHandlers = {
    onLoadedMetadata: () => {
      const video = videoRef.current;
      if (!video) return;
      if (resumeTime > 0 && Math.abs(video.currentTime - resumeTime) > 1) {
        video.currentTime = resumeTime;
      }
      setDuration(video.duration || 0);
      video.playbackRate = playbackRate;
    },
    onTimeUpdate: () => {
      const video = videoRef.current;
      if (!video) return;
      lastPlaybackProgressRef.current = Date.now();
      if (video.buffered.length > 0) {
        setBufferedTime(video.buffered.end(video.buffered.length - 1));
      }
      const now = Date.now();
      if (now - lastTimeUpdateRef.current >= 100) {
        lastTimeUpdateRef.current = now;
        if (!isSeeking) setCurrentTime(video.currentTime);
        setDuration(video.duration || 0);
        onTimeUpdate?.(video.currentTime, video.duration || 0);
      }
    },
    onProgress: () => {
      const video = videoRef.current;
      if (!video?.buffered.length) return;
      setBufferedTime(video.buffered.end(video.buffered.length - 1));
    },
    onCanPlay: () => setIsBuffering(false),
    onPlaying: () => {
      pauseRequestedRef.current = false;
      lastPlaybackProgressRef.current = Date.now();
      setIsPaused(false);
      setIsBuffering(false);
      setPlaybackError(null);
    },
    onWaiting: () => {
      const video = videoRef.current;
      if (!video || video.paused || pauseRequestedRef.current) return;
      setIsBuffering(true);
    },
    onSeeking: () => {
      const video = videoRef.current;
      if (!video?.paused) setIsBuffering(true);
    },
    onSeeked: () => {
      const video = videoRef.current;
      if (video && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        setIsBuffering(false);
      }
    },
    onPlay: () => {
      pauseRequestedRef.current = false;
      setIsPaused(false);
      setHasEnded(false);
      setPlaybackError(null);
    },
    onPause: () => {
      setIsPaused(true);
      setIsBuffering(false);
    },
    onEnded: () => {
      pauseRequestedRef.current = false;
      setHasEnded(true);
      setIsPaused(true);
      setIsBuffering(false);
      setShowControls(true);
    },
    onError: async () => {
      pauseRequestedRef.current = false;
      setIsPaused(true);
      setIsBuffering(false);

      const currentActive = activeVideoUrl;
      triedUrlsRef.current.add(currentActive);
      const rawActiveUrl = unwrapLegacyWorkerUrl(currentActive);
      if (rawActiveUrl) {
        triedUrlsRef.current.add(rawActiveUrl);
      }

      console.warn("[Self-Healing Player] Stream failed to load:", currentActive);

      const candidates: string[] = [];
      if (rawActiveUrl) candidates.push(rawActiveUrl);
      
      const rawOriginal = unwrapLegacyWorkerUrl(videoUrl);
      if (rawOriginal) candidates.push(rawOriginal);

      if (activeMovie) {
        if (
          activeMovie.type === "series" &&
          "episodes" in activeMovie &&
          Array.isArray(activeMovie.episodes)
        ) {
          const episodes = activeMovie.episodes;
          const currentEp = episodes.find((ep) => {
            const epDownload = ep.download_url;
            const epServer2 = ep.server2_url;
            return (
              (epDownload &&
                (epDownload === rawActiveUrl ||
                  epDownload === currentActive ||
                  epDownload === videoUrl ||
                  epDownload === rawOriginal)) ||
              (epServer2 &&
                (epServer2 === rawActiveUrl ||
                  epServer2 === currentActive ||
                  epServer2 === videoUrl ||
                  epServer2 === rawOriginal))
            );
          });

          if (currentEp) {
            if (currentEp.server2_url) candidates.push(currentEp.server2_url);
            if (currentEp.download_url) candidates.push(currentEp.download_url);
          }
        } else {
          if (activeMovie.server2_url) candidates.push(activeMovie.server2_url);
          if (activeMovie.download_url) candidates.push(activeMovie.download_url);

          // Fallback to alternate VJ/language versions if the current version is dead
          if (activeMovie.vj_versions && Array.isArray(activeMovie.vj_versions)) {
            for (const version of activeMovie.vj_versions) {
              if (version.server2_url) candidates.push(version.server2_url);
              if (version.download_url) candidates.push(version.download_url);
            }
          }
        }
      }

      // Filter candidates to find the first one that has not been tried yet
      const nextRawUrl = candidates.find((url) => {
        if (!url) return false;
        const unwrapped = unwrapLegacyWorkerUrl(url);
        return !triedUrlsRef.current.has(url) && !triedUrlsRef.current.has(unwrapped);
      });

      if (nextRawUrl) {
        console.log("[Self-Healing Player] Trying fallback stream:", nextRawUrl);
        setIsBuffering(true);
        try {
          const nextUrl = await buildMediaUrl({
            url: nextRawUrl,
            title: activeTitle,
            mobifliksId: activeMovie?.mobifliks_id,
            play: true,
          });

          if (!videoRef.current) return;

          triedUrlsRef.current.add(nextUrl);
          setActiveVideoUrl(nextUrl);

          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.load();
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch((e) => {
                  if (e.name === "AbortError") return;
                  console.error("[Self-Healing Player] Autoplay failed on fallback:", e);
                });
              }
            }
          }, 50);
          return;
        } catch (err) {
          console.error("[Self-Healing Player] Failed to resolve alternate URL:", err);
        }
      }

      // No fallbacks left
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const isAppleSafari =
        /^((?!chrome|android).)*safari/i.test(ua) ||
        /iPad|iPhone|iPod|Macintosh/i.test(ua) ||
        (typeof navigator !== "undefined" &&
          navigator.platform === "MacIntel" &&
          navigator.maxTouchPoints > 1);

      if (isAppleSafari) {
        setPlaybackError(
          "Format not supported by Safari. Please switch to another server or try another version.",
        );
      } else {
        setPlaybackError(
          "This stream failed to load. Try replaying or switch to another server.",
        );
      }
    },
  };

  return {
    activeTitle,
    activeMovie,
    posterUrl,
    year,
    runtimeLabel,
    rating,
    primaryGenre,
    isEmbeddableVideo,
    layout,
    controlsVisible,
    splashGradientStyle,
    usableSubtitles,
    activeSkipSegment,
    iframeSrc,
    gestureFlashes,
    containerRef,
    iframeRef,
    videoRef,
    isPlaying,
    isPaused,
    isFullscreen,
    isLandscape,
    hasEnded,
    showControls,
    showSplashDetails,
    setShowSplashDetails,
    currentTime,
    duration,
    volume,
    isMuted,
    setIsMuted,
    setVolume,
    playbackRate,
    isBuffering,
    isSeeking,
    setIsSeeking,
    isTouchDevice,
    playbackError,
    bufferedTime,
    isPipAvailable,
    isPipActive,
    hoverTime,
    hoverPosition,
    activeSubtitleId,
    setActiveSubtitleId,
    beginPlayback,
    togglePlay,
    toggleFullscreen,
    toggleMobileOrientation,
    togglePip,
    changePlaybackRate,
    handleClose,
    handleRetryPlayback,
    handleSeek,
    skip,
    skipActiveSegment,
    handlePointerTap,
    handleMouseMoveOnSeek,
    setHoverTime,
    resetControlsTimeout,
    sendCommand,
    isEmbeddableVideo,
    videoHandlers,
    activeVideoUrl,
    posterGradient,
    handleReplay,
    setIsBuffering,
    setShowControls,
    sessionKey,
  };
}
