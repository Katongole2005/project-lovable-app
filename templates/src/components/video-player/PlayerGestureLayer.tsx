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
    <div
      className="video-player-gestures absolute inset-x-0 top-0 z-[40] flex"
      style={{ bottom: "var(--player-chrome-height, 112px)" }}
    >
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
            <span className="rounded-xl bg-black/65 px-4 py-2 text-base font-bold text-white">
              {flash.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
