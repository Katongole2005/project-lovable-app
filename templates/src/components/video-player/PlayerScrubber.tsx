"use client";
import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatTime } from "./utils";

import { SkipSegment } from "@/types/movie";

type PlayerScrubberProps = {
  currentTime: number;
  duration: number;
  bufferedTime: number;
  showTimes?: boolean;
  expanded?: boolean;
  onSeekStart: () => void;
  onSeek: (time: number) => void;
  onSeekEnd: () => void;
  skipSegments?: SkipSegment[];
};

export function PlayerScrubber({
  currentTime,
  duration,
  bufferedTime,
  showTimes = true,
  expanded = true,
  onSeekStart,
  onSeek,
  onSeekEnd,
  skipSegments = [],
}: PlayerScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const canSeek = safeDuration > 0;

  const ratioFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !canSeek) return 0;
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    },
    [canSeek],
  );

  const timeFromClientX = useCallback(
    (clientX: number) => ratioFromClientX(clientX) * safeDuration,
    [ratioFromClientX, safeDuration],
  );

  const playedRatio = canSeek ? currentTime / safeDuration : 0;
  const bufferedRatio = canSeek ? Math.min(1, bufferedTime / safeDuration) : 0;
  
  // During scrubbing, track the scrub cursor. During idle hover, track the playback playedRatio.
  const activeRatio = isScrubbing ? (hoverRatio ?? playedRatio) : playedRatio;
  const previewTime = hoverRatio !== null && !isScrubbing ? hoverRatio * safeDuration : null;

  const commitScrub = (clientX: number) => {
    if (!canSeek) return;
    onSeek(timeFromClientX(clientX));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!canSeek) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsScrubbing(true);
    onSeekStart();
    commitScrub(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!canSeek) return;
    const ratio = ratioFromClientX(e.clientX);
    setHoverRatio(ratio);
    if (isScrubbing) {
      commitScrub(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isScrubbing) {
      commitScrub(e.clientX);
      onSeekEnd();
      setIsScrubbing(false);
    }
    setHoverRatio(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }
  };

  const handlePointerLeave = () => {
    if (!isScrubbing) setHoverRatio(null);
  };

  const isHovering = hoverRatio !== null || isScrubbing;

  return (
    <div className={cn("player-scrubber-root w-full select-none", expanded ? "py-1" : "py-0.5")}>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={safeDuration}
        aria-valuenow={currentTime}
        aria-disabled={!canSeek}
        className={cn(
          "player-scrubber-track relative w-full cursor-pointer touch-none",
          expanded ? "h-8" : "h-5",
          !canSeek && "cursor-not-allowed opacity-60",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {/* Time preview tooltip */}
        <AnimatePresence>
          {previewTime !== null && expanded && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute bottom-full z-50 mb-3 -translate-x-1/2"
              style={{ left: `${(hoverRatio ?? 0) * 100}%` }}
            >
              <div className="player-scrubber-tooltip">
                {formatTime(previewTime)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rail */}
        <div
          className={cn(
            "player-scrubber-rail absolute left-0 right-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full",
            isHovering ? "h-1.5" : "h-1",
          )}
          style={{ transition: "height 0.15s ease" }}
        >
          {/* Track background */}
          <div className="absolute inset-0 bg-white/15 rounded-full" />

          {/* Buffered progress */}
          <div
            className="player-scrubber-buffered absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${bufferedRatio * 100}%` }}
          />

          {/* Hover preview progress */}
          {hoverRatio !== null && !isScrubbing && (
            <div
              className="absolute inset-y-0 left-0 bg-white/20 rounded-full pointer-events-none"
              style={{ width: `${hoverRatio * 100}%` }}
            />
          )}

          {/* Skip Segments / Chapters */}
          {skipSegments && skipSegments.map((segment, idx) => {
            if (!safeDuration) return null;
            const startPct = (segment.startTime / safeDuration) * 100;
            const endPct = (segment.endTime / safeDuration) * 100;
            const widthPct = endPct - startPct;
            if (widthPct <= 0) return null;
            
            return (
              <div 
                key={idx}
                className="absolute inset-y-0 bg-[#e50914]/25 border-x border-black/45 hover:bg-[#e50914]/40 transition-colors pointer-events-none"
                style={{
                  left: `${startPct}%`,
                  width: `${widthPct}%`
                }}
                title={segment.label}
              />
            );
          })}

          {/* Played progress */}
          <div
            className="player-scrubber-played absolute inset-y-0 left-0 rounded-full animate-pulse-subtle"
            style={{ width: `${activeRatio * 100}%` }}
          />
        </div>

        {/* Thumb */}
        {canSeek && (
          <motion.div
            className="player-scrubber-thumb pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e50914] shadow-lg border border-white/20"
            style={{ left: `${activeRatio * 100}%` }}
            animate={{
              scale: isHovering ? 1.3 : 1,
              width: isHovering ? 14 : 12,
              height: isHovering ? 14 : 12,
            }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </div>

      {/* Time labels */}
      {showTimes && (
        <div className="mt-1 flex items-center justify-between">
          <span className="player-time-label">{formatTime(currentTime)}</span>
          <span className="player-time-label opacity-60">
            -{formatTime(Math.max(0, safeDuration - currentTime))}
          </span>
        </div>
      )}
    </div>
  );
}
