import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { MovieGrid } from "@/components/MovieGrid";
import { fetchMoviesSorted } from "@/lib/api";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Movie } from "@/types/movie";

export default function VJPage() {
  const { vjName } = useParams<{ vjName: string }>();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);

  const formattedVjName = vjName 
    ? vjName.charAt(0).toUpperCase() + vjName.slice(1).toLowerCase()
    : "";

  const { data, isLoading } = useQuery({
    queryKey: ["movies", "vj", vjName],
    queryFn: async () => {
      // In a real scenario, we'd have a specific fetchByVJ API call.
      // For now, we'll fetch a larger set and filter, or assume fetchMoviesSorted handles it.
      // Assuming fetchMoviesSorted or similar can take dynamic filters.
      // For this implementation, we'll use search as a proxy or a custom fetch.
      const response = await fetchMoviesSorted("movie", 100, 1);
      return response.filter(m => m.vj_name?.toLowerCase().includes(vjName?.toLowerCase() || ""));
    },
    enabled: !!vjName,
  });

  useEffect(() => {
    if (data) {
      setMovies(data);
    }
  }, [data]);

  useDocumentSEO({
    title: `VJ ${formattedVjName} Translated Movies & Series`,
    vjName: formattedVjName,
    description: `Watch all ${movies.length || ''} movies and series translated by VJ ${formattedVjName} in Luganda. Stream VJ ${formattedVjName}'s best Hollywood, Bollywood & African movie translations free on Moviebay Uganda. No subscription required.`,
    canonicalPath: `/vj/${vjName}`,
    genres: ["Action", "Romance", "Drama", "Horror", "Animation"],
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <Header 
        onSearch={(query) => navigate(`/search?q=${encodeURIComponent(query)}`)}
        onMovieSelect={(movie) => navigate(`/movie/${movie.mobifliks_id}`)}
      />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full bg-white/5 hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">
              VJ <span className="text-[#ff8a3d]">{formattedVjName}</span> Translations
            </h1>
            <p className="mt-2 text-gray-400">
              Browse and watch the best Luganda translated movies by VJ {formattedVjName}.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff8a3d]" />
          </div>
        ) : movies.length > 0 ? (
          <MovieGrid
            movies={movies}
            onMovieClick={(movie) => navigate(`/movie/${movie.mobifliks_id}`)}
          />
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-xl text-gray-500">No movies found for VJ {formattedVjName}.</p>
            <Button 
              variant="link" 
              onClick={() => navigate("/")}
              className="mt-4 text-[#ff8a3d]"
            >
              Back to Home
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
