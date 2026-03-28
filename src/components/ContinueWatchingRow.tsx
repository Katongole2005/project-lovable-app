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
    <section className={cn("py-6", className)}>
      <h2 className="section-title text-lg md:text-xl font-display font-semibold text-foreground tracking-tight mb-6" data-testid="text-section-continue-watching">
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
      data-testid={`card-continue-${item.id}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl shadow-card card-hover"
        style={{
          boxShadow: "0 8px 32px hsl(230 60% 5% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.04)",
        }}
      >
        <img
          src={getImageUrl(item.image)}
          alt={item.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="play-ring-pulse w-11 h-11 rounded-full bg-primary/90 backdrop-blur flex items-center justify-center shadow-[0_0_20px_hsl(210_100%_60%/0.4)] transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>

        <button
          onClick={handleRemove}
          data-testid={`button-remove-${item.id}`}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/80 border border-white/[0.08]"
        >
          <X className="w-3.5 h-3.5 text-white/90" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
          <h3 className="text-sm font-semibold text-white line-clamp-1 drop-shadow-md" data-testid={`text-continue-title-${item.id}`}>
            {item.title}
          </h3>
          {item.seasonNumber && item.episodeNumber && (
            <p className="text-[11px] text-white/70 font-medium">
              S{item.seasonNumber} E{item.episodeNumber}
            </p>
          )}
          <p className="text-[11px] text-white/60 font-medium">
            {remainingMin} min remaining
          </p>
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
