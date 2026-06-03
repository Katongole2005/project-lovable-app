"use client";
import { useCallback, useRef, useState, useEffect } from "react";
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

  // Refs for elements that require dynamic inline styles
  const bufferedRef = useRef<HTMLDivElement>(null);
  const hoverPreviewRef = useRef<HTMLDivElement>(null);
  const playedRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const skipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dividerRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Sync dynamic styles to avoid inline styles in JSX
  useEffect(() => {
    if (bufferedRef.current) {
      bufferedRef.current.style.width = `${bufferedRatio * 100}%`;
    }
  }, [bufferedRatio]);

  useEffect(() => {
    if (hoverPreviewRef.current) {
      if (hoverRatio !== null && !isScrubbing) {
        hoverPreviewRef.current.style.width = `${hoverRatio * 100}%`;
      } else {
        hoverPreviewRef.current.style.width = "0%";
      }
    }
  }, [hoverRatio, isScrubbing]);

  useEffect(() => {
    if (playedRef.current) {
      playedRef.current.style.width = `${activeRatio * 100}%`;
    }
    if (thumbRef.current) {
      thumbRef.current.style.left = `${activeRatio * 100}%`;
      thumbRef.current.style.transform = `translate(-50%, -50%) scale(${hoverRatio !== null || isScrubbing ? 1.35 : 1})`;
    }
  }, [activeRatio, hoverRatio, isScrubbing]);

  useEffect(() => {
    if (!safeDuration) return;
    
    // Apply skip segments styling
    skipSegments.forEach((segment, idx) => {
      const el = skipRefs.current[idx];
      if (el) {
        const startPct = (segment.startTime / safeDuration) * 100;
        const endPct = (segment.endTime / safeDuration) * 100;
        const widthPct = Math.max(0, endPct - startPct);
        el.style.left = `${startPct}%`;
        el.style.width = `${widthPct}%`;
      }
    });

    // Apply dividers styling
    let dividerCounter = 0;
    skipSegments.forEach((segment) => {
      const startPct = (segment.startTime / safeDuration) * 100;
      const endPct = (segment.endTime / safeDuration) * 100;

      if (startPct > 0 && startPct < 100) {
        const el = dividerRefs.current[dividerCounter++];
        if (el) {
          el.style.left = `${startPct}%`;
        }
      }
      if (endPct > 0 && endPct < 100) {
        const el = dividerRefs.current[dividerCounter++];
        if (el) {
          el.style.left = `${endPct}%`;
        }
      }
    });
  }, [skipSegments, safeDuration]);

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
        {/* Screen-reader accessible range input */}
        <input
          type="range"
          min="0"
          max={safeDuration}
          value={currentTime}
          disabled={!canSeek}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="sr-only"
          aria-label="Seek video slider"
        />

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
        >
          {/* Track background */}
          <div className="absolute inset-0 bg-white/15 rounded-full" />

          {/* Buffered progress */}
          <div
            ref={bufferedRef}
            className="player-scrubber-buffered absolute inset-y-0 left-0 rounded-full"
          />

          {/* Hover preview progress */}
          {hoverRatio !== null && !isScrubbing && (
            <div
              ref={hoverPreviewRef}
              className="absolute inset-y-0 left-0 bg-white/20 rounded-full pointer-events-none"
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
                ref={el => { skipRefs.current[idx] = el; }}
                className="absolute inset-y-0 bg-[#e50914]/25 hover:bg-[#e50914]/40 transition-colors pointer-events-none"
                title={segment.label}
              />
            );
          })}

          {/* Skip Segments Dividers (Gaps) */}
          {(() => {
            let dividerCounter = 0;
            return skipSegments.map((segment, idx) => {
              if (!safeDuration) return null;
              const startPct = (segment.startTime / safeDuration) * 100;
              const endPct = (segment.endTime / safeDuration) * 100;
              const showStart = startPct > 0 && startPct < 100;
              const showEnd = endPct > 0 && endPct < 100;
              
              const startRefIdx = showStart ? dividerCounter++ : -1;
              const endRefIdx = showEnd ? dividerCounter++ : -1;
              
              return (
                <div key={`div-${idx}`} className="absolute inset-y-0 left-0 right-0 pointer-events-none z-30">
                  {showStart && (
                    <div 
                      ref={el => { if (el) dividerRefs.current[startRefIdx] = el; }}
                      className="absolute inset-y-0 w-[3px] bg-black/90 -translate-x-1/2" 
                    />
                  )}
                  {showEnd && (
                    <div 
                      ref={el => { if (el) dividerRefs.current[endRefIdx] = el; }}
                      className="absolute inset-y-0 w-[3px] bg-black/90 -translate-x-1/2" 
                    />
                  )}
                </div>
              );
            });
          })()}

          {/* Played progress */}
          <div
            ref={playedRef}
            className="player-scrubber-played absolute inset-y-0 left-0 rounded-full animate-pulse-subtle"
          />
        </div>

        {/* Thumb */}
        {canSeek && (
          <div
            ref={thumbRef}
            className="player-scrubber-thumb absolute top-1/2 border-[1.5px] border-white bg-[#e50914]"
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
