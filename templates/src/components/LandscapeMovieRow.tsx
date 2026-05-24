"use client";
import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, SlidersHorizontal, Filter } from "lucide-react";
import { forwardRef, useRef, useState, useEffect } from "react";
import type { Movie } from "@/types/movie";
import { LandscapeMovieCard, LandscapeMovieCardSkeleton } from "./LandscapeMovieCard";
import { cn } from "@/lib/utils";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";

interface LandscapeMovieRowProps {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onViewAll?: () => void;
  isLoading?: boolean;
  showFilters?: boolean;
  onFilterClick?: () => void;
  className?: string;
}

export const LandscapeMovieRow = forwardRef<HTMLElement, LandscapeMovieRowProps>(function LandscapeMovieRow({
  title,
  movies,
  onMovieClick,
  onViewAll,
  isLoading,
  showFilters = false,
  onFilterClick,
  className
}, ref) {
  const deviceProfile = useDeviceProfile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const visibleMovies = movies.slice(0, deviceProfile.homeGridItems);

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
    
    // Add window resize listener to update scroll limits
    window.addEventListener("resize", checkScrollLimits, { passive: true });

    return () => {
      el.removeEventListener("scroll", checkScrollLimits);
      window.removeEventListener("resize", checkScrollLimits);
    };
  }, [visibleMovies.length]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * 0.78;
    const targetScroll = direction === "left" 
      ? el.scrollLeft - scrollAmount 
      : el.scrollLeft + scrollAmount;

    el.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  if (isLoading) {
    return (
      <section ref={ref} className={cn("py-6 relative overflow-hidden", className)}>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="section-title text-lg md:text-xl font-display font-semibold text-foreground tracking-tight">{title}</h2>
        </div>
        <div className="flex gap-4 overflow-x-hidden py-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <LandscapeMovieCardSkeleton key={i} className="w-[280px] flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return (
    <section ref={ref} className={cn("py-6 relative group/row", className)}>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="section-title text-lg md:text-xl font-display font-bold text-foreground tracking-tight" data-testid={`text-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {showFilters && onFilterClick && (
            <button
              onClick={onFilterClick}
              title="Filters"
              data-testid="button-filter-mobile"
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-[linear-gradient(135deg,#ff8a3d_0%,#ff5b2e_52%,#ff4d6d_100%)] transition-all duration-200 active:scale-95 shadow-[0_8px_20px_rgba(255,91,46,0.18)]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
            </button>
          )}

          {showFilters && onFilterClick && (
            <div className="hidden md:flex items-center gap-1 p-0.5 rounded-full bg-foreground mr-1">
              <button title="Filter" onClick={onFilterClick} data-testid="button-filter-desktop" className="p-1.5 rounded-full text-background hover:bg-background/10 transition-colors">
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {onViewAll && (
            <button
              onClick={onViewAll}
              data-testid="button-view-all"
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors group/btn press-effect"
            >
              View All
              <ChevronRightIcon className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </button>
          )}
        </div>
      </div>

      <div className="relative -mx-2 px-2">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => handleScroll("left")}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-[#0a0a0f]/90 border border-white/10 text-white flex items-center justify-center shadow-lg transition-all duration-300 opacity-0 group-hover/row:opacity-100 scale-90 hover:scale-100 hover:bg-black active:scale-95 cursor-pointer backdrop-blur-md"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => handleScroll("right")}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-[#0a0a0f]/90 border border-white/10 text-white flex items-center justify-center shadow-lg transition-all duration-300 opacity-0 group-hover/row:opacity-100 scale-90 hover:scale-100 hover:bg-black active:scale-95 cursor-pointer backdrop-blur-md"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Scrolling Cards Wrapper */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 md:gap-4 2xl:gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-none pb-4 pt-1 px-1 -mx-1 hardware-accelerated-scroll"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visibleMovies.map((movie) => (
            <LandscapeMovieCard
              key={movie.mobifliks_id}
              movie={movie}
              onClick={onMovieClick}
              className="w-[240px] sm:w-[280px] md:w-[320px] lg:w-[340px] flex-shrink-0 snap-start"
            />
          ))}
        </div>
      </div>
    </section>
  );
});
