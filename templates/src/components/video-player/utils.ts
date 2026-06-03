"use client";
import type { PosterGradient } from "./types";

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export const fallbackPosterGradient: PosterGradient = {
  top: "rgba(0,0,0,0.24)",
  middle: "rgba(0,0,0,0.10)",
  bottom: "rgba(0,0,0,0.88)",
  surface: "#05070d",
};

export const formatRuntimeLabel = (minutes?: number) => {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const toRgba = (color: { r: number; g: number; b: number }, alpha: number) =>
  `rgba(${color.r},${color.g},${color.b},${alpha})`;

const mixWithBlack = (color: { r: number; g: number; b: number }, amount: number) => ({
  r: Math.round(color.r * (1 - amount)),
  g: Math.round(color.g * (1 - amount)),
  b: Math.round(color.b * (1 - amount)),
});

export const extractPosterGradient = (imageUrl: string): Promise<PosterGradient | null> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(null);
      return;
    }

    const parsedUrl = (() => {
      try {
        return new URL(imageUrl, (typeof window !== "undefined" ? window.location : { origin: "", pathname: "", search: "", href: "" }).origin);
      } catch {
        return null;
      }
    })();

    if (parsedUrl?.hostname === "image.tmdb.org") {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = 24;
        const height = 36;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(image, 0, 0, width, height);
        const pixels = ctx.getImageData(0, 0, width, height).data;

        const sampleBand = (fromY: number, toY: number) => {
          let r = 0;
          let g = 0;
          let b = 0;
          let total = 0;

          for (let y = fromY; y < toY; y += 1) {
            for (let x = 0; x < width; x += 1) {
              const index = (y * width + x) * 4;
              const alpha = pixels[index + 3];
              if (alpha < 150) continue;

              const pr = pixels[index];
              const pg = pixels[index + 1];
              const pb = pixels[index + 2];
              const max = Math.max(pr, pg, pb);
              const min = Math.min(pr, pg, pb);
              const saturation = max === 0 ? 0 : (max - min) / max;
              const brightness = max / 255;
              const weight = 0.55 + saturation * 1.7 + Math.max(0, brightness - 0.18);

              r += pr * weight;
              g += pg * weight;
              b += pb * weight;
              total += weight;
            }
          }

          if (!total) return { r: 6, g: 8, b: 14 };

          return {
            r: Math.round(r / total),
            g: Math.round(g / total),
            b: Math.round(b / total),
          };
        };

        const topColor = sampleBand(0, Math.floor(height * 0.35));
        const middleColor = sampleBand(Math.floor(height * 0.35), Math.floor(height * 0.68));
        const bottomColor = sampleBand(Math.floor(height * 0.68), height);
        const surfaceColor = mixWithBlack(bottomColor, 0.72);

        resolve({
          top: toRgba(mixWithBlack(topColor, 0.18), 0.36),
          middle: toRgba(mixWithBlack(middleColor, 0.1), 0.18),
          bottom: toRgba(surfaceColor, 0.96),
          surface: `rgb(${surfaceColor.r},${surfaceColor.g},${surfaceColor.b})`,
        });
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    if (imageUrl.includes("?")) {
      image.src = `${imageUrl}&cors=1`;
    } else {
      image.src = `${imageUrl}?cors=1`;
    }
  });
};

export const isEmbeddableUrl = (url: string) =>
  /youtube\.com|youtu\.be|drive\.google\.com|vimeo\.com/i.test(url);

export const detectPlayerLayout = (
  isTouchDevice: boolean,
  isLandscape: boolean,
  width: number,
): "mobile-portrait" | "mobile-landscape" | "desktop" => {
  if (!isTouchDevice && width >= 1024) return "desktop";
  if (isLandscape || width >= 900) return "mobile-landscape";
  return "mobile-portrait";
};
