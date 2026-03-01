import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect } from "react";

interface StarRatingProps {
  rating: number | null;
  onRate: (rating: number) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Simple confetti burst using CSS */
function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full animate-confetti"
          style={{
            background: ["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4"][i],
            animationDelay: `${i * 40}ms`,
            transform: `rotate(${i * 45}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx, 20px), var(--ty, -30px)) scale(0); }
        }
        .animate-confetti {
          animation: confetti 0.6s ease-out forwards;
        }
        .animate-confetti:nth-child(1) { --tx: -15px; --ty: -25px; }
        .animate-confetti:nth-child(2) { --tx: 0px; --ty: -30px; }
        .animate-confetti:nth-child(3) { --tx: 15px; --ty: -25px; }
        .animate-confetti:nth-child(4) { --tx: 22px; --ty: -10px; }
        .animate-confetti:nth-child(5) { --tx: -22px; --ty: -10px; }
        .animate-confetti:nth-child(6) { --tx: -18px; --ty: -18px; }
        .animate-confetti:nth-child(7) { --tx: 10px; --ty: -28px; }
        .animate-confetti:nth-child(8) { --tx: 18px; --ty: -18px; }
      `}</style>
    </div>
  );
}

export function StarRating({ rating, onRate, size = "md", className }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const iconSize = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  const handleRate = useCallback((star: number) => {
    onRate(star);
    if (star === 5) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 700);
    }
  }, [onRate]);

  return (
    <div className={cn("relative flex items-center gap-0.5", className)}>
      <ConfettiBurst active={showConfetti} />
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || rating || 0);
        return (
          <button
            key={star}
            onClick={(e) => { e.stopPropagation(); handleRate(star); }}
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
