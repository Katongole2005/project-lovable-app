import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroCarousel } from "@/components/HeroCarousel";
import { CategoryChips } from "@/components/CategoryChips";
import { VJChips } from "@/components/VJChips";
import { MovieRow } from "@/components/MovieRow";
import { MovieGrid } from "@/components/MovieGrid";
import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { RecommendationRow } from "@/components/RecommendationRow";
import { Top10Row } from "@/components/Top10Row";
import { MovieModal } from "@/components/MovieModal";
import { CinematicVideoPlayer } from "@/components/CinematicVideoPlayer";
import { BottomNav } from "@/components/BottomNav";
import { SearchBar } from "@/components/SearchBar";
import { FilterModal, FilterState } from "@/components/FilterModal";
import { PageTransition, SectionReveal } from "@/components/PageTransition";
import { useSiteSettingsContext } from "@/hooks/useSiteSettings";
import { toSlug, fromSlug } from "@/lib/slug";
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
import { addToRecent, addRecentSearch, getContinueWatching, updateContinueWatching, removeContinueWatching } from "@/lib/storage";
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
  const location = useLocation();
  const navigateTo = useNavigate();

  const { settings: siteSettings } = useSiteSettingsContext();
  const pathToView: Record<string, ViewMode> = {
    "/": "home",
    "/movies": "movies",
    "/series": "series",
    "/search": "search",
    "/originals": "originals",
  };
  const viewMode: ViewMode = pathToView[location.pathname] ?? "home";
  const activeTab = viewMode === "home" ? "home" : viewMode;
  
  // Data states
  const [trending, setTrending] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [recentSeries, setRecentSeries] = useState<Movie[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [categoryMovies, setCategoryMovies] = useState<Movie[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatching[]>([]);
  const [activePlaybackItem, setActivePlaybackItem] = useState<ContinueWatching | null>(null);
  
  // UI states
  const [activeCategory, setActiveCategory] = useState("trending");
  const [activeVJ, setActiveVJ] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | Series | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoStartTime, setVideoStartTime] = useState(0);
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter data constants
  const filterCategories = useMemo(() => [
    { id: "trending", label: "Trending" },
    { id: "action", label: "Action" },
    { id: "adventure", label: "Adventure" },
    { id: "crime", label: "Crime" },
    { id: "drama", label: "Drama" },
    { id: "fantasy", label: "Fantasy" },
    { id: "horror", label: "Horror" },
    { id: "romance", label: "Romance" },
    { id: "sci-fi", label: "Sci-Fi" },
    { id: "thriller", label: "Thriller" },
    { id: "animation", label: "Animation" },
    { id: "special", label: "Special" },
  ], []);

  // Dynamic VJ list extracted from movies
  const [allVJs, setAllVJs] = useState<{ id: string; label: string }[]>([
    { id: "Emmy", label: "VJ Emmy" },
    { id: "IceP", label: "VJ IceP" },
    { id: "Tom", label: "VJ Tom" },
    { id: "Fredy", label: "VJ Fredy" },
  ]);

  const filterVJs = allVJs;

  // Generate years from current year down to oldest available
  const filterYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 2010; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const sortByYearDesc = useCallback((items: Movie[]) => {
    return [...items].sort((a, b) => {
      // Use full release_date for precise sorting when available
      const dateA = a.release_date ? new Date(a.release_date).getTime() : (typeof a.year === "number" ? new Date(a.year, 0, 1).getTime() : -1);
      const dateB = b.release_date ? new Date(b.release_date).getTime() : (typeof b.year === "number" ? new Date(b.year, 0, 1).getTime() : -1);
      return dateB - dateA;
    });
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Fetch multiple pages to get more VJs (API max is 100 per request)
        const [trendingRes, moviesRes, seriesRes, statsRes, moviesPage1, moviesPage2, seriesPage1] = await Promise.allSettled([
          fetchTrending(),
          fetchRecent("movie", 20, 1),
          fetchSeries(20),
          fetchStats(),
          fetchRecent("movie", 100, 1), // First 100 movies
          fetchRecent("movie", 100, 2), // Next 100 movies
          fetchSeries(100, 1), // First 100 series
        ]);

        const trendingData = trendingRes.status === "fulfilled" ? trendingRes.value : [];
        const moviesData = moviesRes.status === "fulfilled" ? moviesRes.value : [];
        const seriesData = seriesRes.status === "fulfilled" ? seriesRes.value : [];
        
        // Combine movies from multiple pages for VJ extraction
        const allMoviesPage1 = moviesPage1.status === "fulfilled" ? moviesPage1.value : [];
        const allMoviesPage2 = moviesPage2.status === "fulfilled" ? moviesPage2.value : [];
        const allSeriesPage1 = seriesPage1.status === "fulfilled" ? seriesPage1.value : [];
        const allMoviesData = [...allMoviesPage1, ...allMoviesPage2, ...allSeriesPage1];

        const baseForTrending = trendingData.length > 0 ? trendingData : moviesData;
        const sortedTrending = sortByYearDesc(baseForTrending);
        
        // Hero carousel: 4 movies + 1 series
        const heroMovies = sortedTrending.filter((m: Movie) => m.type === 'movie').slice(0, 4);
        const heroSeries = seriesData.length > 0 ? [seriesData[0]] : sortedTrending.filter((m: Movie) => m.type === 'series').slice(0, 1);
        setTrending([...heroMovies, ...heroSeries].slice(0, 5));
        setRecentMovies(sortedTrending.length > 0 ? sortedTrending : sortByYearDesc(moviesData));
        setRecentSeries(sortByYearDesc(seriesData));

        // Extract unique VJs from all movies and series
        const vjSet = new Set<string>();
        allMoviesData.forEach((movie: Movie) => {
          if (movie.vj_name && movie.vj_name.trim()) {
            vjSet.add(movie.vj_name.trim());
          }
        });
        
        // Convert to array, filter out Juniorv, and sort alphabetically
        const vjList = Array.from(vjSet)
          .filter(vj => vj.toLowerCase() !== "juniorv")
          .sort((a, b) => a.localeCompare(b))
          .map(vj => ({ id: vj, label: `VJ ${vj}` }));
        
        if (vjList.length > 0) {
          setAllVJs(vjList);
        }

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

  // Deep-link: open movie/series modal when visiting /movie/:id or /series/:id directly
  useEffect(() => {
    const match = location.pathname.match(/^\/(movie|series)\/(.+)$/);
    if (match && !isModalOpen) {
      const [, type, rawSlug] = match;
      const id = fromSlug(rawSlug);
      (async () => {
        try {
          const details = type === "series"
            ? await fetchSeriesDetails(id)
            : await fetchMovieDetails(id);
          if (details) {
            setSelectedMovie(details);
            setIsModalOpen(true);
          }
        } catch (error) {
          console.error("Error loading shared movie:", error);
        }
      })();
    }
  }, [location.pathname]);


  useEffect(() => {
    async function loadViewData() {
      if (viewMode === "movies" && categoryMovies.length === 0) {
        setIsLoading(true);
        try {
          const movies = await fetchRecent("movie", 40, 1);
          setCategoryMovies(sortByYearDesc(movies));
        } finally {
          setIsLoading(false);
        }
      } else if (viewMode === "series" && categoryMovies.length === 0) {
        setIsLoading(true);
        try {
          const series = await fetchSeries(40);
          setCategoryMovies(sortByYearDesc(series));
        } finally {
          setIsLoading(false);
        }
      } else if (viewMode === "originals" && categoryMovies.length === 0) {
        setIsLoading(true);
        setOriginalsPage(1);
        try {
          const originals = await fetchOriginals(60, 1);
          setCategoryMovies(sortByYearDesc(originals));
        } finally {
          setIsLoading(false);
        }
      }
    }
    loadViewData();
  }, [viewMode]);


  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    navigateTo("/search");
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

  // Handle movie click - show modal immediately, load details in background
  const handleMovieClick = useCallback(async (movie: Movie) => {
    // Show modal immediately with existing data
    setSelectedMovie(movie as Movie | Series);
    setIsModalOpen(true);
    addToRecent(movie);

    // Push shareable URL with SEO-friendly slug
    const typeSlug = movie.type === "series" ? "series" : "movie";
    const urlSlug = toSlug(movie.title, movie.mobifliks_id, movie.year);
    navigateTo(`/${typeSlug}/${urlSlug}`, { replace: false });

    // Fetch full details in background (for episodes, cast, etc.)
    try {
      const details = movie.type === "series"
        ? await fetchSeriesDetails(movie.mobifliks_id)
        : await fetchMovieDetails(movie.mobifliks_id);
      
      if (details) {
        setSelectedMovie(details);
      }
    } catch (error) {
      console.error("Error fetching details:", error);
    }
  }, [navigateTo]);

  // Handle play video
  const handlePlayVideo = useCallback((url: string, title: string, startAt = 0, playbackItem?: ContinueWatching) => {
    const fallbackItem = selectedMovie
      ? {
          id: selectedMovie.mobifliks_id,
          title: selectedMovie.title,
          image: selectedMovie.image_url || "",
          type: selectedMovie.type,
          progress: startAt,
          duration: 0,
          url,
        }
      : null;

    setVideoUrl(url);
    setVideoTitle(title);
    setVideoStartTime(startAt);
    setActivePlaybackItem(playbackItem ?? fallbackItem);
    setIsVideoOpen(true);
    setIsModalOpen(false);
  }, [selectedMovie]);

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
        navigateTo("/");
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

  // React Router now handles history for movies/series/search/originals views

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
    if (duration > 0 && activePlaybackItem) {
      updateContinueWatching({
        ...activePlaybackItem,
        progress: currentTime,
        duration,
        url: videoUrl,
      });
    }
  }, [activePlaybackItem, videoUrl]);

  // Handle tab change - now navigates to URL
  const handleTabChange = useCallback(async (tab: string) => {
    const viewToPath: Record<string, string> = {
      home: "/",
      movies: "/movies",
      series: "/series",
      search: "/search",
      originals: "/originals",
    };
    const path = viewToPath[tab] || "/";
    navigateTo(path);
    window.scrollTo({ top: 0, behavior: "instant" });
    
    if (tab === "home") {
      setSearchQuery("");
    } else if (tab === "movies") {
      setIsLoading(true);
      try {
        const movies = await fetchRecent("movie", 40, 1);
        setCategoryMovies(sortByYearDesc(movies));
      } finally {
        setIsLoading(false);
      }
    } else if (tab === "series") {
      setIsLoading(true);
      try {
        const series = await fetchSeries(40);
        setCategoryMovies(sortByYearDesc(series));
      } finally {
        setIsLoading(false);
      }
    } else if (tab === "originals") {
      setIsLoading(true);
      setOriginalsPage(1);
      try {
        const originals = await fetchOriginals(60, 1);
        setCategoryMovies(sortByYearDesc(originals));
      } finally {
        setIsLoading(false);
      }
    }
  }, [navigateTo]);

  // Handle category change
  const handleCategoryChange = useCallback(async (category: string) => {
    setActiveCategory(category);
    setActiveVJ(null); // Reset VJ filter when category changes
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

  // Handle VJ change
  const handleVJChange = useCallback(async (vj: string | null) => {
    setActiveVJ(vj);
    if (!vj) {
      // If VJ deselected, reload current category
      handleCategoryChange(activeCategory);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch movies and filter by VJ
      const data = await fetchRecent("movie", 100, 1);
      const filtered = data.filter((m: Movie) => m.vj_name === vj);
      setRecentMovies(sortByYearDesc(filtered));
    } catch (error) {
      console.error("Error loading VJ movies:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, handleCategoryChange, sortByYearDesc]);

  // Handle filter apply from modal
  const handleApplyFilters = useCallback(async (filters: FilterState) => {
    setIsLoading(true);
    try {
      // If content type is selected, navigate to that view with filters
      if (filters.contentType) {
        const contentViewMode = filters.contentType === "movies" ? "movies" : "series";
        navigateTo(`/${contentViewMode}`);
        
        // Fetch content based on type
        let data: Movie[] = [];
        if (filters.contentType === "movies") {
          data = await fetchRecent("movie", 100, 1);
        } else {
          data = await fetchSeries(100, 1);
        }

        // Apply VJ filter
        if (filters.vj) {
          data = data.filter((m: Movie) => m.vj_name === filters.vj);
        }

        // Apply year filter
        if (filters.year) {
          data = data.filter((m: Movie) => m.year === filters.year);
        }

        // Apply category filter for movies only
        if (filters.contentType === "movies" && filters.category && filters.category !== "trending") {
          const genre = CATEGORY_TO_GENRE[filters.category] || filters.category;
          data = data.filter((m: Movie) => 
            m.genres?.some(g => g.toLowerCase().includes(genre.toLowerCase()))
          );
        }

        setCategoryMovies(sortByYearDesc(data));
        setActiveVJ(filters.vj);
        
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // Original behavior - filter on home page
        let data: Movie[] = [];
        
        if (filters.category && filters.category !== "trending") {
          const genre = CATEGORY_TO_GENRE[filters.category] || filters.category;
          data = await fetchByGenre(genre, "movie", 100);
        } else {
          data = await fetchRecent("movie", 100, 1);
        }

        // Apply VJ filter
        if (filters.vj) {
          data = data.filter((m: Movie) => m.vj_name === filters.vj);
        }

        // Apply year filter
        if (filters.year) {
          data = data.filter((m: Movie) => m.year === filters.year);
        }

        // Update states
        if (filters.category) {
          setActiveCategory(filters.category);
        }
        setActiveVJ(filters.vj);
        setRecentMovies(sortByYearDesc(data));
      }
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sortByYearDesc]);

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
      setCategoryMovies(prev => sortByYearDesc([...prev, ...newMovies]));
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
          <PageTransition>
            {/* Hero Carousel */}
            {siteSettings.hero_carousel_enabled && (
            <SectionReveal>
              <HeroCarousel
                movies={trending}
                onPlay={handleHeroPlay}
                onMovieClick={handleMovieClick}
                title="Top Movies"
                onViewAll={() => handleTabChange("movies")}
              />
            </SectionReveal>
            )}

            {/* Category Chips */}
            <SectionReveal delay={100}>
              <div className="mt-6">
                <CategoryChips 
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                />
              </div>
            </SectionReveal>

            {/* VJ Chips */}
            <SectionReveal delay={150}>
              <div className="mt-6">
                <VJChips
                  activeVJ={activeVJ}
                  onVJChange={handleVJChange}
                />
              </div>
            </SectionReveal>

            {/* Continue Watching - above Trending */}
            {siteSettings.continue_watching_enabled && continueWatching.length > 0 && (
              <SectionReveal delay={200}>
                <div className="mt-6">
                  <ContinueWatchingRow
                    items={continueWatching}
                    onResume={(item) => {
                      handlePlayVideo(item.url, item.title, Number(item.progress) || 0, item);
                    }}
                    onRemove={(id) => {
                      removeContinueWatching(id);
                      setContinueWatching(getContinueWatching());
                    }}
                  />
                </div>
              </SectionReveal>
            )}

            {/* Trending Section */}
            <SectionReveal delay={continueWatching.length > 0 ? 250 : 200}>
              <div className="mt-6">
                <MovieRow
                  title={getCategoryTitle()}
                  movies={recentMovies}
                  onMovieClick={handleMovieClick}
                  onViewAll={() => handleTabChange("movies")}
                  isLoading={isLoading && recentMovies.length === 0}
                  showFilters
                  onFilterClick={() => setIsFilterOpen(true)}
                />
              </div>
            </SectionReveal>

            {/* Top 10 Today */}
            {siteSettings.top10_enabled && (
            <SectionReveal delay={280}>
              <div className="mt-6">
                <Top10Row
                  movies={recentMovies}
                  onMovieClick={handleMovieClick}
                />
              </div>
            </SectionReveal>
            )}

            {/* Because You Watched Recommendations */}
            {continueWatching.length > 0 && recentMovies.length > 0 && (
              <SectionReveal delay={320}>
                <div className="mt-6">
                  <RecommendationRow
                    continueWatching={continueWatching}
                    allMovies={[...recentMovies, ...recentSeries]}
                    onMovieClick={handleMovieClick}
                  />
                </div>
              </SectionReveal>
            )}

            {/* Popular Series */}
            <SectionReveal delay={350}>
              <div className="mt-6">
                <MovieRow
                  title="Popular Series"
                  movies={recentSeries}
                  onMovieClick={handleMovieClick}
                  onViewAll={() => handleTabChange("series")}
                  isLoading={isLoading && recentSeries.length === 0}
                />
              </div>
            </SectionReveal>
          </PageTransition>
        )}

        {/* Search View */}
        {viewMode === "search" && (
          <PageTransition>
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
          </PageTransition>
        )}

        {/* Movies Category */}
        {viewMode === "movies" && (
          <PageTransition>
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
          </PageTransition>
        )}

        {/* Series Category */}
        {viewMode === "series" && (
          <PageTransition>
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
          </PageTransition>
        )}

        {/* Originals (English) */}
        {viewMode === "originals" && (
          <PageTransition>
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
          </PageTransition>
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
        onClose={() => {
          setIsModalOpen(false);
          // Go back to the previous route when closing modal
          if (location.pathname.startsWith("/movie/") || location.pathname.startsWith("/series/")) {
            navigateTo(-1);
          }
        }}
        onPlay={handlePlayVideo}
      />

      {/* Cinematic Video Player */}
      <CinematicVideoPlayer
        isOpen={isVideoOpen}
        onClose={() => {
          setIsVideoOpen(false);
          setActivePlaybackItem(null);
          setContinueWatching(getContinueWatching());
        }}
        videoUrl={videoUrl}
        title={videoTitle}
        movie={selectedMovie}
        onTimeUpdate={handleVideoTimeUpdate}
        startTime={videoStartTime}
      />

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
        categories={filterCategories}
        vjs={filterVJs}
        years={filterYears}
        initialFilters={{
          category: null,
          vj: activeVJ,
          year: null,
          contentType: "movies",
        }}
      />
    </div>
  );
}
