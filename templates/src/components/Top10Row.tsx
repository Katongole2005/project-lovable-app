import type { Movie } from "@/types/movie";
import { buildMediaUrl, getImageUrl, preloadMovieBackdrop, primeMediaAvailability } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Play, Crown } from "lucide-react";
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
    <section ref={ref} className={cn("py-6 content-visibility-auto", className)}>
      <h2 className="section-title text-lg md:text-xl font-display font-semibold text-foreground tracking-tight mb-6" data-testid="text-section-top10">
        Latest 10
      </h2>
      <div className="flex gap-5 md:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
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
    const targetUrl = movie.server2_url || movie.download_url;
    if (!targetUrl) return;
    const mediaUrl = buildMediaUrl({
      url: targetUrl,
      title: movie.title,
      detailsUrl: movie.video_page_url || movie.details_url,
      mobifliksId: movie.mobifliks_id,
      play: true,
    });
    primeMediaAvailability(mediaUrl);
  }, [movie]);

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 cursor-pointer snap-start press-effect"
      )}
      onClick={() => onClick(movie)}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
      data-testid={`card-top10-${rank}`}
    >
      <div className="flex items-end gap-0">
        <div className="relative">
          {rank === 1 && (
            <Crown
              className="absolute -top-5 left-1/2 -translate-x-1/2 w-5 h-5 text-yellow-400 drop-shadow-[0_2px_4px_rgba(250,204,21,0.5)]"
              style={{ animation: "crown-float 3s ease-in-out infinite" }}
            />
          )}
          <span
            className="text-[80px] md:text-[100px] font-black leading-none select-none metallic-number"
            style={{
              fontFamily: "'Georgia', serif",
              marginRight: "-16px",
              zIndex: 0,
            }}
          >
            {rank}
          </span>
        </div>

        <div className="relative w-[110px] md:w-[130px] aspect-[2/3] rounded-xl overflow-hidden shadow-card card-hover card-rim-light z-10"
          style={{
            boxShadow: "0 8px 32px hsl(230 60% 5% / 0.5), 0 2px 8px hsl(230 60% 5% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
          }}
        >
          <BlurImage
            src={getImageUrl(movie.image_url)}
            alt={movie.title}
            loading={index < 4 ? "eager" : "lazy"}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_16px_hsl(210_100%_60%/0.3)]">
              <Play className="w-4 h-4 text-primary fill-current ml-0.5" />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs font-medium text-foreground line-clamp-1 max-w-[130px] ml-auto text-center pl-4" data-testid={`text-top10-title-${rank}`}>
        {movie.title}
      </p>
    </div>
  );
}
