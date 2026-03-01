import type { Movie } from "@/types/movie";
import { getImageUrl, preloadMovieBackdrop } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { BlurImage } from "./BlurImage";
import { forwardRef, useCallback } from "react";

interface Top10RowProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  className?: string;
}

export const Top10Row = forwardRef<HTMLElement, Top10RowProps>(function Top10Row({ movies, onMovieClick, className }, ref) {
  const top10 = movies.slice(0, 10);

  if (top10.length < 3) return null;

  return (
    <section ref={ref} className={cn("py-4", className)}>
      <h2 className="text-lg md:text-xl font-display font-semibold text-foreground tracking-tight mb-5">
        Top 10 Today
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {top10.map((movie, index) => (
          <Top10Card
            key={movie.mobifliks_id}
            movie={movie}
            rank={index + 1}
            onClick={onMovieClick}
            index={index}
          />
        ))}
      </div>
    </section>
  );
});

function Top10Card({
  movie,
  rank,
  onClick,
  index,
}: {
  movie: Movie;
  rank: number;
  onClick: (movie: Movie) => void;
  index: number;
}) {
  const handleMouseEnter = useCallback(() => {
    preloadMovieBackdrop(movie);
  }, [movie]);

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 cursor-pointer snap-start press-effect",
        "opacity-0 animate-scale-in",
        `stagger-${Math.min(index + 1, 8)}`
      )}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
    >
      <div className="flex items-end gap-0">
        {/* Large number */}
        <span
          className="text-[80px] md:text-[100px] font-black leading-none select-none"
          style={{
            fontFamily: "'Georgia', serif",
            WebkitTextStroke: "2px hsl(var(--primary))",
            color: "transparent",
            marginRight: "-16px",
            zIndex: 0,
            textShadow: "0 4px 20px hsl(var(--primary) / 0.3)",
          }}
        >
          {rank}
        </span>

        {/* Poster */}
        <div className="relative w-[110px] md:w-[130px] aspect-[2/3] rounded-xl overflow-hidden shadow-card card-hover hover-glow z-10">
          <BlurImage
            src={getImageUrl(movie.image_url)}
            alt={movie.title}
            loading={index < 4 ? "eager" : "lazy"}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Play icon on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-background/90 backdrop-blur flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg">
              <Play className="w-4 h-4 text-primary fill-current ml-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      <p className="mt-2 text-xs font-medium text-foreground line-clamp-1 max-w-[130px] ml-auto text-center pl-4">
        {movie.title}
      </p>
    </div>
  );
}
