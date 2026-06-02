"use client";
import { useState, useRef } from "react";
import {
  Maximize,
  Minimize,
  Monitor,
  Pause,
  Play,
  RotateCw,
  RotateCcw,
  Subtitles,
  Volume1,
  Volume2,
  VolumeX,
  Settings,
  Check,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { Movie, Series, SkipSegment, SubtitleTrack } from "@/types/movie";
import { PLAYBACK_RATES, formatTime } from "./utils";
import { PlayerScrubber } from "./PlayerScrubber";
import type { PlayerLayout } from "./types";

// Native standard button components are used

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
  skipSegments?: SkipSegment[];
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
  skipSegments = [],
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
  const [settingsOpen, setSettingsOpen] = useState<"speed" | "subtitles" | null>(null);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Parse episode and season info if it is a series or matches title pattern
  const episodeMatch = activeTitle.match(/\bS(\d+)\s*:\s*E(\d+)\b/i);
  const seriesInfo = episodeMatch
    ? `Season ${episodeMatch[1]} • Episode ${episodeMatch[2]}`
    : activeMovie?.type === "series"
    ? "Series"
    : null;

  return (
    <>
      {/* ── Top Bar ── */}
      <AnimatePresence>
        {visible && (
          <motion.div
            key="top-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            className="pointer-events-auto absolute inset-x-0 top-0 z-[60] flex items-center justify-between px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-16 bg-gradient-to-b from-black/80 via-black/45 to-transparent"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to movie details"
                className="player-flat-btn"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              
              <div className="flex flex-col">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                  {activeTitle.replace(/\s*-\s*S\d+\s*:\s*E\d+\b/i, "")}
                </h1>
                {/* Series info */}
                {seriesInfo && (
                  <span className="text-[11px] sm:text-xs text-zinc-400 font-semibold mt-1">
                    {seriesInfo}
                  </span>
                )}
              </div>
            </div>

            {/* Translation Badge (top right) */}
            {activeMovie?.vj_name && (
              <span className="rounded-full bg-red-600/20 border border-red-500/30 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-red-400 px-3 py-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                VJ {activeMovie.vj_name.replace(/^VJ\s+/i, "")}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip Segment Badge ── */}
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
              right: "2rem",
            }}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSkipSegment(); }}
              className="player-skip-badge pointer-events-auto flex items-center gap-1 bg-black/85 hover:bg-[#e50914] text-white border border-white/20 hover:border-transparent rounded-full px-5 py-2 text-xs font-black uppercase tracking-widest cursor-pointer shadow-lg transition-all"
            >
              Skip {activeSkipSegment.label}
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Controls Strip ── */}
      <div
        className="player-chrome pointer-events-none absolute inset-x-0 bottom-0 z-[60]"
        style={{ "--player-chrome-height": visible ? "120px" : "44px" } as React.CSSProperties}
      >
        <AnimatePresence>
          {visible && (
            <motion.div
              key="controls-strip"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
              className="player-chrome-gradient"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {visible && (
            <motion.div
              key="bottom-controls"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
              className="player-controls-container"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {/* Timeline Scrubber */}
              <div className="player-scrubber-root">
                <PlayerScrubber
                  currentTime={currentTime}
                  duration={duration}
                  bufferedTime={bufferedTime}
                  showTimes={false}
                  expanded={true}
                  onSeekStart={onSeekStart}
                  onSeek={onSeek}
                  onSeekEnd={onSeekEnd}
                  skipSegments={skipSegments}
                />
              </div>

              {/* Transport Row */}
              <div className="player-transport-row">
                {/* Left group */}
                <div className="player-transport-left">
                  <button
                    type="button"
                    onClick={onTogglePlay}
                    className="player-flat-btn player-flat-btn--large"
                    aria-label={isPaused ? "Play" : "Pause"}
                  >
                    {isPaused ? <Play className="fill-current ml-0.5" /> : <Pause className="fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSkip(-10)}
                    className="player-flat-btn"
                    aria-label="Seek back 10 seconds"
                  >
                    <RotateCcw />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSkip(10)}
                    className="player-flat-btn"
                    aria-label="Seek forward 10 seconds"
                  >
                    <RotateCw />
                  </button>

                  {/* Volume Slider Container */}
                  <div className="player-volume-container">
                    <button
                      type="button"
                      onClick={onToggleMute}
                      className="player-flat-btn"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      <VolumeIcon />
                    </button>

                    <div className="player-volume-slider-wrapper">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={isMuted ? 0 : Math.round(volume * 100)}
                        onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                        className="player-volume-input"
                        aria-label="Volume slider"
                      />
                    </div>
                  </div>

                  {/* Time Stamps */}
                  <span className="player-time-display">
                    <span>{formatTime(currentTime)}</span>
                    <span className="mx-1 text-white/30">/</span>
                    <span className="text-white/50">{formatTime(duration)}</span>
                  </span>
                </div>

                {/* Right group */}
                <div className="player-transport-right">
                  {/* Speech Bubble Subtitles icon */}
                  {usableSubtitles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(settingsOpen === "subtitles" ? null : "subtitles")}
                      className={cn("player-flat-btn", settingsOpen === "subtitles" && "text-[#e50914] filter drop-shadow-[0_0_8px_rgba(229,9,20,0.5)]")}
                      aria-label="Subtitles"
                    >
                      <Subtitles />
                    </button>
                  )}

                  {/* Settings gear */}
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(settingsOpen === "speed" ? null : "speed")}
                    className={cn("player-flat-btn", settingsOpen === "speed" && "text-[#e50914] filter drop-shadow-[0_0_8px_rgba(229,9,20,0.5)]")}
                    aria-label="Playback settings"
                  >
                    <Settings />
                  </button>

                  {/* Picture in Picture */}
                  {isPipAvailable && (
                    <button
                      type="button"
                      onClick={onTogglePip}
                      className="player-flat-btn"
                      aria-label="Toggle picture-in-picture"
                    >
                      <Monitor className={cn(isPipActive && "text-[#e50914]")} />
                    </button>
                  )}

                  {/* Fullscreen */}
                  <button
                    type="button"
                    onClick={onToggleFullscreen}
                    className="player-flat-btn"
                    aria-label="Toggle fullscreen"
                  >
                    {isFullscreen ? <Minimize /> : <Maximize />}
                  </button>
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

        {/* Settings panel overlay (floats above chrome controls) */}
        <AnimatePresence>
          {settingsOpen && visible && (
            <motion.div
              key="settings-overlay"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
              className="player-settings-panel pointer-events-auto absolute bottom-[calc(var(--player-chrome-height,_120px)_-_1.25rem)] right-6 md:right-16 mb-2"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="player-settings-header">
                <button
                  type="button"
                  className={cn("player-settings-tab", settingsOpen === "speed" && "active")}
                  onClick={() => setSettingsOpen("speed")}
                >
                  Speed
                </button>
                {usableSubtitles.length > 0 && !isEmbeddableVideo && (
                  <button
                    type="button"
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
                      type="button"
                      onClick={() => { onChangeRate(rate); setSettingsOpen(null); }}
                      className={cn("player-settings-option", playbackRate === rate && "active")}
                    >
                      {playbackRate === rate && <Check className="h-3.5 w-3.5 mr-2 text-red-500" />}
                      <span>{rate}×</span>
                    </button>
                  ))}
                </div>
              )}

              {settingsOpen === "subtitles" && (
                <div className="player-settings-options">
                  <button
                    type="button"
                    onClick={() => { onSubtitleChange(null); setSettingsOpen(null); }}
                    className={cn("player-settings-option", !activeSubtitleId && "active")}
                  >
                    {!activeSubtitleId && <Check className="h-3.5 w-3.5 mr-2 text-red-500" />}
                    <span>Off</span>
                  </button>
                  {usableSubtitles.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => { onSubtitleChange(track.id); setSettingsOpen(null); }}
                      className={cn("player-settings-option", activeSubtitleId === track.id && "active")}
                    >
                      {activeSubtitleId === track.id && <Check className="h-3.5 w-3.5 mr-2 text-red-500" />}
                      <span>{track.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
