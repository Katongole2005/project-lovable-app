"use client";
import { AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CinematicVideoPlayerProps } from "./types";
import { useVideoPlayerEngine } from "./useVideoPlayerEngine";
import { PlayerSplash } from "./PlayerSplash";
import { PlayerControls } from "./PlayerControls";
import { PlayerGestureLayer } from "./PlayerGestureLayer";
import { BufferingOverlay, EndedOverlay, ErrorOverlay } from "./PlayerOverlays";
import { PlayerBrandLogo } from "./PlayerBrandLogo";

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
    setIsMuted,
    setVolume,
    playbackRate,
    isBuffering,
    isSeeking,
    setIsSeeking,
    playbackError,
    bufferedTime,
    isPipAvailable,
    isPipActive,
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
    resetControlsTimeout,
    sendCommand,
    isEmbeddableVideo,
    videoHandlers,
    activeVideoUrl,
    posterGradient,
    handleReplay,
    setIsBuffering,
    setShowControls,
  } = engine;

  const chromeHeight = controlsVisible ? "112px" : "48px";

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
            !controlsVisible && isPlaying && !isPaused && "video-player--idle",
          )}
          style={{ "--player-chrome-height": chromeHeight } as React.CSSProperties}
          onPointerMove={() => {
            if (isPlaying) resetControlsTimeout();
          }}
          onClick={(e) => {
            if (!isPlaying) return;
            if ((e.target as HTMLElement).closest(".video-player-chrome, button, [role='slider']")) return;
            if (!controlsVisible) {
              setShowControls(true);
              resetControlsTimeout();
            }
          }}
        >
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

          <div
            className={cn(
              "video-player-stage absolute inset-0 z-10 flex items-center justify-center bg-black",
              isPlaying ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {posterGradient && layout === "desktop" && (
              <div
                className="pointer-events-none absolute -inset-16 z-0 hidden opacity-30 blur-[100px] md:block"
                style={{
                  background: `radial-gradient(circle at center, var(--poster-gradient-middle) 0%, transparent 70%)`,
                }}
              />
            )}

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
                  onLoad={() => setIsBuffering(false)}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  className="video-player-embed relative z-10 h-full w-full border-0 bg-black"
                />
              ) : (
                <video
                  ref={videoRef}
                  key={activeVideoUrl}
                  src={activeVideoUrl}
                  autoPlay
                  playsInline
                  preload="auto"
                  poster={posterUrl ?? undefined}
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="video-player-video relative z-10 h-full w-full bg-black object-contain"
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
              )}
            </div>

            {isPlaying && controlsVisible && !hasEnded && !playbackError && (
              <PlayerBrandLogo
                visible={controlsVisible}
                title={activeTitle}
                logoUrl={activeMovie?.logo_url}
                activeMovie={activeMovie}
                layout={layout}
              />
            )}

            {/* Gestures only when chrome is hidden — never block buttons/scrubber */}
            {isPlaying && !hasEnded && !playbackError && !controlsVisible && (
              <PlayerGestureLayer flashes={gestureFlashes} onTap={handlePointerTap} />
            )}

            {isBuffering && <BufferingOverlay activeTitle={activeTitle} activeMovie={activeMovie} />}

            {playbackError && !isBuffering && (
              <ErrorOverlay
                message={playbackError}
                onRetry={handleRetryPlayback}
                onClose={handleClose}
              />
            )}

            {isPlaying && !playbackError && !hasEnded && (
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
                onVolumeChange={(vol) => {
                  setVolume(vol);
                  setIsMuted(vol === 0);
                  if (isEmbeddableVideo) sendCommand("volume", vol);
                  else if (videoRef.current) {
                    videoRef.current.volume = vol;
                    videoRef.current.muted = vol === 0;
                  }
                }}
                onToggleMute={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  if (isEmbeddableVideo) sendCommand("muted", next);
                  else if (videoRef.current) videoRef.current.muted = next;
                }}
                onSubtitleChange={setActiveSubtitleId}
                onSkipSegment={skipActiveSegment}
              />
            )}
          </div>

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
