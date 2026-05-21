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

export const RecommendationRow = forwardRef<HTMLElement, RecommendationRowProps>(function RecommendationRow({ continueWatching, allMovies, onMovieClick, className }, ref) {
  const deviceProfile = useDeviceProfile();
  const { sourceTitle, recommendations } = useMemo(() => {
    if (continueWatching.length === 0 || allMovies.length === 0) {
      return { sourceTitle: "", recommendations: [] };
    }

    const sourceItem = continueWatching[0];
    const sourceMovie = allMovies.find(m => m.mobifliks_id === sourceItem.contentId)
      ?? allMovies.find(m => m.title.trim().toLowerCase() === sourceItem.title.trim().toLowerCase());

    const sourceGenres = new Set((sourceMovie?.genres ?? []).map(g => g.toLowerCase()));
    const sourceVj = sourceMovie?.vj_name?.trim().toLowerCase() || "";
    const sourceType = sourceMovie?.type ?? sourceItem.type;
    const sourceId = sourceMovie?.mobifliks_id ?? sourceItem.contentId;

    const scored = allMovies
      .filter(m => m.mobifliks_id !== sourceId)
      .map(m => {
        const movieGenres = (m.genres || []).map(g => g.toLowerCase());
        const overlap = movieGenres.filter(g => sourceGenres.has(g)).length;
        const sameVj = sourceVj && m.vj_name?.trim().toLowerCase() === sourceVj ? 1 : 0;
        const sameType = m.type === sourceType ? 1 : 0;
        const recentBoost = m.created_at ? Math.max(0, 14 - ((Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24))) / 14 : 0;
        return { movie: m, score: overlap * 4 + sameVj * 3 + sameType + recentBoost };
      })
      .filter(s => s.score >= 1.5)
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
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 md:gap-4 2xl:gap-5">
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
