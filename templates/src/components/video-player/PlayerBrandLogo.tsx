"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type PlayerBrandLogoProps = {
  visible: boolean;
  title: string;
  logoUrl?: string | null;
};

export function PlayerBrandLogo({ visible, title, logoUrl }: PlayerBrandLogoProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="video-player-brand-logo pointer-events-none absolute inset-x-0 top-[max(4.5rem,calc(env(safe-area-inset-top)_+_3.5rem))] z-[58] flex justify-center px-8"
          style={{ bottom: "var(--player-chrome-height, 112px)" }}
        >
          <div className="flex max-w-[min(90vw,520px)] flex-col items-center text-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className={cn(
                  "w-auto max-w-full object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.85)]",
                  "max-h-[4.5rem] sm:max-h-[5.5rem] md:max-h-[7rem]",
                )}
              />
            ) : (
              <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-2xl sm:text-3xl md:text-4xl">
                {title}
              </h2>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
