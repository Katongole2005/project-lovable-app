import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StarRatingProps {
  rating: number | null;
  onRate: (rating: number) => void;
  size?: "sm" | "md";
  className?: string;
}

export function StarRating({ rating, onRate, size = "md", className }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const iconSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || rating || 0);
        return (
          <button
            key={star}
            onClick={(e) => { e.stopPropagation(); onRate(star); }}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-0.5 transition-transform duration-150 hover:scale-125 active:scale-90"
          >
            <Star
              className={cn(
                iconSize,
                "transition-colors duration-150",
                filled
                  ? "text-[hsl(45,100%,51%)] fill-[hsl(45,100%,51%)]"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
      {rating && (
        <span className="ml-1.5 text-xs text-muted-foreground font-medium">
          {rating}/5
        </span>
      )}
    </div>
  );
}
