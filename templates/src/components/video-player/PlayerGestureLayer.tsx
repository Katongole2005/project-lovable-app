"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { GestureFlash } from "./types";

type PlayerGestureLayerProps = {
  flashes: GestureFlash[];
  onTap: (side: "left" | "right" | "center") => void;
};

/**
 * Gestures only cover the video area above the bottom chrome so controls stay clickable.
 */
export function PlayerGestureLayer({ flashes, onTap }: PlayerGestureLayerProps) {
  return (
    <div className="video-player-gestures absolute inset-x-0 top-0 z-[40] flex">
      <button
        type="button"
        aria-label="Seek backward"
        className="h-full w-[30%] touch-manipulation outline-none"
        onPointerDown={(e) => {
          e.stopPropagation();
          onTap("left");
        }}
      />
      <button
        type="button"
        aria-label="Play or pause"
        className="h-full flex-1 touch-manipulation outline-none"
        onPointerDown={(e) => {
          e.stopPropagation();
          onTap("center");
        }}
      />
      <button
        type="button"
        aria-label="Seek forward"
        className="h-full w-[30%] touch-manipulation outline-none"
        onPointerDown={(e) => {
          e.stopPropagation();
          onTap("right");
        }}
      />

      <AnimatePresence>
        {flashes.map((flash) => (
          <motion.div
            key={flash.id}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.22 }}
            className={`video-player-flash video-player-flash--${flash.side} pointer-events-none absolute flex items-center justify-center`}
          >
            {/* Ambient ripple background */}
            {(flash.side === "left" || flash.side === "right") && (
              <div className="video-player-ripple-container absolute inset-0 z-0 rounded-full" />
            )}

            {/* Premium design layout with double arrows */}
            <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/60 px-5 py-3.5 shadow-2xl backdrop-blur-md">
              {flash.side === "left" && (
                <>
                  <svg
                    className="video-player-ripple-arrow h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/95">
                    {flash.label}
                  </span>
                </>
              )}

              {flash.side === "right" && (
                <>
                  <svg
                    className="video-player-ripple-arrow h-7 w-7"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/95">
                    {flash.label}
                  </span>
                </>
              )}

              {flash.side === "center" && (
                <span className="text-xs font-bold text-white">
                  {flash.label}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
