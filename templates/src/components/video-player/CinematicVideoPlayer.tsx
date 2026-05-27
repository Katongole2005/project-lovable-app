"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CinematicVideoPlayerProps } from "./types";
import { useVideoPlayerEngine } from "./useVideoPlayerEngine";
import { PlayerSplash } from "./PlayerSplash";
import { PlayerControls } from "./PlayerControls";
import { PlayerGestureLayer } from "./PlayerGestureLayer";
import { PlayerBrandLogo } from "./PlayerBrandLogo";
import { EndedOverlay, ErrorOverlay } from "./PlayerOverlays";

// Vidstack Core (no default layout CSS)
import { MediaPlayer, MediaProvider, Track } from "@vidstack/react";

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
  onPlayNext,
  hasNextEpisode = false,
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
  } = engine;

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
                className="pointer-events-none absolute -inset-16 z-0 hidden opacity-30 blur-[100px] md:block"
                style={{
                  background: `radial-gradient(circle at center, var(--poster-gradient-middle) 0%, transparent 70%)`,
                }}
              />
            )}

            {/* Media frame */}
            <div
              className={cn(
                "video-player-media-frame relative flex h-full w-full items-center justify-center overflow-hidden",
                isPlaying && isPaused && "video-player-media-frame--paused",
              )}
            >
              {isEmbeddableVideo ? (
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
              ) : (
                <MediaPlayer
                  key={activeVideoUrl}
                  src={activeVideoUrl}
                  title={activeTitle}
                  poster={posterUrl ?? undefined}
                  autoPlay
                  playsInline
                  preload="auto"
                  referrerPolicy="no-referrer"
                  onProviderSetup={(eventOrProvider) => {
                    if (!eventOrProvider) return;
                    let provider: any = eventOrProvider;
                    if (eventOrProvider && typeof (eventOrProvider as any).detail !== "undefined") {
                      provider = (eventOrProvider as any).detail;
                    } else if (eventOrProvider && typeof (eventOrProvider as any).nativeEvent?.detail !== "undefined") {
                      provider = (eventOrProvider as any).nativeEvent.detail;
                    }
                    if (provider && typeof provider === "object") {
                      if (provider.type === "video" || provider.type === "hls") {
                        (videoRef as any).current = provider.video;
                      }
                    }
                  }}
                  className="video-player-video relative z-10 h-full w-full bg-black object-contain"
                  style={{ width: "100%", height: "100%" }}
                  {...videoHandlers}
                >
                  <MediaProvider mediaProps={{ referrerPolicy: "no-referrer" }}>
                    {usableSubtitles.map((track) => (
                      <Track
                        key={track.id}
                        kind="subtitles"
                        src={track.url}
                        srcLang={track.language}
                        label={track.label}
                        default={activeSubtitleId === track.id}
                      />
                    ))}
                  </MediaProvider>
                  {/* No DefaultVideoLayout — fully custom controls below */}
                </MediaPlayer>
              )}
            </div>

            {/* Gesture layer (above media, below controls) */}
            {isPlaying && !hasEnded && !playbackError && (
              <PlayerGestureLayer
                flashes={gestureFlashes}
                onTap={handlePointerTap}
              />
            )}

            {/* Brand logo */}
            {isPlaying && controlsVisible && !hasEnded && !playbackError && (
              <PlayerBrandLogo
                visible={controlsVisible}
                title={activeTitle}
                logoUrl={activeMovie?.logo_url}
                activeMovie={activeMovie}
                layout={layout}
              />
            )}

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
                  <div className="player-buffering-ring" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error overlay */}
            {playbackError && !isBuffering && (
              <ErrorOverlay
                message={playbackError}
                onRetry={handleRetryPlayback}
                onClose={handleClose}
              />
            )}
          </div>

          {/* ── Controls (rendered outside media frame so they're above everything) ── */}
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
              isEmbeddableVideo={isEmbeddableVideo}
              currentTime={currentTime}
              duration={duration}
              bufferedTime={bufferedTime}
              volume={volume}
              isMuted={isMuted}
              playbackRate={playbackRate}
              activeSkipSegment={activeSkipSegment}
              usableSubtitles={usableSubtitles}
              activeSubtitleId={activeSubtitleId}
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
            />
          )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
