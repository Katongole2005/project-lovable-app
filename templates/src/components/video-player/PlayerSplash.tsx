import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Play, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Movie, Series } from "@/types/movie";
import type { CSSProperties } from "react";

type PlayerSplashProps = {
  activeTitle: string;
  activeMovie: Movie | Series | null;
  posterUrl: string | null;
  year?: number;
  primaryGenre: string;
  runtimeLabel: string | null;
  rating: string;
  splashGradientStyle: CSSProperties;
  showSplashDetails: boolean;
  onToggleDetails: () => void;
  onClose: () => void;
  onPlay: () => void;
};

export function PlayerSplash({
  activeTitle,
  activeMovie,
  posterUrl,
  year,
  primaryGenre,
  runtimeLabel,
  rating,
  splashGradientStyle,
  showSplashDetails,
  onToggleDetails,
  onClose,
  onPlay,
}: PlayerSplashProps) {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="video-player-splash absolute inset-0 z-20 flex flex-col items-center justify-end overflow-hidden bg-[var(--poster-gradient-surface)] px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:justify-center"
      style={splashGradientStyle}
    >
      {posterUrl ? (
        <>
          <img
            src={posterUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-90 md:scale-110 md:blur-2xl"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--poster-gradient-top)_0%,var(--poster-gradient-middle)_42%,var(--poster-gradient-bottom)_100%)]" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(19,160,255,0.42),transparent_45%),linear-gradient(180deg,#06a4df_0%,#0551b8_58%,#03143e_100%)]" />
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Close player"
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/45 text-white backdrop-blur-xl transition hover:bg-white/10 active:scale-95"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      <div className="pointer-events-none absolute inset-x-0 top-[8vh] z-10 flex flex-col items-center px-6 text-center md:top-12">
        {activeMovie?.logo_url ? (
          <img
            src={activeMovie.logo_url}
            alt={activeTitle}
            className="max-h-20 w-auto max-w-[78vw] object-contain drop-shadow-2xl md:max-h-24"
          />
        ) : (
          <h2 className="max-w-[85vw] text-3xl font-black leading-tight tracking-tight text-white drop-shadow-2xl md:text-5xl">
            {activeTitle}
          </h2>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.4 }}
        className="relative z-10 mt-20 flex w-full max-w-md flex-col items-center text-center"
      >
        <p className="max-w-full truncate text-lg font-bold text-white md:text-xl">{activeTitle}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-white/75">
          {year && <span className="rounded-md bg-white/10 px-2 py-0.5">{year}</span>}
          <span className="rounded-md bg-white/10 px-2 py-0.5">{primaryGenre}</span>
          {runtimeLabel && <span className="rounded-md bg-white/10 px-2 py-0.5">{runtimeLabel}</span>}
        </div>

        <div className="mt-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={cn(
                "h-3.5 w-3.5",
                index < Math.round(Number(rating))
                  ? "fill-[#ff9f1c] text-[#ff9f1c]"
                  : "text-white/25",
              )}
            />
          ))}
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={onPlay}
          aria-label={`Play ${activeTitle}`}
          className="video-player-play-orb relative mt-8 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.35)]"
        >
          <Play className="ml-1 h-8 w-8 fill-current" />
        </motion.button>

        {activeMovie?.description && (
          <>
            <button
              type="button"
              onClick={onToggleDetails}
              className="mt-5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/55 hover:text-white"
            >
              {showSplashDetails ? "Hide synopsis" : "Show synopsis"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition", showSplashDetails && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showSplashDetails && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-xs leading-relaxed text-white/70"
                >
                  {activeMovie.description}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
