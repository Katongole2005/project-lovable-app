"use client";
import type { ContinueWatching } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl } from "@/lib/api";
import { clearAllContinueWatching } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useCallback, useState, useEffect, useRef } from "react";

interface ContinueWatchingRowProps {
  items: ContinueWatching[];
  onResume: (item: ContinueWatching) => void;
  onRemove: (id: string) => void;
  className?: string;
}

export function ContinueWatchingRow({ items, onResume, onRemove, className }: ContinueWatchingRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [localTime, setLocalTime] = useState("");

  // Live local clock updating reactively
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      setLocalTime(`${hrs}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkScrollLimits = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    checkScrollLimits();
    el.addEventListener("scroll", checkScrollLimits, { passive: true });
    window.addEventListener("resize", checkScrollLimits, { passive: true });

    return () => {
      el.removeEventListener("scroll", checkScrollLimits);
      window.removeEventListener("resize", checkScrollLimits);
    };
  }, [items.length]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * 0.75;
    const targetScroll = direction === "left"
      ? el.scrollLeft - scrollAmount
      : el.scrollLeft + scrollAmount;

    el.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  const handleClearAll = () => {
    clearAllContinueWatching();
  };

  if (items.length === 0) return null;

  return (
    <section className={cn("relative z-10 py-8", className)}>
      {/* Header controls section */}
      <div className="mb-4 space-y-3" bis_skin_checked="1">
        <h3 className="text-base font-bold tracking-tight md:text-lg">Continue Watching</h3>
        
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" bis_skin_checked="1">
          <button
            onClick={handleClearAll}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/18 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-red-700/70 hover:shadow-[0_16px_32px_rgba(0,0,0,0.34)] sm:w-auto sm:justify-start sm:px-6 sm:text-base active:scale-[0.98] cursor-pointer"
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" className="w-5 h-5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M256.47 216.77l86.73 109.18s-16.6 102.36-76.57 150.12C206.66 523.85 0 510.19 0 510.19s3.8-23.14 11-55.43l94.62-112.17c3.97-4.7-.87-11.62-6.65-9.5l-60.4 22.09c14.44-41.66 32.72-80.04 54.6-97.47 59.97-47.76 163.3-40.94 163.3-40.94zM636.53 31.03l-19.86-25c-5.49-6.9-15.52-8.05-22.41-2.56l-232.48 177.8-34.14-42.97c-5.09-6.41-15.14-5.21-18.59 2.21l-25.33 54.55 86.73 109.18 58.8-12.45c8-1.69 11.42-11.2 6.34-17.6l-34.09-42.92 232.48-177.8c6.89-5.48 8.04-15.53 2.55-22.44z"></path>
            </svg>
            Clear All History
          </button>
          
          {localTime && (
            <span className="px-1 text-xs text-white/60 sm:ml-1 sm:px-0">
              Local: {localTime}
            </span>
          )}
        </div>
      </div>

      <div className="relative" bis_skin_checked="1">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/10 transition hover:bg-white/20 cursor-pointer active:scale-95 duration-200"
            aria-label="Scroll left"
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" className="h-5 w-5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
            </svg>
          </button>
        )}

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/10 transition hover:bg-white/20 cursor-pointer active:scale-95 duration-200"
            aria-label="Scroll right"
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" className="h-5 w-5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M285.476 272.971L91.132 467.314c-9.373 9.373-24.569 9.373-33.941 0l-22.667-22.667c-9.357-9.357-9.375-24.522-.04-33.901L188.505 256 34.484 101.255c-9.335-9.379-9.317-24.544.04-33.901l22.667-22.667c9.373-9.373 24.569-9.373 33.941 0L285.475 239.03c9.373 9.372 9.373 24.568.001 33.941z"></path>
            </svg>
          </button>
        )}

        {/* Scrolling Cards Wrapper */}
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex h-auto gap-3 overflow-x-auto overflow-y-visible pl-3 pr-3 scroll-smooth snap-x snap-mandatory md:gap-4 md:snap-none md:pl-0 md:pr-4"
          style={{ scrollbarWidth: "none" }}
          bis_skin_checked="1"
        >
          {items.map((item) => (
            <ContinueWatchingCard
              key={item.id}
              item={item}
              onResume={onResume}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ContinueWatchingCard({
  item,
  onResume,
  onRemove,
}: {
  item: ContinueWatching;
  onResume: (item: ContinueWatching) => void;
  onRemove: (id: string) => void;
}) {
  const progressPercent = item.duration > 0 ? Math.round((item.progress / item.duration) * 100) : 0;
  const watchedMin = Math.round(item.progress / 60);
  const cardImage = getOptimizedBackdropUrl(item.image);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(item.id);
    },
    [item.id, onRemove]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onResume(item);
      }
    },
    [item, onResume]
  );

  return (
    <div
      className={cn(
        "group relative w-[82vw] min-w-[250px] max-w-[330px] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#090909] shadow-[0_4px_12px_rgba(0,0,0,0.4)] transition snap-start aspect-video sm:h-40 sm:w-64 sm:min-w-0 sm:max-w-none md:h-[210px] md:w-[375px] md:rounded-xl md:shadow-[0_10px_20px_rgba(0,0,0,0.5)] outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      )}
      onClick={() => onResume(item)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid={`card-continue-${item.id}`}
      bis_skin_checked="1"
    >
      {/* Cover Image */}
      <img
        src={cardImage}
        alt={item.title}
        loading="lazy"
        width="1280"
        height="720"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Ambient Overlay Gradient */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/35 to-transparent" bis_skin_checked="1" />

      {/* Badge tag in top-left */}
      <div className="absolute left-2.5 top-2.5 z-20 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white/85 backdrop-blur-sm sm:left-3 sm:top-3 sm:text-[10px]" bis_skin_checked="1">
        {item.type === "series" ? "TV Show" : "Movie"}
      </div>

      {/* Remove Card button in top-right */}
      <button
        type="button"
        title="Remove from Continue Watching"
        onClick={handleRemove}
        data-testid={`button-remove-${item.id}`}
        className="absolute right-2.5 top-2.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/20 text-white/90 shadow-[0_10px_20px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-red-600/75 hover:text-white sm:right-3 sm:top-3 sm:h-8 sm:w-8 cursor-pointer"
        aria-label={`Remove ${item.title} from continue watching`}
      >
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" className="h-3 w-3 sm:h-3.5 sm:w-3.5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path>
        </svg>
      </button>

      {/* Bottom card details */}
      <div className="absolute bottom-0 left-0 z-20 w-full p-2.5 sm:p-3.5" bis_skin_checked="1">
        <div className="mb-2 flex items-center justify-between gap-2" bis_skin_checked="1">
          <div className="min-w-0 flex-1" bis_skin_checked="1">
            {item.logoUrl ? (
              <div className="h-7 flex items-end mb-1">
                <img
                  src={item.logoUrl}
                  alt={item.title}
                  className="max-h-[22px] md:max-h-[28px] w-auto max-w-[85%] object-contain object-left drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] group-hover:scale-102 transition-transform duration-300 origin-left"
                />
              </div>
            ) : (
              <div className="truncate text-[13px] font-semibold leading-tight text-white sm:text-[15px]" bis_skin_checked="1">
                {item.title}
              </div>
            )}
            <div className="mt-0.5 truncate text-[10px] text-white/65 sm:text-[11px]" bis_skin_checked="1">
              {item.episodeInfo ? `S${item.seasonNumber}: E${item.episodeNumber} - Continue watching` : "Continue from where you left off"}
            </div>
          </div>
          <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/12 text-white backdrop-blur-sm sm:h-9 sm:w-9">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="ml-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"></path>
            </svg>
          </span>
        </div>

        {/* completion progress bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25" bis_skin_checked="1">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
            bis_skin_checked="1"
          />
        </div>

        {/* Details footer values */}
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70 sm:mt-2 sm:text-[11px]" bis_skin_checked="1">
          <span>{progressPercent}% completed</span>
          <span>
            {progressPercent === 0 
              ? "Just started" 
              : `${watchedMin} min watched`}
          </span>
        </div>
      </div>
    </div>
  );
}
