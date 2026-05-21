import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatTime } from "./utils";

type PlayerScrubberProps = {
  currentTime: number;
  duration: number;
  bufferedTime: number;
  showTimes?: boolean;
  expanded?: boolean;
  onSeekStart: () => void;
  onSeek: (time: number) => void;
  onSeekEnd: () => void;
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
  const activeRatio =
    isScrubbing || hoverRatio === null ? playedRatio : hoverRatio;
  const previewTime = hoverRatio !== null && !isScrubbing ? hoverRatio * safeDuration : null;
  const thumbOffset = expanded ? 7 : 5;

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
    if (isScrubbing) {
      commitScrub(e.clientX);
      return;
    }
    setHoverRatio(ratioFromClientX(e.clientX));
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

  return (
    <div className={cn("video-player-scrubber w-full", expanded ? "py-1" : "py-0.5")}>
      <div className={cn("flex w-full items-center gap-3", !showTimes && "gap-0")}>
        {showTimes && (
          <span className="min-w-[52px] shrink-0 text-right text-xs font-semibold tabular-nums text-white/90">
            {formatTime(currentTime)}
          </span>
        )}

        <div
          ref={trackRef}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={currentTime}
          aria-disabled={!canSeek}
          className={cn(
            "relative flex-1 cursor-pointer touch-none select-none",
            expanded ? "h-7" : "h-5",
            !canSeek && "cursor-not-allowed opacity-60",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          <AnimatePresence>
            {previewTime !== null && expanded && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="pointer-events-none absolute bottom-full z-50 mb-2 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[11px] font-bold text-white"
                style={{ left: `${(hoverRatio ?? 0) * 100}%` }}
              >
                {formatTime(previewTime)}
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className={cn(
              "absolute left-0 right-0 top-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-white/25",
              expanded ? "h-1" : "h-[3px]",
              (isScrubbing || hoverRatio !== null) && "h-1.5",
            )}
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/35"
              style={{ width: `${bufferedRatio * 100}%` }}
            />
            <div
              className="video-player-scrubber-played absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${activeRatio * 100}%` }}
            />
          </div>

          {canSeek && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform",
                expanded ? "h-3.5 w-3.5" : "h-2.5 w-2.5",
                (isScrubbing || hoverRatio !== null) && "scale-110",
              )}
              style={{ left: `calc(${activeRatio * 100}% - ${thumbOffset}px)` }}
            />
          )}
        </div>

        {showTimes && (
          <span className="min-w-[52px] shrink-0 text-xs font-semibold tabular-nums text-white/70">
            {formatTime(safeDuration)}
          </span>
        )}
      </div>
    </div>
  );
}
