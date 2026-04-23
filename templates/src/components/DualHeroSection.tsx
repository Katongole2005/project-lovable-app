import { Play } from "lucide-react";
import type { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DualHeroSectionProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
}

interface HeroCardProps {
  movie: Movie;
  onPlay: (movie: Movie) => void;
  className?: string;
}

function HeroCard({ movie, onPlay, className }: HeroCardProps) {
  return (
    <div
      className={cn(
        "hero-card relative flex-1 min-h-[280px] md:min-h-[340px] cursor-pointer group",
        className
      )}
      onClick={() => onPlay(movie)}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={getImageUrl(movie.image_url)}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/70 via-primary/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-5 md:p-7">
        <h2 className="font-display text-2xl md:text-3xl lg:text-4xl text-background leading-tight mb-4 max-w-[70%]">
          {movie.title}
        </h2>
        
        <button className="inline-flex items-center gap-2 text-background/90 hover:text-background transition-colors group/btn">
          <span className="w-8 h-8 rounded-full bg-background/20 backdrop-blur flex items-center justify-center group-hover/btn:bg-background/30 transition-colors">
            <Play className="w-4 h-4 fill-current" />
          </span>
          <span className="text-sm font-medium">Let Play Moview</span>
        </button>
      </div>
    </div>
  );
}

export function DualHeroSection({ movies, onPlay }: DualHeroSectionProps) {
  const [firstMovie, secondMovie] = movies;

  if (!firstMovie) {
    return (
      <div className="flex gap-4">
        <div className="flex-1 h-[280px] md:h-[340px] rounded-2xl bg-card shimmer" />
        <div className="flex-1 h-[280px] md:h-[340px] rounded-2xl bg-card shimmer hidden md:block" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <HeroCard movie={firstMovie} onPlay={onPlay} />
      {secondMovie && (
        <HeroCard movie={secondMovie} onPlay={onPlay} className="hidden md:flex" />
      )}
    </div>
  );
}
