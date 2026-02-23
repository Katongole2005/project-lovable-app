import { Play, X } from "lucide-react";
import type { ContinueWatching } from "@/types/movie";
import { getImageUrl } from "@/lib/api";
import { removeContinueWatching } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface ContinueWatchingRowProps {
  items: ContinueWatching[];
  onResume: (item: ContinueWatching) => void;
  onRemove: (id: string) => void;
  className?: string;
}

export function ContinueWatchingRow({ items, onResume, onRemove, className }: ContinueWatchingRowProps) {
  if (items.length === 0) return null;

  return (
    <section className={cn("py-4", className)}>
      <h2 className="text-lg md:text-xl font-display font-semibold text-foreground tracking-tight mb-5">
        Continue Watching
      </h2>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {items.map((item, index) => (
          <ContinueWatchingCard
            key={item.id}
            item={item}
            onResume={onResume}
            onRemove={onRemove}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function ContinueWatchingCard({
  item,
  onResume,
  onRemove,
  index,
}: {
  item: ContinueWatching;
  onResume: (item: ContinueWatching) => void;
  onRemove: (id: string) => void;
  index: number;
}) {
  const progressPercent = item.duration > 0 ? Math.round((item.progress / item.duration) * 100) : 0;
  const remainingMin = Math.max(1, Math.round((item.duration - item.progress) / 60));

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(item.id);
    },
    [item.id, onRemove]
  );

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 w-[260px] sm:w-[280px] cursor-pointer snap-start press-effect",
        "opacity-0 animate-scale-in",
        `stagger-${Math.min(index + 1, 8)}`
      )}
      onClick={() => onResume(item)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden rounded-xl bg-card shadow-card card-hover">
        <img
          src={getImageUrl(item.image)}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/80"
        >
          <X className="w-3.5 h-3.5 text-foreground" />
        </button>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          <h3 className="text-sm font-semibold text-white line-clamp-1 drop-shadow-md">
            {item.title}
          </h3>
          <p className="text-[11px] text-white/70 font-medium">
            {remainingMin} min remaining
          </p>
          {/* Progress bar */}
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
