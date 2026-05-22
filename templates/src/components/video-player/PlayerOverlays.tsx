"use client";
import { motion } from "framer-motion";
import { RotateCcw, SkipForward, X } from "lucide-react";
import type { Movie, Series } from "@/types/movie";

type BufferingOverlayProps = {
  activeTitle: string;
  activeMovie: Movie | Series | null;
};

export function BufferingOverlay({ activeTitle, activeMovie }: BufferingOverlayProps) {
  return (
    <div className="video-player-buffering absolute inset-0 z-[25] flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-sm">
      <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-white/15 border-t-white" />
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">Buffering</p>
      {activeMovie?.logo_url ? (
        <img src={activeMovie.logo_url} alt={activeTitle} className="h-5 object-contain opacity-80" />
      ) : (
        <p className="max-w-[70vw] truncate text-xs font-semibold text-white/55">{activeTitle}</p>
      )}
    </div>
  );
}

type ErrorOverlayProps = {
  message: string;
  onRetry: () => void;
  onClose: () => void;
};

export function ErrorOverlay({ message, onRetry, onClose }: ErrorOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 px-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/85 p-6 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-lg font-bold text-white">Playback interrupted</p>
        <p className="mt-2 text-xs leading-relaxed text-white/60">{message}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-bold text-white/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type EndedOverlayProps = {
  activeTitle: string;
  posterUrl: string | null;
  hasNextEpisode: boolean;
  onReplay: () => void;
  onPlayNext?: () => void;
  onClose: () => void;
};

export function EndedOverlay({
  activeTitle,
  posterUrl,
  hasNextEpisode,
  onReplay,
  onPlayNext,
  onClose,
}: EndedOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-6"
    >
      {posterUrl && (
        <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 blur-md" />
      )}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/80 p-7 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-500">Finished</p>
        <h3 className="mt-2 text-2xl font-black text-white">{activeTitle}</h3>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 text-xs font-bold text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Replay
          </button>
          {hasNextEpisode && onPlayNext && (
            <button
              type="button"
              onClick={onPlayNext}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 text-xs font-bold text-white"
            >
              Next episode
              <SkipForward className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-xs font-bold text-white/70"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
}
