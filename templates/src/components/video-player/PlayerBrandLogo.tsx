"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PlayerLayout } from "./types";
import type { Movie, Series } from "@/types/movie";

type PlayerBrandLogoProps = {
  visible: boolean;
  title: string;
  logoUrl?: string | null;
  activeMovie?: Movie | Series | null;
  layout?: PlayerLayout;
};

export function PlayerBrandLogo({
  visible,
  title,
  logoUrl,
  activeMovie,
  layout = "desktop",
}: PlayerBrandLogoProps) {
  // Parse episode and season info if it is a series or matches title pattern
  const episodeMatch = title.match(/\bS(\d+)\s*:\s*E(\d+)\b/i);
  const seriesInfo = episodeMatch
    ? `Season ${episodeMatch[1]} • Episode ${episodeMatch[2]}`
    : activeMovie?.type === "series"
    ? "Series"
    : null;

  // Responsive padding and spacing to respect notch / env(safe-area-inset-top)
  const containerTopClass =
    layout === "desktop"
      ? "top-[max(3rem,calc(env(safe-area-inset-top)_+_2.5rem))] px-12"
      : layout === "mobile-landscape"
      ? "top-[max(1rem,calc(env(safe-area-inset-top)_+_0.5rem))] px-6"
      : "top-[max(3.5rem,calc(env(safe-area-inset-top)_+_2.5rem))] px-8";

  // Responsive height constraints for the brand logo
  const logoMaxHeightClass =
    layout === "desktop"
      ? "max-h-[4rem] sm:max-h-[4.5rem] md:max-h-[5rem]"
      : layout === "mobile-landscape"
      ? "max-h-[1.75rem] sm:max-h-[2rem] md:max-h-[2.25rem]"
      : "max-h-[2.5rem] sm:max-h-[3rem]";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "video-player-brand-logo pointer-events-none absolute inset-x-0 z-[58] flex justify-center text-center",
            containerTopClass
          )}
          style={{ bottom: "var(--player-chrome-height, 112px)" }}
        >
          <div className="flex max-w-[min(90vw,520px)] flex-col items-center justify-start">
            {/* Movie / Series Logo Image or Clean Text Title */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className={cn(
                  "w-auto max-w-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] filter",
                  logoMaxHeightClass
                )}
              />
            ) : (
              <h2 className={cn(
                "font-black tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]",
                layout === "desktop" ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl"
              )}>
                {title.replace(/\s*-\s*S\d+\s*:\s*E\d+\b/i, "")}
              </h2>
            )}

            {/* Series Episode Info Subtitle */}
            {seriesInfo && (
              <p className={cn(
                "mt-1.5 font-bold tracking-wide text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]",
                layout === "desktop" ? "text-sm md:text-base" : "text-[11px]"
              )}>
                {seriesInfo}
              </p>
            )}

            {/* VJ Translator Glowing Premium Badge */}
            {activeMovie?.vj_name && (
              <div className="mt-2 flex items-center justify-center">
                <span className={cn(
                  "inline-flex items-center rounded-full bg-gradient-to-r from-red-600/90 to-amber-500/90 border border-amber-400/35 text-white font-black tracking-widest uppercase shadow-[0_0_12px_rgba(220,38,38,0.3)] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]",
                  layout === "desktop"
                    ? "text-[10px] md:text-[11px] px-3.5 py-0.5"
                    : "text-[9px] px-2.5 py-0.5"
                )}>
                  Translated by {activeMovie.vj_name.replace(/^VJ\s+/i, "VJ ")}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
