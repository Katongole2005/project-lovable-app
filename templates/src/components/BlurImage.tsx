"use client";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}

/**
 * Progressive image load: shimmer placeholder, then opacity fade-in.
 * Avoids animating CSS filter (slow in Chromium).
 */
export function BlurImage({ src, alt, className, loading = "lazy" }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-muted/60 via-card to-muted/35">
      <img
        src={src}
        alt={alt}
        decoding="async"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-400 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading={loading}
        onLoad={handleLoad}
      />
      <div
        className={cn(
          "absolute inset-0 bg-muted/40 shimmer transition-opacity duration-400 pointer-events-none",
          loaded ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
}
