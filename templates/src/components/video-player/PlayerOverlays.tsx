"use client";
import { motion } from "framer-motion";
import { RotateCcw, SkipForward, X, Play, Download, ExternalLink, FileVideo } from "lucide-react";
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

type PlayerMkvOverlayProps = {
  activeTitle: string;
  posterUrl: string | null;
  videoUrl: string;
  onDownload: () => void;
  onTryAnyway: () => void;
  onClose: () => void;
};

export function PlayerMkvOverlay({
  activeTitle,
  posterUrl,
  videoUrl,
  onDownload,
  onTryAnyway,
  onClose,
}: PlayerMkvOverlayProps) {
  // Construct deep links
  const streamUrl = videoUrl.replace(/^https?:\/\//, '');
  const vlcDeepLink = `vlc://${streamUrl}`;
  const mxPlayerDeepLink = `intent://${streamUrl}#Intent;scheme=https;type=video/*;package=com.mxtech.videoplayer.ad;end`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 p-6"
    >
      {posterUrl && (
        <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-15 blur-md" />
      )}
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/80 p-7 text-center shadow-2xl backdrop-blur-xl flex flex-col items-center">
        <div className="h-14 w-14 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-500 mb-4 shadow-[0_0_20px_rgba(249,115,22,0.15)] animate-pulse">
          <FileVideo className="h-6 w-6" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-500">Format Compatibility</p>
        <h3 className="mt-2 text-2xl font-black text-white">{activeTitle}</h3>
        <p className="mt-3 text-xs leading-relaxed text-white/60 text-center max-w-sm">
          This movie is in Matroska (.mkv) container format. Direct browser streaming is not supported. Play instantly in VLC Player or download to watch offline.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 w-full">
          {/* VLC Deep Link Button */}
          <a
            href={vlcDeepLink}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-5 text-xs font-bold text-white transition-all transform active:scale-95 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
          >
            <Play className="h-4 w-4 fill-white" />
            Play in VLC Player (Stream Live)
          </a>

          {/* MX Player for Android */}
          <a
            href={mxPlayerDeepLink}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 text-xs font-bold text-white transition-all transform active:scale-95 md:hidden"
          >
            <ExternalLink className="h-4 w-4" />
            Play in MX Player (Android)
          </a>

          {/* High-Speed Download */}
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white hover:bg-zinc-200 px-5 text-xs font-bold text-black transition-all transform active:scale-95"
          >
            <Download className="h-4 w-4" />
            Download Movie (High Speed)
          </button>

          {/* Close Player */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 px-5 text-xs font-bold text-white/70 transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
            Close Player
          </button>
        </div>

        {/* Quick assistance download links */}
        <div className="mt-6 border-t border-white/5 pt-4 w-full text-center">
          <p className="text-[10px] text-white/45 leading-relaxed">
            Don't have VLC installed? Get it free for your device:<br />
            <span className="flex items-center justify-center gap-2 mt-2">
              <a href="https://www.videolan.org/vlc/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">PC/Mac</a>
              <span className="text-white/20">•</span>
              <a href="https://play.google.com/store/apps/details?id=org.videolan.vlc" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Android</a>
              <span className="text-white/20">•</span>
              <a href="https://apps.apple.com/app/vlc-for-mobile/id650377962" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">iPhone</a>
            </span>
          </p>
          
          <button 
            type="button"
            onClick={onTryAnyway}
            className="text-[10px] text-white/30 hover:text-white/50 underline cursor-pointer mt-4 block mx-auto transition-colors"
          >
            Try Web Player Streaming Anyway
          </button>
        </div>
      </div>
    </motion.div>
  );
}
