import { useState, useEffect, useCallback, useRef } from "react";
import { X, Play, ChevronDown, Maximize, Minimize, SkipForward, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/lib/api";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const posterUrl = movie?.image_url ? getImageUrl(movie.image_url) : null;
  const year = movie?.year;
  const genres = movie?.genres || [];

  // Build the self-contained HTML blob for direct video URLs
  useEffect(() => {
    if (!videoUrl || !isPlaying) return;

    // For embeddable pages, no blob needed
    if (/youtube\.com|youtu\.be|drive\.google\.com|vimeo\.com/i.test(videoUrl)) {
      setBlobUrl(null);
      return;
    }

    const startSec = Math.floor(startTime);
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title.replace(/</g, "&lt;")}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;overflow:hidden}
video{width:100%;height:100%;display:block;object-fit:contain;background:#000}
</style>
</head>
<body>
<video
  src="${videoUrl.replace(/"/g, "&quot;")}"
  controls
  autoplay
  playsinline
  preload="auto"
  ${startSec > 0 ? `currentTime="${startSec}"` : ""}
  onloadedmetadata="if(${startSec}>0){this.currentTime=${startSec}}"
  onended="window.parent.postMessage('ended','*')"
  ontimeupdate="window.parent.postMessage({t:'tu',ct:this.currentTime,dur:isNaN(this.duration)?0:this.duration},'*')"
></video>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
      setBlobUrl(null);
    };
  }, [videoUrl, isPlaying, startTime, title]);

  // Listen for messages from the iframe
  useEffect(() => {
    if (!isPlaying) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data === "ended") {
        setHasEnded(true);
      } else if (e.data && typeof e.data === "object" && e.data.t === "tu") {
        onTimeUpdate?.(e.data.ct, e.data.dur);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isPlaying, onTimeUpdate]);

  // Reset state when player opens/closes or URL changes
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setHasEnded(false);
      setShowControls(true);
    } else {
      setIsPlaying(false);
      setHasEnded(false);
      setBlobUrl(null);
    }
  }, [isOpen, videoUrl]);

  // Auto-hide controls — shows for 4s then fades out
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  // When playback begins, show controls briefly so the user sees back/close
  useEffect(() => {
    if (!isPlaying) return;
    resetControlsTimeout();
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, [isPlaying, resetControlsTimeout]);

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
      if (e.key === " " && !isPlaying) { e.preventDefault(); setIsPlaying(true); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isOpen, isFullscreen, isPlaying, handleClose, toggleFullscreen]);

  const iframeSrc = (() => {
    if (!isPlaying) return undefined;
    if (blobUrl) return blobUrl;
    // Embeddable URLs
    const sep = videoUrl.includes("?") ? "&" : "?";
    return videoUrl + `${sep}autoplay=1${startTime > 0 ? `&start=${Math.floor(startTime)}` : ""}`;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 overflow-hidden rounded-none border-none bg-[#040404] p-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Video player for {title}</DialogDescription>

        <div
          ref={containerRef}
          className="relative flex h-full w-full flex-col overflow-hidden bg-black select-none"
          onMouseMove={resetControlsTimeout}
          onMouseLeave={() => isPlaying && setShowControls(false)}
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
                  <p className="truncate text-sm font-semibold text-white/80 tracking-wide">{title}</p>
                  <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-white/40">
                    {movie?.type === "series" ? (
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
                    <img src={posterUrl} alt={title} className="w-full aspect-[2/3] object-cover" />
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
                  onClick={() => setIsPlaying(true)}
                  aria-label="Play"
                  className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full shadow-[0_0_60px_rgba(255,138,61,0.45),0_0_0_1px_rgba(255,138,61,0.3)] transition-shadow hover:shadow-[0_0_80px_rgba(255,138,61,0.6)]"
                  style={{
                    background: "linear-gradient(135deg, #ff8a3d 0%, #ff5b2e 50%, #ff4d6d 100%)",
                  }}
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
                {/* iframe fills the whole area — NO overlay on top of it */}
                <iframe
                  ref={iframeRef}
                  key={iframeSrc}
                  src={iframeSrc}
                  title={title}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0 bg-black"
                />

                {/* Top control bar — floats above iframe, pointer-events only on itself */}
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 z-30 transition-all duration-300 pointer-events-none",
                    showControls ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
                  )}
                >
                  {/* gradient scrim */}
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none" />

                  <div className="relative flex items-center justify-between gap-3 px-4 py-4 md:px-6 pointer-events-auto">
                    <button
                      onClick={handleClose}
                      aria-label="Go back"
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-white shadow-xl backdrop-blur-xl transition-all hover:bg-white/10 active:scale-95"
                    >
                      <ChevronDown className="h-5 w-5" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white tracking-tight drop-shadow-lg">{title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/60">
                        <span className="w-1 h-1 rounded-full bg-[#ff8a3d]" />
                        {movie?.type === "series" ? "Series" : "Movie"}
                        {year && <><span className="w-1 h-1 rounded-full bg-white/20" />{year}</>}
                        {genres[0] && <><span className="w-1 h-1 rounded-full bg-white/20" />{genres[0]}</>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleFullscreen}
                        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-white/80 shadow-lg backdrop-blur-xl transition-all hover:bg-white/10 hover:text-white active:scale-95"
                      >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={handleClose}
                        aria-label="Close player"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-white/80 shadow-lg backdrop-blur-xl transition-all hover:bg-white/10 hover:text-white active:scale-95"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Narrow invisible tap strip at the very top — tapping here toggles the control bar */}
                {/* This does NOT cover the rest of the screen so the iframe controls remain fully usable */}
                <div
                  className="absolute inset-x-0 top-0 h-16 z-20 cursor-pointer"
                  aria-label="Show/hide controls"
                  onClick={resetControlsTimeout}
                  onTouchEnd={resetControlsTimeout}
                />
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
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-2xl">{title}</h3>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                      onClick={() => { setHasEnded(false); setIsPlaying(false); setTimeout(() => setIsPlaying(true), 80); }}
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
