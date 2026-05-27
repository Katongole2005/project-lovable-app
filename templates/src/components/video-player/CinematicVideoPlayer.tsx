"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CinematicVideoPlayerProps } from "./types";
import { useVideoPlayerEngine } from "./useVideoPlayerEngine";
import { PlayerSplash } from "./PlayerSplash";
import { EndedOverlay, ErrorOverlay } from "./PlayerOverlays";
import { PlayerBrandLogo } from "./PlayerBrandLogo";

// Vidstack Core Elements
import { MediaPlayer, MediaProvider, Track } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";

// Vidstack CSS Stylesheets
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

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
    playbackError,
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
            !controlsVisible && isPlaying && "video-player--idle",
          )}
          style={{ "--player-chrome-height": chromeHeight } as React.CSSProperties}
          onPointerMove={() => {
            if (isPlaying) resetControlsTimeout();
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
                  <DefaultVideoLayout icons={defaultLayoutIcons} />
                </MediaPlayer>
              )}
            </div>

            {/* Custom Close Button overlay */}
            <AnimatePresence>
              {isPlaying && controlsVisible && (
                <motion.button
                  key="close-button"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  type="button"
                  onClick={handleClose}
                  aria-label="Close player"
                  className="absolute top-4 left-4 z-[200] flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md shadow-md hover:bg-black/80 hover:scale-105 active:scale-95"
                >
                  <ChevronDown className="h-6 w-6" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Brand Logo overlay */}
            {isPlaying && controlsVisible && !hasEnded && !playbackError && (
              <PlayerBrandLogo
                visible={controlsVisible}
                title={activeTitle}
                logoUrl={activeMovie?.logo_url}
                activeMovie={activeMovie}
                layout={layout}
              />
            )}

            {/* Custom Skip Segment Overlay */}
            {isPlaying && activeSkipSegment && !playbackError && !hasEnded && (
              <div className="pointer-events-none absolute bottom-24 right-4 z-[200]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    skipActiveSegment();
                  }}
                  className="pointer-events-auto rounded-full border-2 border-white/95 bg-black/80 px-6 py-3 text-sm font-bold text-white shadow-2xl hover:bg-black hover:scale-105 active:scale-95 transition-all"
                >
                  Skip {activeSkipSegment.label}
                </button>
              </div>
            )}

            {playbackError && !isBuffering && (
              <ErrorOverlay
                message={playbackError}
                onRetry={handleRetryPlayback}
                onClose={handleClose}
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
