import type { Movie, ContinueWatching } from "@/types/movie";
import { MovieCard } from "./MovieCard";
import { cn } from "@/lib/utils";
import { useMemo, forwardRef } from "react";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";

interface RecommendationRowProps {
  continueWatching: ContinueWatching[];
  allMovies: Movie[];
  onMovieClick: (movie: Movie) => void;
  className?: string;
}

/**
 * "Because You Watched X" — picks the most recent continue-watching item,
 * matches its genres against the full movie list, and shows up to 12 results.
 */
export const RecommendationRow = forwardRef<HTMLElement, RecommendationRowProps>(function RecommendationRow({ continueWatching, allMovies, onMovieClick, className }, ref) {
  const deviceProfile = useDeviceProfile();
  const { sourceTitle, recommendations } = useMemo(() => {
    if (continueWatching.length === 0 || allMovies.length === 0) {
      return { sourceTitle: "", recommendations: [] };
    }

    // Find the source movie from continueWatching in allMovies
    const sourceItem = continueWatching[0];
    const sourceMovie = allMovies.find(m => m.mobifliks_id === sourceItem.contentId);

    if (!sourceMovie || !sourceMovie.genres || sourceMovie.genres.length === 0) {
      return { sourceTitle: "", recommendations: [] };
    }

    const sourceGenres = new Set(sourceMovie.genres.map(g => g.toLowerCase()));
    const sourceId = sourceMovie.mobifliks_id;

    // Score movies by genre overlap
    const scored = allMovies
      .filter(m => m.mobifliks_id !== sourceId)
      .map(m => {
        const movieGenres = (m.genres || []).map(g => g.toLowerCase());
        const overlap = movieGenres.filter(g => sourceGenres.has(g)).length;
        return { movie: m, score: overlap };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, deviceProfile.recommendationItems)
      .map(s => s.movie);

    return { sourceTitle: sourceItem.title, recommendations: scored };
  }, [allMovies, continueWatching, deviceProfile.recommendationItems]);

  if (recommendations.length < 3) return null;

  return (
    <section ref={ref} className={cn("py-6 content-visibility-auto", className)}>
      <h2 className="section-title text-lg md:text-xl font-display font-semibold text-foreground tracking-tight mb-6" data-testid="text-section-recommendations">
        Because You Watched <span className="text-primary">{sourceTitle}</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
        {recommendations.map((movie, index) => (
          <MovieCard
            key={movie.mobifliks_id}
            movie={movie}
            onClick={onMovieClick}
            className="w-full"
            priority={index < 4}
            allowNewBadge={false}
          />
        ))}
      </div>
    </section>
  );
});
