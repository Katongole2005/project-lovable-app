import { ChevronRight, SlidersHorizontal, Filter } from "lucide-react";
import { forwardRef } from "react";
import type { Movie } from "@/types/movie";
import { MovieCard, MovieCardSkeleton } from "./MovieCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onViewAll?: () => void;
  isLoading?: boolean;
  showFilters?: boolean;
  onFilterClick?: () => void;
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.93 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const MovieRow = forwardRef<HTMLElement, MovieRowProps>(function MovieRow({
  title,
  movies,
  onMovieClick,
  onViewAll,
  isLoading,
  showFilters = false,
  onFilterClick,
  className
}, ref) {


  if (isLoading) {
    return (
      <section ref={ref} className={cn("py-6", className)}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title text-lg md:text-xl font-display font-semibold text-foreground tracking-tight">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <MovieCardSkeleton key={i} className="w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (movies.length === 0) return null;

  return (
    <section ref={ref} className={cn("py-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title text-lg md:text-xl font-display font-semibold text-foreground tracking-tight" data-testid={`text-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {showFilters && onFilterClick && (
            <button
              onClick={onFilterClick}
              title="Filters"
              data-testid="button-filter-mobile"
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full bg-[#c8f547] transition-all duration-200 active:scale-95 shadow-[0_2px_8px_rgba(200,245,71,0.3)]"
            >
              <SlidersHorizontal className="w-4 h-4 text-black" />
            </button>
          )}

          {showFilters && onFilterClick && (
            <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-foreground">
              <button title="Filter" onClick={onFilterClick} data-testid="button-filter-desktop" className="p-2 rounded-full text-background hover:bg-background/10 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          )}

          {onViewAll && (
            <button
              onClick={onViewAll}
              data-testid="button-view-all"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group/btn press-effect"
            >
              View All
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
            </button>
          )}
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "100px" }}
        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4"
      >
        {movies.slice(0, 24).map((movie, index) => (
          <motion.div key={movie.mobifliks_id} variants={cardVariants}>
            <MovieCard
              movie={movie}
              onClick={onMovieClick}
              className="w-full"
              priority={index < 4}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
});
