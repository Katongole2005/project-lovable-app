import { cn } from "@/lib/utils";

/**
 * Premium shimmer skeleton for movie cards with pulsing gradient.
 */
export function PremiumMovieCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex-shrink-0", className)}>
      <div className="aspect-[2/3] rounded-2xl bg-card overflow-hidden relative border border-border/30">
        {/* Multi-layer shimmer */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40 animate-pulse" />
        <div className="absolute inset-0 shimmer opacity-50" />
        {/* Fake poster shape silhouette */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
          <div className="h-3 bg-muted/40 rounded-full w-2/3 shimmer" />
          <div className="h-2 bg-muted/30 rounded-full w-1/3 shimmer" style={{ animationDelay: "0.3s" }} />
        </div>
        {/* Corner badge skeleton */}
        <div className="absolute top-2 left-2 h-4 w-10 rounded-full bg-muted/30 shimmer" style={{ animationDelay: "0.15s" }} />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-muted/30 rounded-lg shimmer w-4/5" />
        <div className="flex gap-2">
          <div className="h-3 bg-muted/20 rounded-lg shimmer w-10" style={{ animationDelay: "0.1s" }} />
          <div className="h-3 bg-muted/20 rounded-lg shimmer w-8" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    </div>
  );
}
