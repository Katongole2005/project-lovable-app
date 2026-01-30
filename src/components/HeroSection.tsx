import { Play, Info, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/api";

interface HeroSectionProps {
  movie: Movie | null;
  onPlay: (movie: Movie) => void;
  onInfo: (movie: Movie) => void;
}

export function HeroSection({ movie, onPlay, onInfo }: HeroSectionProps) {
  if (!movie) {
    return (
      <div className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] rounded-2xl overflow-hidden bg-card animate-pulse">
        <div className="absolute inset-0 shimmer" />
      </div>
    );
  }

  return (
    <div className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] rounded-2xl overflow-hidden group">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={getImageUrl(movie.image_url)}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        {/* Cinematic vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background)/0.4)_100%)]" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 lg:p-12 z-10">
        <div className="max-w-2xl space-y-3 md:space-y-4 animate-slide-up">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
              Featured
            </span>
            {movie.type === "series" && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                Series
              </span>
            )}
            {movie.year && (
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-muted/50 text-muted-foreground border border-border">
                {movie.year}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground drop-shadow-lg">
            {movie.title}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {movie.language && <span>{movie.language}</span>}
            {movie.genres?.slice(0, 3).map((genre) => (
              <span key={genre} className="px-2 py-0.5 rounded bg-muted/30 text-xs">
                {genre}
              </span>
            ))}
          </div>

          {/* Description */}
          {movie.description && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3 max-w-xl font-normal">
              {movie.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-primary font-semibold"
              onClick={() => onPlay(movie)}
            >
              <Play className="w-5 h-5 fill-current" />
              Watch Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-card/50 backdrop-blur border-border/50 hover:bg-card/80"
              onClick={() => onInfo(movie)}
            >
              <Info className="w-5 h-5" />
              More Info
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="bg-card/50 backdrop-blur border-border/50 hover:bg-card/80"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Animated glow */}
      <div className="absolute -bottom-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
    </div>
  );
}
