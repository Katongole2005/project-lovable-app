"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type HeroMediaImageProps = {
  primarySrc: string | null;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function HeroMediaImage({
  primarySrc,
  fallbackSrc,
  alt,
  className,
  priority = false,
}: HeroMediaImageProps) {
  const [resolvedSrc, setResolvedSrc] = React.useState(primarySrc ?? fallbackSrc ?? "");
  const [usedFallback, setUsedFallback] = React.useState(false);

  React.useEffect(() => {
    setResolvedSrc(primarySrc ?? fallbackSrc ?? "");
    setUsedFallback(false);
  }, [primarySrc, fallbackSrc]);

  if (!resolvedSrc) return null;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={cn(className)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      onError={() => {
        if (!usedFallback && fallbackSrc && resolvedSrc !== fallbackSrc) {
          setUsedFallback(true);
          setResolvedSrc(fallbackSrc);
        }
      }}
    />
  );
}
