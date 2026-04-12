import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
}

/**
 * Progressive blur-up image: shows a blurred low-opacity placeholder,
 * then fades in the full image once loaded.
 */
export function BlurImage({ src, alt, className, loading = "lazy" }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={src}
        alt={alt}
        decoding="async"
        className={cn(
          "w-full h-full object-cover transition-[transform,filter] duration-500",
          loaded ? "blur-0 scale-100" : "blur-lg scale-105",
          className
        )}
        loading={loading}
        onLoad={handleLoad}
      />
      {/* Blurred placeholder shimmer overlay - fading out instead of waiting for opacity-0 img */}
      <div 
        className={cn(
          "absolute inset-0 bg-muted/40 shimmer transition-opacity duration-500 pointer-events-none",
          loaded ? "opacity-0" : "opacity-100"
        )} 
      />
    </div>
  );
}
