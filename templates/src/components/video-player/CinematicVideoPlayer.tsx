"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X, Play } from "lucide-react";
import type { Series } from "@/types/movie";
import type { CinematicVideoPlayerProps } from "./types";
import { useVideoPlayerEngine } from "./useVideoPlayerEngine";
import { PlayerSplash } from "./PlayerSplash";
import { PlayerControls } from "./PlayerControls";
import { PlayerGestureLayer } from "./PlayerGestureLayer";
import { PlayerBrandLogo } from "./PlayerBrandLogo";
import { EndedOverlay, ErrorOverlay } from "./PlayerOverlays";

// Native standard elements are used for media playback

export function CinematicVideoPlayer({
  isOpen,
  onClose,
  videoUrl,
  title,
  isMkv,
  movie,
  onTimeUpdate,
  startTime = 0,
  subtitles = [],
  skipSegments = [],
  onPlayNext,
  hasNextEpisode = false,
  onPlayEpisode,
}: CinematicVideoPlayerProps) {
  const engine = useVideoPlayerEngine({
    isOpen,
    onClose,
    videoUrl,
    title,
    movie,
    onTimeUpdate,
    startTime,
    subtitles,
    skipSegments,
  });

  const {
    activeTitle,
    activeMovie,
    posterUrl,
    year,
    runtimeLabel,
    rating,
    primaryGenre,
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
    playerRef,
    isPlaying,
    isPaused,
    isFullscreen,
    isLandscape,
    hasEnded,
    showSplashDetails,
    setShowSplashDetails,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    playbackError,
    bufferedTime,
    isPipAvailable,
    isPipActive,
    activeSubtitleId,
    beginPlayback,
    handleClose,
    handleRetryPlayback,
    skipActiveSegment,
    resetControlsTimeout,
    isEmbeddableVideo,
    videoHandlers,
    activeVideoUrl,
    posterGradient,
    handleReplay,
    isBuffering,
    togglePlay,
    toggleFullscreen,
    toggleMobileOrientation,
    togglePip,
    changePlaybackRate,
    handleSeek,
    skip,
    handlePointerTap,
    setVolume,
    setIsMuted,
    setActiveSubtitleId,
    isSeeking,
    setIsSeeking,
    sessionKey,
    forcedLandscape,
    toggleForcedLandscape,
    subtitleSize,
    setSubtitleSize,
    isDomainLocked,
  } = engine;

  const [isEpisodesOpen, setIsEpisodesOpen] = useState(false);
  const [upNextDismissed, setUpNextDismissed] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  const currentEpisodeMatch = useMemo(() => activeTitle.match(/\bS(\d+)\s*:\s*E(\d+)\b/i), [activeTitle]);
  const currentSeason = useMemo(() => currentEpisodeMatch ? parseInt(currentEpisodeMatch[1], 10) : 1, [currentEpisodeMatch]);
  const currentEpisode = useMemo(() => currentEpisodeMatch ? parseInt(currentEpisodeMatch[2], 10) : 1, [currentEpisodeMatch]);

  useEffect(() => {
    if (currentSeason) {
      setSelectedSeason(currentSeason);
    }
  }, [currentSeason]);

  const series = movie?.type === "series" ? (movie as Series) : null;
  
  const seasons = useMemo(() => {
    if (!series?.episodes?.length) return [];
    const set = new Set<number>();
    series.episodes.forEach((ep) => set.add(ep.season_number ?? 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [series]);

  const currentSeasonEpisodes = useMemo(() => {
    if (!series?.episodes?.length) return [];
    return series.episodes
      .filter((ep) => (ep.season_number ?? 1) === selectedSeason)
      .sort((a, b) => (a.episode_number ?? 1) - (b.episode_number ?? 1));
  }, [series, selectedSeason]);

  const nextEpisode = useMemo(() => {
    if (!series?.episodes?.length) return null;
    const sorted = [...series.episodes].sort((a, b) => {
      const sDiff = (a.season_number ?? 1) - (b.season_number ?? 1);
      if (sDiff !== 0) return sDiff;
      return (a.episode_number ?? 1) - (b.episode_number ?? 1);
    });
    
    const currentIndex = sorted.findIndex(
      (ep) => (ep.season_number ?? 1) === currentSeason && ep.episode_number === currentEpisode
    );
    
    if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
      return sorted[currentIndex + 1];
    }
    return null;
  }, [series, currentSeason, currentEpisode]);

  const shouldShowUpNext = useMemo(() => {
    return hasNextEpisode && nextEpisode && duration > 0 && (duration - currentTime <= 20) && !hasEnded;
  }, [hasNextEpisode, nextEpisode, duration, currentTime, hasEnded]);

  const countdown = Math.max(0, Math.floor(duration - currentTime));

  useEffect(() => {
    if (hasEnded && hasNextEpisode && !upNextDismissed && onPlayNext) {
      const timer = setTimeout(() => {
        onPlayNext();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasEnded, hasNextEpisode, upNextDismissed, onPlayNext]);

  const isMkvUrl = useMemo(() => {
    if (isMkv !== undefined) return isMkv;
    const activeUrl = activeVideoUrl || videoUrl || "";
    const lowerActive = activeUrl.toLowerCase();
    return lowerActive.includes(".mkv") || lowerActive.includes(".avi");
  }, [isMkv, activeVideoUrl, videoUrl]);

  const mediaSource = useMemo(() => ({
    src: activeVideoUrl,
    type: isMkvUrl ? "video/webm" : "video/mp4"
  }), [activeVideoUrl, isMkvUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 overflow-hidden rounded-none border-none bg-black p-0 [&_.close-orb]:hidden">
        <DialogTitle className="sr-only">{activeTitle}</DialogTitle>
        <DialogDescription className="sr-only">Video player for {activeTitle}</DialogDescription>

        <div
          ref={containerRef}
          className={cn(
            "video-player relative flex h-full w-full flex-col overflow-hidden bg-black",
            `video-player--${layout}`,
            isFullscreen && "video-player--fullscreen",
            !controlsVisible && isPlaying && "video-player--idle",
            forcedLandscape && "video-player--force-landscape",
          )}
          onPointerMove={() => {
            if (isPlaying) resetControlsTimeout();
          }}
        >
          {/* ── Splash screen ── */}
          <AnimatePresence>
            {!isPlaying && (
              <PlayerSplash
                activeTitle={activeTitle}
                activeMovie={activeMovie}
                posterUrl={posterUrl}
                year={year}
                primaryGenre={primaryGenre}
                runtimeLabel={runtimeLabel}
                rating={rating}
                splashGradientStyle={splashGradientStyle}
                showSplashDetails={showSplashDetails}
                onToggleDetails={() => setShowSplashDetails((v) => !v)}
                onClose={handleClose}
                onPlay={beginPlayback}
              />
            )}
          </AnimatePresence>

          {/* ── Video stage ── */}
          <div
            className={cn(
              "video-player-stage absolute inset-0 z-10 flex items-center justify-center bg-black",
              isPlaying ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {/* Ambient glow (desktop) */}
            {posterGradient && layout === "desktop" && (
              <div
                className={cn(
                  "pointer-events-none absolute -inset-16 z-0 hidden blur-[100px] md:block player-ambient-glow transition-opacity duration-1000",
                  (controlsVisible || isPaused) ? "opacity-35 player-ambient-glow--active" : "opacity-0"
                )}
              />
            )}

            {/* Media frame */}
            <div
              className={cn(
                "video-player-media-frame relative block h-full w-full overflow-hidden",
                isPlaying && isPaused && "video-player-media-frame--paused",
              )}
            >
              {isEmbeddableVideo ? (
                <>
                  <iframe
                    ref={iframeRef}
                    key={iframeSrc}
                    src={iframeSrc}
                    title={activeTitle}
                    onLoad={() => {}}
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                    allowFullScreen
                    className="video-player-embed relative z-10 h-full w-full border-0 bg-black"
                  />


                  {/* Gesture layer (embed) */}
                  {isPlaying && !hasEnded && !playbackError && (
                    <PlayerGestureLayer
                      flashes={gestureFlashes}
                      onTap={handlePointerTap}
                    />
                  )}

                  {/* Controls for Embeddable iframe (rendered outside MediaPlayer but in same frame) */}
                  {isPlaying && !hasEnded && !playbackError && (
                    <PlayerControls
                      layout={layout}
                      visible={controlsVisible}
                      activeTitle={activeTitle}
                      activeMovie={activeMovie}
                      isPaused={isPaused}
                      isBuffering={isBuffering}
                      isFullscreen={isFullscreen}
                      isLandscape={isLandscape}
                      isPipAvailable={isPipAvailable}
                      isPipActive={isPipActive}
                      isEmbeddableVideo={true}
                      currentTime={currentTime}
                      duration={duration}
                      bufferedTime={bufferedTime}
                      volume={volume}
                      isMuted={isMuted}
                      playbackRate={playbackRate}
                      activeSkipSegment={activeSkipSegment}
                      usableSubtitles={usableSubtitles}
                      activeSubtitleId={activeSubtitleId}
                      skipSegments={skipSegments}
                      onClose={handleClose}
                      onTogglePlay={togglePlay}
                      onSkip={skip}
                      onSeek={handleSeek}
                      onSeekStart={() => setIsSeeking(true)}
                      onSeekEnd={() => setIsSeeking(false)}
                      onToggleFullscreen={toggleFullscreen}
                      onToggleOrientation={toggleMobileOrientation}
                      onTogglePip={togglePip}
                      onChangeRate={changePlaybackRate}
                      onVolumeChange={(v) => { setVolume(v); setIsMuted(v === 0); }}
                      onToggleMute={() => { setIsMuted((m) => !m); }}
                      onSubtitleChange={setActiveSubtitleId}
                      onSkipSegment={skipActiveSegment}
                      forcedLandscape={forcedLandscape}
                      onToggleForcedLandscape={toggleForcedLandscape}
                      subtitleSize={subtitleSize}
                      onSubtitleSizeChange={setSubtitleSize}
                      isEpisodesOpen={isEpisodesOpen}
                      onToggleEpisodes={() => setIsEpisodesOpen(!isEpisodesOpen)}
                    />
                  )}
                </>
              ) : (
                <div className="relative z-10 h-full w-full bg-black">
                  <video
                    ref={videoRef}
                    key={sessionKey}
                    src={activeVideoUrl}
                    poster={posterUrl ?? undefined}
                    autoPlay
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    controls={false}
                    className={cn(
                      "video-player-video relative z-10 h-full w-full bg-black object-contain",
                      subtitleSize === "small" && "subtitles-small",
                      subtitleSize === "medium" && "subtitles-medium",
                      subtitleSize === "large" && "subtitles-large"
                    )}
                    {...videoHandlers}
                  >
                    {usableSubtitles.map((track) => (
                      <track
                        key={track.id}
                        kind="subtitles"
                        src={track.url}
                        srcLang={track.language}
                        label={track.label}
                        default={activeSubtitleId === track.id}
                      />
                    ))}
                  </video>

                  {/* Gesture layer (native) */}
                  {isPlaying && !hasEnded && !playbackError && (
                    <PlayerGestureLayer
                      flashes={gestureFlashes}
                      onTap={handlePointerTap}
                    />
                  )}
                  
                  {/* Controls for Standard Video */}
                  {isPlaying && !hasEnded && !playbackError && (
                    <PlayerControls
                      layout={layout}
                      visible={controlsVisible}
                      activeTitle={activeTitle}
                      activeMovie={activeMovie}
                      videoUrl={activeVideoUrl}
                      isPaused={isPaused}
                      isBuffering={isBuffering}
                      isFullscreen={isFullscreen}
                      isLandscape={isLandscape}
                      isPipAvailable={isPipAvailable}
                      isPipActive={isPipActive}
                      isEmbeddableVideo={false}
                      currentTime={currentTime}
                      duration={duration}
                      bufferedTime={bufferedTime}
                      volume={volume}
                      isMuted={isMuted}
                      playbackRate={playbackRate}
                      activeSkipSegment={activeSkipSegment}
                      usableSubtitles={usableSubtitles}
                      activeSubtitleId={activeSubtitleId}
                      skipSegments={skipSegments}
                      onClose={handleClose}
                      onTogglePlay={togglePlay}
                      onSkip={skip}
                      onSeek={handleSeek}
                      onSeekStart={() => setIsSeeking(true)}
                      onSeekEnd={() => setIsSeeking(false)}
                      onToggleFullscreen={toggleFullscreen}
                      onToggleOrientation={toggleMobileOrientation}
                      onTogglePip={togglePip}
                      onChangeRate={changePlaybackRate}
                      onVolumeChange={(v) => { setVolume(v); setIsMuted(v === 0); }}
                      onToggleMute={() => { setIsMuted((m) => !m); }}
                      onSubtitleChange={setActiveSubtitleId}
                      onSkipSegment={skipActiveSegment}
                      forcedLandscape={forcedLandscape}
                      onToggleForcedLandscape={toggleForcedLandscape}
                      subtitleSize={subtitleSize}
                      onSubtitleSizeChange={setSubtitleSize}
                      isEpisodesOpen={isEpisodesOpen}
                      onToggleEpisodes={() => setIsEpisodesOpen(!isEpisodesOpen)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Buffering spinner */}
            <AnimatePresence>
              {isBuffering && isPlaying && (
                <motion.div
                  key="buffering"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center"
                >
                  <img 
                    src="/loading.gif" 
                    alt="Loading..." 
                    className="w-12 h-16 sm:w-16 sm:h-20 md:w-20 md:h-24 lg:w-24 lg:h-28 object-contain"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error overlay */}
            {playbackError && !isBuffering && (
              <ErrorOverlay
                message={playbackError}
                onRetry={handleRetryPlayback}
                onClose={handleClose}
                hideRetry={isDomainLocked}
              />
            )}
          </div>

          {/* ── Ended overlay ── */}
          <AnimatePresence>
            {hasEnded && isPlaying && (
              <EndedOverlay
                activeTitle={activeTitle}
                posterUrl={posterUrl}
                hasNextEpisode={hasNextEpisode}
                onReplay={handleReplay}
                onPlayNext={onPlayNext}
                onClose={handleClose}
              />
            )}
          </AnimatePresence>

          {/* ── Episodes Drawer ── */}
          <AnimatePresence>
            {isEpisodesOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[64] bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsEpisodesOpen(false)}
                />
                {/* Drawer */}
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="absolute top-0 right-0 h-full w-full sm:w-96 bg-zinc-950/95 border-l border-zinc-800 z-[65] flex flex-col pointer-events-auto"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-white">Episodes</h2>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5 truncate max-w-[200px]">{activeTitle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEpisodesOpen(false)}
                      aria-label="Close episodes list"
                      className="rounded-full p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all border border-zinc-800 hover:border-zinc-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Season Selector */}
                  {seasons.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto px-4 py-2 border-b border-zinc-800 scrollbar-none">
                      {seasons.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSeason(s)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0",
                            selectedSeason === s
                              ? "bg-red-600 text-white"
                              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                          )}
                        >
                          Season {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Episode List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {currentSeasonEpisodes.length === 0 ? (
                      <div className="text-center text-xs text-zinc-500 py-8">
                        No episodes found
                      </div>
                    ) : (
                      currentSeasonEpisodes.map((ep) => {
                        const isCurrentlyPlaying = (ep.season_number ?? 1) === currentSeason && ep.episode_number === currentEpisode;
                        const epImage = series?.image_url || posterUrl || "";
                        return (
                          <button
                            key={ep.mobifliks_id}
                            type="button"
                            onClick={() => {
                              if (onPlayEpisode) {
                                onPlayEpisode(ep);
                                setIsEpisodesOpen(false);
                              }
                            }}
                            className={cn(
                              "group w-full text-left p-3 rounded-lg border flex items-center gap-3 transition-all",
                              isCurrentlyPlaying
                                ? "bg-red-950/20 border-red-500/30"
                                : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700"
                            )}
                          >
                            <div className="relative w-24 aspect-video rounded-md bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800 flex items-center justify-center">
                              {epImage ? (
                                <img src={epImage} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity" />
                              ) : (
                                <div className="w-full h-full bg-zinc-800" />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Play className={cn("h-4 w-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] transition-all", isCurrentlyPlaying ? "text-red-500 fill-red-500" : "text-white fill-white opacity-0 group-hover:opacity-100")} />
                              </div>
                              {isCurrentlyPlaying && (
                                <div className="absolute inset-0 bg-red-950/30 flex items-center justify-center">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-zinc-950/90 border border-red-500/20 px-2 py-0.5 rounded-sm">
                                    Playing
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Episode {ep.episode_number}</div>
                              <div className={cn("text-xs font-bold truncate mt-0.5 transition-colors", isCurrentlyPlaying ? "text-red-400" : "text-white group-hover:text-red-500")}>
                                {ep.title || `Episode ${ep.episode_number}`}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ── Up Next Countdown Card ── */}
          <AnimatePresence>
            {shouldShowUpNext && !upNextDismissed && nextEpisode && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute bottom-24 right-6 z-[62] flex flex-col gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950/95 w-80 shadow-2xl pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-500">
                    Up Next
                  </span>
                  <button
                    type="button"
                    onClick={() => setUpNextDismissed(true)}
                    aria-label="Dismiss up next countdown"
                    className="rounded-full p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                <div className="flex gap-3">
                  <div className="relative w-20 aspect-video rounded bg-zinc-900 overflow-hidden shrink-0 border border-zinc-800">
                    {(() => {
                      const epImage = series?.image_url || posterUrl || "";
                      return epImage ? (
                        <img src={epImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-800" />
                      );
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {nextEpisode.title || `Episode ${nextEpisode.episode_number}`}
                    </div>
                    <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                      Season {nextEpisode.season_number ?? 1} • Episode {nextEpisode.episode_number}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onPlayNext) onPlayNext();
                    }}
                    className="flex-1 bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2 px-3 rounded-md transition-colors"
                  >
                    Play Now
                  </button>
                  <div className="text-[11px] font-semibold text-zinc-400">
                    Playing in {countdown}s
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
