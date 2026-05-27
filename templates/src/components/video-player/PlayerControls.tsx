"use client";
import { useState, useRef } from "react";
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
  Volume1,
  Volume2,
  VolumeX,
  Settings,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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

type SettingsTab = "speed" | "subtitles" | null;

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
  const [settingsOpen, setSettingsOpen] = useState<SettingsTab>(null);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDesktop = layout === "desktop";
  const isMobile = layout !== "desktop";

  const handleVolumeEnter = () => {
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    setVolumeOpen(true);
  };

  const handleVolumeLeave = () => {
    volumeTimerRef.current = setTimeout(() => setVolumeOpen(false), 400);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <>
      {/* ── Top bar ── */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="top-bar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="player-top-bar pointer-events-auto absolute inset-x-0 top-0 z-[60] flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-14"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close player"
              className="player-icon-btn"
            >
              <ChevronDown className="h-5 w-5" />
            </button>

            {/* Title (mobile) */}
            {isMobile && (
              <p className="player-title-label flex-1 text-center">
                {activeTitle.replace(/\s*-\s*S\d+\s*:\s*E\d+\b/i, "")}
              </p>
            )}

            {/* Right controls (top) */}
            <div className="flex shrink-0 items-center gap-2">
              {layout !== "desktop" && (
                <button
                  type="button"
                  onClick={onToggleOrientation}
                  aria-label="Rotate"
                  className="player-icon-btn md:hidden"
                >
                  <RotateCw className={cn("h-4 w-4", isLandscape && "rotate-90")} />
                </button>
              )}
              {isDesktop && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  aria-label="Fullscreen"
                  className="player-icon-btn"
                >
                  {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Center pause overlay ── */}
      <AnimatePresence>
        {visible && !isBuffering && isPaused && (
          <motion.div
            key="center-play"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 z-[55] flex items-center justify-center"
            style={{ bottom: "var(--player-chrome-height, 120px)" }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              aria-label="Play"
              className="player-center-play pointer-events-auto"
            >
              <Play className="player-center-play-icon ml-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip segment badge ── */}
      <AnimatePresence>
        {visible && activeSkipSegment && (
          <motion.div
            key="skip-badge"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-none absolute z-[60]"
            style={{
              bottom: "calc(var(--player-chrome-height, 120px) + 1.5rem)",
              right: "1.25rem",
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSkipSegment(); }}
              className="player-skip-badge pointer-events-auto"
            >
              Skip {activeSkipSegment.label}
              <SkipForward className="ml-1.5 h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom chrome ── */}
      <div
        className="player-chrome pointer-events-none absolute inset-x-0 bottom-0 z-[60]"
        style={{ "--player-chrome-height": visible ? "120px" : "44px" } as React.CSSProperties}
      >
        {/* Settings panel (floats above chrome) */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              key="settings-panel"
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="player-settings-panel pointer-events-auto absolute bottom-full mb-2 right-4"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="player-settings-header">
                <button
                  className={cn("player-settings-tab", settingsOpen === "speed" && "active")}
                  onClick={() => setSettingsOpen("speed")}
                >
                  Speed
                </button>
                {usableSubtitles.length > 0 && !isEmbeddableVideo && (
                  <button
                    className={cn("player-settings-tab", settingsOpen === "subtitles" && "active")}
                    onClick={() => setSettingsOpen("subtitles")}
                  >
                    Subtitles
                  </button>
                )}
              </div>

              {settingsOpen === "speed" && (
                <div className="player-settings-options">
                  {PLAYBACK_RATES.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => { onChangeRate(rate); setSettingsOpen(null); }}
                      className={cn("player-settings-option", playbackRate === rate && "active")}
                    >
                      {playbackRate === rate && <Check className="h-3 w-3 mr-2 text-red-400" />}
                      {rate}×
                    </button>
                  ))}
                </div>
              )}

              {settingsOpen === "subtitles" && (
                <div className="player-settings-options">
                  <button
                    onClick={() => { onSubtitleChange(null); setSettingsOpen(null); }}
                    className={cn("player-settings-option", !activeSubtitleId && "active")}
                  >
                    {!activeSubtitleId && <Check className="h-3 w-3 mr-2 text-red-400" />}
                    Off
                  </button>
                  {usableSubtitles.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => { onSubtitleChange(track.id); setSettingsOpen(null); }}
                      className={cn("player-settings-option", activeSubtitleId === track.id && "active")}
                    >
                      {activeSubtitleId === track.id && <Check className="h-3 w-3 mr-2 text-red-400" />}
                      {track.label}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gradient fade */}
        <div className="player-chrome-gradient" />

        {/* Floating dock */}
        <AnimatePresence>
          {visible && (
            <motion.div
              key="dock"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="player-dock pointer-events-auto mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className={cn("player-dock-inner", isDesktop && "player-dock-inner--desktop")}>
                {/* Scrubber */}
                <div className="player-dock-scrubber">
                  <PlayerScrubber
                    currentTime={currentTime}
                    duration={duration}
                    bufferedTime={bufferedTime}
                    showTimes={false}
                    expanded={true}
                    onSeekStart={onSeekStart}
                    onSeek={onSeek}
                    onSeekEnd={onSeekEnd}
                  />
                </div>

                {/* Transport row */}
                <div className="player-transport">
                  {/* Left: play, skip, time */}
                  <div className="player-transport-left">
                    <DockButton
                      label={isPaused ? "Play" : "Pause"}
                      onClick={onTogglePlay}
                      large
                    >
                      {isPaused ? (
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      ) : (
                        <Pause className="h-5 w-5 fill-current" />
                      )}
                    </DockButton>

                    <DockButton label="Rewind 10s" onClick={() => onSkip(-10)}>
                      <SkipBack className="h-4 w-4" />
                    </DockButton>

                    <DockButton label="Forward 10s" onClick={() => onSkip(10)}>
                      <SkipForward className="h-4 w-4" />
                    </DockButton>

                    {/* Volume (desktop) */}
                    {isDesktop && (
                      <div
                        className="player-volume-wrap relative flex items-center"
                        onMouseEnter={handleVolumeEnter}
                        onMouseLeave={handleVolumeLeave}
                      >
                        <DockButton label="Volume" onClick={onToggleMute}>
                          <VolumeIcon className="h-4 w-4" />
                        </DockButton>
                        <AnimatePresence>
                          {volumeOpen && (
                            <motion.div
                              key="vol-slider"
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 72 }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                              className="player-volume-slider-wrap overflow-hidden"
                            >
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={isMuted ? 0 : Math.round(volume * 100)}
                                onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                                className="player-volume-input"
                                aria-label="Volume"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Time */}
                    <span className="player-time-display">
                      <span className="text-white/90">{formatTime(currentTime)}</span>
                      <span className="text-white/40 mx-0.5">/</span>
                      <span className="text-white/55">{formatTime(duration)}</span>
                    </span>
                  </div>

                  {/* Right: settings, pip, fullscreen */}
                  <div className="player-transport-right">
                    {isPipAvailable && (
                      <DockButton label="Picture in picture" onClick={onTogglePip}>
                        <Monitor className={cn("h-4 w-4", isPipActive && "text-red-400")} />
                      </DockButton>
                    )}

                    <DockButton
                      label="Settings"
                      onClick={() =>
                        setSettingsOpen((prev) => (prev ? null : "speed"))
                      }
                      active={!!settingsOpen}
                    >
                      <Settings className="h-4 w-4" />
                    </DockButton>

                    {!isDesktop && (
                      <DockButton label="Fullscreen" onClick={onToggleFullscreen}>
                        {isFullscreen ? (
                          <Minimize className="h-4 w-4" />
                        ) : (
                          <Maximize className="h-4 w-4" />
                        )}
                      </DockButton>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mini progress (when controls hidden) */}
        {!visible && (
          <div className="player-mini-progress">
            <div
              className="player-mini-progress-fill"
              style={{
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

/* ── Dock Button ── */
function DockButton({
  children,
  label,
  onClick,
  large = false,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  large?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "player-dock-btn",
        large && "player-dock-btn--large",
        active && "player-dock-btn--active",
      )}
    >
      {children}
    </button>
  );
}
