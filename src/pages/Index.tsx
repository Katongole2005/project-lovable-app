import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CategoryChips } from "@/components/CategoryChips";
import { MovieRow } from "@/components/MovieRow";
import { MovieGrid } from "@/components/MovieGrid";
import { MovieModal } from "@/components/MovieModal";
import { VideoPlayer } from "@/components/VideoPlayer";
import { BottomNav } from "@/components/BottomNav";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { 
  fetchTrending, 
  fetchRecent, 
  fetchSeries, 
  searchMovies,
  fetchMovieDetails,
  fetchSeriesDetails,
  fetchStats,
  fetchByGenre,
  fetchOriginals,
} from "@/lib/api";
import { addToRecent, addRecentSearch, getContinueWatching, updateContinueWatching } from "@/lib/storage";
import type { Movie, Series, ContinueWatching } from "@/types/movie";
import { ChevronLeft, Loader2 } from "lucide-react";

type ViewMode = "home" | "search" | "movies" | "series" | "originals";

const CATEGORY_TO_GENRE: Record<string, string> = {
  action: "Action",
  romance: "Romance",
  animation: "Animation",
  horror: "Horror",
  special: "Special",
  drama: "Drama",
};

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data states
  const [trending, setTrending] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [recentSeries, setRecentSeries] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [categoryMovies, setCategoryMovies] = useState<Movie[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatching[]>([]);
  
  // UI states
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [activeTab, setActiveTab] = useState("home");
  const [activeCategory, setActiveCategory] = useState("trending");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | Series | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [originalsPage, setOriginalsPage] = useState(1);
  const modalHistoryRef = useRef(false);
  const videoHistoryRef = useRef(false);
  const moviesHistoryRef = useRef(false);
  const seriesHistoryRef = useRef(false);
  const searchHistoryRef = useRef(false);
  const lastBackPressRef = useRef(0);
  const exitToastTimerRef = useRef<number | null>(null);
  const [showExitToast, setShowExitToast] = useState(false);

  const sortByYearDesc = useCallback((items: Movie[]) => {
    return [...items].sort((a, b) => {
      const yearA = typeof a.year === "number" ? a.year : -1;
      const yearB = typeof b.year === "number" ? b.year : -1;
      if (yearA === yearB) return 0;
      return yearB - yearA;
    });
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [trendingRes, moviesRes, seriesRes, statsRes] = await Promise.allSettled([
          fetchTrending(),
          fetchRecent("movie", 20, 1),
          fetchSeries(20),
          fetchStats(),
        ]);

        const trendingData = trendingRes.status === "fulfilled" ? trendingRes.value : [];
        const moviesData = moviesRes.status === "fulfilled" ? moviesRes.value : [];
        const seriesData = seriesRes.status === "fulfilled" ? seriesRes.value : [];

        const baseForTrending = trendingData.length > 0 ? trendingData : moviesData;
        const sortedTrending = sortByYearDesc(baseForTrending);
        setTrending(sortedTrending.slice(0, 5));
        setRecentMovies(sortedTrending.length > 0 ? sortedTrending : moviesData);
        setRecentSeries(seriesData);

        if (statsRes.status === "fulfilled") {
          const statsData = statsRes.value;
          setPopularSearches(
            statsData.popular_searches
              .map((s: string) => s.replace(/\s*\(\d+ searches\)\s*$/g, "").trim())
              .filter(Boolean)
              .slice(0, 8)
          );
        } else {
          setPopularSearches([]);
        }
        setContinueWatching(getContinueWatching());
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setViewMode("search");
    setActiveTab("search");
    setCurrentPage(1);
    setIsLoading(true);
    addRecentSearch(query);

    try {
      const results = await searchMovies(query, 1);
      setSearchResults(results.results);
      setTotalResults(results.total_results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle movie click
  const handleMovieClick = useCallback(async (movie: Movie) => {
    setIsLoading(true);
    try {
      const details = movie.type === "series"
        ? await fetchSeriesDetails(movie.mobifliks_id)
        : await fetchMovieDetails(movie.mobifliks_id);
      
      if (details) {
        addToRecent(details);
        setSelectedMovie(details);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle play video
  const handlePlayVideo = useCallback((url: string, title: string) => {
    setVideoUrl(url);
    setVideoTitle(title);
    setIsVideoOpen(true);
    setIsModalOpen(false);
  }, []);

  useEffect(() => {
    if (isModalOpen && !modalHistoryRef.current) {
      window.history.pushState({ modal: true }, "");
      modalHistoryRef.current = true;
    }
    if (!isModalOpen) {
      modalHistoryRef.current = false;
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isVideoOpen && !videoHistoryRef.current) {
      window.history.pushState({ video: true }, "");
      videoHistoryRef.current = true;
    }
    if (!isVideoOpen) {
      videoHistoryRef.current = false;
    }
  }, [isVideoOpen]);

  useEffect(() => {
    window.history.pushState({ exitGuard: true }, "");
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (isVideoOpen) {
        setIsVideoOpen(false);
        return;
      }
      if (isModalOpen) {
        setIsModalOpen(false);
        return;
      }
      if (viewMode === "movies" || viewMode === "series" || viewMode === "search" || viewMode === "originals") {
        setViewMode("home");
        setActiveTab("home");
        setSearchQuery("");
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        return;
      }
      lastBackPressRef.current = now;
      setShowExitToast(true);
      if (exitToastTimerRef.current) {
        window.clearTimeout(exitToastTimerRef.current);
      }
      exitToastTimerRef.current = window.setTimeout(() => {
        setShowExitToast(false);
      }, 1500);
      window.history.pushState({ exitGuard: true }, "");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isModalOpen, isVideoOpen, viewMode]);

  useEffect(() => {
    if (viewMode === "movies" && !moviesHistoryRef.current) {
      window.history.pushState({ view: "movies" }, "");
      moviesHistoryRef.current = true;
    }
    if (viewMode !== "movies") {
      moviesHistoryRef.current = false;
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "series" && !seriesHistoryRef.current) {
      window.history.pushState({ view: "series" }, "");
      seriesHistoryRef.current = true;
    }
    if (viewMode !== "series") {
      seriesHistoryRef.current = false;
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "search" && !searchHistoryRef.current) {
      window.history.pushState({ view: "search" }, "");
      searchHistoryRef.current = true;
    }
    if (viewMode !== "search") {
      searchHistoryRef.current = false;
    }
  }, [viewMode]);

  // Handle play from hero
  const handleHeroPlay = useCallback((movie: Movie) => {
    if (movie.download_url) {
      handlePlayVideo(movie.download_url, movie.title);
    } else {
      handleMovieClick(movie);
    }
  }, [handlePlayVideo, handleMovieClick]);

  // Handle video time update
  const handleVideoTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (selectedMovie && duration > 0) {
      updateContinueWatching({
        id: selectedMovie.mobifliks_id,
        title: selectedMovie.title,
        image: selectedMovie.image_url || "",
        type: selectedMovie.type,
        progress: currentTime,
        duration,
        url: videoUrl,
      });
    }
  }, [selectedMovie, videoUrl]);

  // Handle tab change
  const handleTabChange = useCallback(async (tab: string) => {
    setActiveTab(tab);
    
    if (tab === "home") {
      setViewMode("home");
      setSearchQuery("");
    } else if (tab === "search") {
      setViewMode("search");
    } else if (tab === "movies") {
      setViewMode("movies");
      setIsLoading(true);
      try {
        const movies = await fetchRecent("movie", 40, 1);
        setCategoryMovies(movies);
      } finally {
        setIsLoading(false);
      }
    } else if (tab === "series") {
      setViewMode("series");
      setIsLoading(true);
      try {
        const series = await fetchSeries(40);
        setCategoryMovies(series);
      } finally {
        setIsLoading(false);
      }
    } else if (tab === "originals") {
      setViewMode("originals");
      setIsLoading(true);
      setOriginalsPage(1);
      try {
        const originals = await fetchOriginals(60, 1);
        setCategoryMovies(sortByYearDesc(originals));
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback(async (category: string) => {
    setActiveCategory(category);
    setIsLoading(true);
    try {
      if (category === "trending") {
        const data = await fetchTrending();
        setRecentMovies(sortByYearDesc(data));
      } else {
        const genre = CATEGORY_TO_GENRE[category] || category;
        const data = await fetchByGenre(genre, "movie", 40);
        setRecentMovies(sortByYearDesc(data));
      }
    } catch (error) {
      console.error("Error loading category:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load more for categories
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const currentCount = categoryMovies.length;
      const nextPage = Math.floor(currentCount / 20) + 1;
      
      let more: Movie[] = [];
      if (viewMode === "movies") {
        more = await fetchRecent("movie", 20, nextPage);
      } else if (viewMode === "series") {
        more = await fetchSeries(20, nextPage);
      } else if (viewMode === "originals") {
        const nextOriginalsPage = originalsPage + 1;
        const originals = await fetchOriginals(60, nextOriginalsPage);
        more = sortByYearDesc(originals);
        setOriginalsPage(nextOriginalsPage);
      }
      
      // Filter out duplicates
      const existingIds = new Set(categoryMovies.map(m => m.mobifliks_id));
      const newMovies = more.filter(m => !existingIds.has(m.mobifliks_id));
      setCategoryMovies(prev => [...prev, ...newMovies]);
    } finally {
      setIsLoadingMore(false);
    }
  }, [categoryMovies, viewMode, isLoadingMore, originalsPage, sortByYearDesc]);

  // Get category title
  const getCategoryTitle = () => {
    const titles: Record<string, string> = {
      trending: "Trending",
      action: "Action",
      romance: "Romance",
      animation: "Animation",
      horror: "Horror",
      special: "Special",
      drama: "Drama",
    };
    if (activeCategory === "trending") return "Trending";
    return `Trending in ${titles[activeCategory] || "All"}`;
  };

  return (
    <div className="min-h-screen pb-safe">
      {/* Header */}
      <Header
        onSearch={handleSearch}
        onMovieSelect={handleMovieClick}
        popularSearches={popularSearches}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-6">
        {/* Home View */}
        {viewMode === "home" && (
          <>
            {/* Hero Carousel */}
            <HeroCarousel
              movies={trending}
              onPlay={handleHeroPlay}
              onMovieClick={handleMovieClick}
              title="Top Movies"
              onViewAll={() => handleTabChange("movies")}
            />

            {/* Category Chips */}
            <CategoryChips 
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
            />

            {/* Trending Section */}
            <MovieRow
              title={getCategoryTitle()}
              movies={recentMovies}
              onMovieClick={handleMovieClick}
              onViewAll={() => handleTabChange("movies")}
              isLoading={isLoading && recentMovies.length === 0}
              showFilters
            />

            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <MovieRow
                title="Continue Watching"
                movies={continueWatching.map(cw => ({
                  mobifliks_id: cw.id,
                  title: cw.title,
                  image_url: cw.image,
                  type: cw.type,
                }))}
                onMovieClick={(movie) => {
                  const item = continueWatching.find(cw => cw.id === movie.mobifliks_id);
                  if (item) {
                    setVideoUrl(item.url);
                    setVideoTitle(item.title);
                    setIsVideoOpen(true);
                  }
                }}
              />
            )}

            {/* Popular Series */}
            <MovieRow
              title="Popular Series"
              movies={recentSeries}
              onMovieClick={handleMovieClick}
              onViewAll={() => handleTabChange("series")}
              isLoading={isLoading && recentSeries.length === 0}
            />
          </>
        )}

        {/* Search View */}
        {viewMode === "search" && (
          <div className="space-y-6">
            <div className="max-w-xl mx-auto">
              <SearchBar
                onSearch={handleSearch}
                onMovieSelect={handleMovieClick}
                popularSearches={popularSearches}
              />
            </div>

            {searchQuery && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTabChange("home")}
                    className="shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-xl font-semibold">Search Results</h2>
                    <p className="text-sm text-muted-foreground">
                      {totalResults} results for "{searchQuery}"
                    </p>
                  </div>
                </div>

                <MovieGrid
                  movies={searchResults}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoading}
                  emptyMessage={`No results for "${searchQuery}"`}
                />
              </div>
            )}
          </div>
        )}

        {/* Movies Category */}
        {viewMode === "movies" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleTabChange("home")}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold">All Movies</h2>
            </div>

            <MovieGrid
              movies={categoryMovies}
              onMovieClick={handleMovieClick}
              isLoading={isLoading && categoryMovies.length === 0}
            />

            {categoryMovies.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Series Category */}
        {viewMode === "series" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleTabChange("home")}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold">All Series</h2>
            </div>

            <MovieGrid
              movies={categoryMovies}
              onMovieClick={handleMovieClick}
              isLoading={isLoading && categoryMovies.length === 0}
            />

            {categoryMovies.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Originals (English) */}
        {viewMode === "originals" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleTabChange("home")}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold">Originals (English)</h2>
            </div>

            <MovieGrid
              movies={categoryMovies}
              onMovieClick={handleMovieClick}
              isLoading={isLoading && categoryMovies.length === 0}
              emptyMessage="No English originals found."
            />

            {categoryMovies.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="gap-2"
                >
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur border border-border/50 text-sm text-foreground shadow-lg">
          Press back again to exit
        </div>
      )}

      {/* Movie Details Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPlay={handlePlayVideo}
      />

      {/* Video Player */}
      <VideoPlayer
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl={videoUrl}
        title={videoTitle}
        onTimeUpdate={handleVideoTimeUpdate}
      />
    </div>
  );
}
