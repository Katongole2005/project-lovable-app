"use client";
import {
  ChevronDown,
  Maximize,
  Minimize,
  Monitor,
  Pause,
  Play,
  RotateCw,
  SkipBack,
  SkipForward,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Movie, Series, SkipSegment, SubtitleTrack } from "@/types/movie";
import { PLAYBACK_RATES, formatTime } from "./utils";
import { PlayerScrubber } from "./PlayerScrubber";
import type { PlayerLayout } from "./types";

type PlayerControlsProps = {
  layout: PlayerLayout;
  visible: boolean;
  activeTitle: string;
  activeMovie: Movie | Series | null;
  isPaused: boolean;
  isBuffering: boolean;
  isFullscreen: boolean;
  isLandscape: boolean;
  isPipAvailable: boolean;
  isPipActive: boolean;
  isEmbeddableVideo: boolean;
  currentTime: number;
  duration: number;
  bufferedTime: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  activeSkipSegment: SkipSegment | null;
  usableSubtitles: SubtitleTrack[];
  activeSubtitleId: string | null;
  onClose: () => void;
  onTogglePlay: () => void;
  onSkip: (amount: number) => void;
  onSeek: (time: number) => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
  onToggleFullscreen: () => void;
  onToggleOrientation: () => void;
  onTogglePip: () => void;
  onChangeRate: (rate: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onSubtitleChange: (id: string | null) => void;
  onSkipSegment: () => void;
};

export function PlayerControls({
  layout,
  visible,
  activeTitle,
  activeMovie,
  isPaused,
  isBuffering,
  isFullscreen,
  isLandscape,
  isPipAvailable,
  isPipActive,
  isEmbeddableVideo,
  currentTime,
  duration,
  bufferedTime,
  volume,
  isMuted,
  playbackRate,
  activeSkipSegment,
  usableSubtitles,
  activeSubtitleId,
  onClose,
  onTogglePlay,
  onSkip,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onToggleFullscreen,
  onToggleOrientation,
  onTogglePip,
  onChangeRate,
  onVolumeChange,
  onToggleMute,
  onSubtitleChange,
  onSkipSegment,
}: PlayerControlsProps) {
  const remaining = Math.max(0, duration - currentTime);

  return (
    <>
      {/* Top bar — always receives clicks when visible */}
      <div
        className={cn(
          "video-player-controls-top pointer-events-auto absolute inset-x-0 top-0 z-[60] flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pb-16 pt-[max(0.75rem,env(safe-area-inset-top))]",
          !visible && "pointer-events-none opacity-0",
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          <ChevronDown className="h-6 w-6" />
        </button>

        <div className="flex-1 min-w-0" />

        <div className="flex shrink-0 items-center gap-2">
          {layout !== "desktop" && (
            <button
              type="button"
              onClick={onToggleOrientation}
              aria-label="Rotate"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white md:hidden"
            >
              <RotateCw className={cn("h-5 w-5", isLandscape && "rotate-90")} />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label="Fullscreen"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Center play — only when paused */}
      {visible && !isBuffering && isPaused && (
        <div
          className="pointer-events-none absolute inset-0 z-[55] flex items-center justify-center"
          style={{ bottom: "var(--player-chrome-height, 112px)" }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            aria-label="Play"
            className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 text-white backdrop-blur-sm transition hover:scale-105 active:scale-95"
          >
            <Play className="ml-1 h-9 w-9 fill-white" />
          </button>
        </div>
      )}

      {visible && activeSkipSegment && (
        <div className="pointer-events-none absolute bottom-[calc(var(--player-chrome-height,112px)+1rem)] right-4 z-[60]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSkipSegment();
            }}
            className="pointer-events-auto rounded border-2 border-white/90 bg-black/70 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-black/90"
          >
            Skip {activeSkipSegment.label}
          </button>
        </div>
      )}

      {/* Netflix-style bottom chrome — scrubber always interactive */}
      <div
        className="video-player-chrome pointer-events-none absolute inset-x-0 bottom-0 z-[60]"
        style={{ "--player-chrome-height": visible ? "112px" : "48px" } as React.CSSProperties}
      >
        <div
          className={cn(
            "bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 transition-opacity duration-200",
            visible ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Scrubber: ALWAYS clickable so timeline works even when controls faded */}
          <div
            className="pointer-events-auto mx-auto max-w-[1600px]"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <PlayerScrubber
              currentTime={currentTime}
              duration={duration}
              bufferedTime={bufferedTime}
              showTimes={visible}
              expanded={visible}
              onSeekStart={onSeekStart}
              onSeek={onSeek}
              onSeekEnd={onSeekEnd}
            />
          </div>

          {/* Transport row */}
          <div
            className={cn(
              "pointer-events-auto mx-auto mt-1 flex max-w-[1600px] items-center justify-between gap-3",
              !visible && "pointer-events-none h-0 overflow-hidden opacity-0",
            )}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <NetflixButton label={isPaused ? "Play" : "Pause"} onClick={onTogglePlay} large>
                {isPaused ? (
                  <Play className="ml-0.5 h-6 w-6 fill-current" />
                ) : (
                  <Pause className="h-6 w-6 fill-current" />
                )}
              </NetflixButton>
              <NetflixButton label="Back 10 seconds" onClick={() => onSkip(-10)}>
                <SkipBack className="h-5 w-5" />
              </NetflixButton>
              <NetflixButton label="Forward 10 seconds" onClick={() => onSkip(10)}>
                <SkipForward className="h-5 w-5" />
              </NetflixButton>
              <span className="ml-2 hidden text-sm font-medium tabular-nums text-white/90 sm:inline">
                {formatTime(currentTime)}
              </span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <span className="mr-1 hidden text-sm tabular-nums text-white/70 md:inline">
                -{formatTime(remaining)}
              </span>

              {usableSubtitles.length > 0 && !isEmbeddableVideo && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <NetflixButton label="Subtitles">
                      <Subtitles className={cn("h-5 w-5", activeSubtitleId && "text-red-500")} />
                    </NetflixButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" className="border-white/10 bg-black/95 text-white">
                    <DropdownMenuItem onClick={() => onSubtitleChange(null)}>Off</DropdownMenuItem>
                    {usableSubtitles.map((track) => (
                      <DropdownMenuItem key={track.id} onClick={() => onSubtitleChange(track.id)}>
                        {track.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <NetflixButton label="Playback speed">
                    <span className="text-xs font-bold">{playbackRate}x</span>
                  </NetflixButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" className="border-white/10 bg-black/95 text-white">
                  {PLAYBACK_RATES.map((rate) => (
                    <DropdownMenuItem key={rate} onClick={() => onChangeRate(rate)}>
                      {rate}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden items-center gap-1 sm:flex">
                <NetflixButton label="Mute" onClick={onToggleMute}>
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </NetflixButton>
                <div className="w-24" onPointerDown={(e) => e.stopPropagation()}>
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={(v) => onVolumeChange(v[0] / 100)}
                    className="cursor-pointer [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-0 [&_[role=slider]]:bg-white"
                  />
                </div>
              </div>

              {isPipAvailable && (
                <NetflixButton label="Picture in picture" onClick={onTogglePip}>
                  <Monitor className={cn("h-5 w-5", isPipActive && "text-red-400")} />
                </NetflixButton>
              )}

              <NetflixButton label="Fullscreen" onClick={onToggleFullscreen}>
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </NetflixButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function NetflixButton({
  children,
  label,
  onClick,
  large = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95",
        large ? "h-11 w-11" : "h-9 w-9",
      )}
    >
      {children}
    </button>
  );
}
