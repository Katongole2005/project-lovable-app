import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  style?: React.CSSProperties;
}

/**
 * Progressive blur-up image: shows a blurred low-opacity placeholder,
 * then fades in the full image once loaded.
 */
export function BlurImage({ src, alt, className, loading = "lazy", style }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Blurred placeholder shimmer */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted/40 shimmer" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-all duration-500",
          loaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-lg scale-105",
          className
        )}
        loading={loading}
        onLoad={handleLoad}
        style={style}
      />
    </div>
  );
}
