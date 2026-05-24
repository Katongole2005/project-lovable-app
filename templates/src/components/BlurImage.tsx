"use client";
import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}

/**
 * Progressive image load using Next.js Image component for ultimate speed.
 * Serves modern WebP/AVIF formats on the fly and utilizes edge optimization.
 */
export function BlurImage({ src, alt, className, loading = "lazy" }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  if (!src) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-muted/60 via-card to-muted/35" />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-muted/60 via-card to-muted/35">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 30vw, 20vw"
        priority={loading === "eager"}
        className={cn(
          "object-cover transition-opacity duration-400 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
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
