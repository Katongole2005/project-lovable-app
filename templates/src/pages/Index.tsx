import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, startTransition } from "react";
import { useSearchParams, useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { CategoryChips } from "@/components/CategoryChips";
import { VJChips } from "@/components/VJChips";
import { HeroCarousel } from "@/components/HeroCarousel";
import { MovieRow } from "@/components/MovieRow";
import { MovieGrid } from "@/components/MovieGrid";
import { FilterState } from "@/components/FilterModal";
import { PageTransition, SectionReveal } from "@/components/PageTransition";
import { useTheme } from "next-themes";
import logoLight from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";

// Helper function to retry lazy loading chunks in case of network errors or outdated hashes
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume that the error is due to an outdated chunk hash or temporary network issue
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        
        // Force bypass CDN and browser cache by appending a timestamp to the URL
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('v', new Date().getTime().toString());
        window.location.href = currentUrl.toString();
        
        // Return a promise that never resolves while the page is reloading
        return new Promise(() => {});
      }
      throw error;
    }
  });

const loadCinematicVideoPlayer = () => import("@/components/CinematicVideoPlayer").then(module => ({ default: module.CinematicVideoPlayer }));
const ContinueWatchingRow = lazyWithRetry(() => import("@/components/ContinueWatchingRow").then(module => ({ default: module.ContinueWatchingRow })));
const RecommendationRow = lazyWithRetry(() => import("@/components/RecommendationRow").then(module => ({ default: module.RecommendationRow })));
const Top10Row = lazyWithRetry(() => import("@/components/Top10Row").then(module => ({ default: module.Top10Row })));
const SearchBar = lazyWithRetry(() => import("@/components/SearchBar").then(module => ({ default: module.SearchBar })));
const loadMovieModal = () => import("@/components/MovieModal").then(module => ({ default: module.MovieModal }));
const MovieModal = lazyWithRetry(loadMovieModal);
const CinematicVideoPlayer = lazyWithRetry(loadCinematicVideoPlayer);
const FilterModal = lazyWithRetry(() => import("@/components/FilterModal").then(module => ({ default: module.FilterModal })));
import { DynamicBackground } from "@/components/DynamicBackground";
import { StayedAlertModal } from "@/components/StayedAlertModal";
import { AuthGatedModal } from "@/components/AuthGatedModal";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettingsContext } from "@/hooks/useSiteSettings";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { Button } from "@/components/ui/button";
import {
  fetchTrending,
  fetchHeroLatest,
  fetchNewThisWeek,
  fetchRecent,
  fetchSeries,
  searchMovies,
  fetchMovieDetails,
  fetchSeriesDetails,
  getCachedSeriesDetails,
  fetchStats,
  fetchByGenre,
  fetchOriginals,
  fetchMoviesSorted,
  preloadMovieBackdrop,
  preloadImage,
  getImageUrl,
  getOptimizedBackdropUrl,
  buildMediaUrl,
  getCachedMediaAvailability,
  primeMediaAvailability,
  normalizeVjName
} from "@/lib/api";
import type { FilterOptions } from "@/lib/api";
import { preloadHeroMovies } from "@/lib/heroImages";
import { addToRecent, addRecentSearch, updateContinueWatching, removeContinueWatching } from "@/lib/storage";
import type { Movie, Series, ContinueWatching, SkipSegment, SubtitleTrack } from "@/types/movie";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useDocumentSEO } from "@/hooks/useDocumentSEO";
import { buildMovieJsonLd } from "@/hooks/useSeo";
import { toSlug, fromSlug } from "@/lib/slug";
import { toast } from "sonner";

type ViewMode = "home" | "search" | "movies" | "series" | "originals";

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleLowPriorityTask(task: () => void): void {
  if (typeof window === "undefined") {
    task();
    return;
  }

  const typedWindow = window as IdleWindow;
  if (typeof typedWindow.requestIdleCallback === "function") {
    typedWindow.requestIdleCallback(() => task());
    return;
  }

  window.setTimeout(task, 32);
}

const CATEGORY_TO_GENRE: Record<string, string> = {
  action: "Action",
  adventure: "Adventure",
  crime: "Crime",
  romance: "Romance",
  animation: "Animation",
  horror: "Horror",
  special: "Special",
  drama: "Drama",
  fantasy: "Fantasy",
  "sci-fi": "Science Fiction",
  thriller: "Thriller",
};

function parseEpisodeInfoFromTitle(title: string): {
  seasonNumber?: number;
  episodeNumber?: number;
} {
  const match = title.match(/\bS(\d+)\s*:\s*E(\d+)\b/i);
  if (!match) return {};
  return {
    seasonNumber: parseInt(match[1], 10),
    episodeNumber: parseInt(match[2], 10),
  };
}

async function buildPrimaryPlaybackUrl(item: Movie | Series): Promise<string | null> {
  if (item.type === "movie") {
    const targetUrl = item.server2_url || item.download_url;
    if (targetUrl) {
      return await buildMediaUrl({
        url: targetUrl,
        title: item.title,
        detailsUrl: item.video_page_url || item.details_url,
        mobifliksId: item.mobifliks_id,
        play: true,
      });
    }
  }

  const firstEpisode = (item as Series).episodes?.find((episode) => episode.download_url || episode.server2_url);
  const targetUrl = firstEpisode?.server2_url || firstEpisode?.download_url;
  if (!targetUrl) {
    return null;
  }

  const seasonNumber = firstEpisode.season_number || 1;
  return await buildMediaUrl({
    url: targetUrl,
    title: `${item.title} - S${seasonNumber}:E${firstEpisode.episode_number}`,
    detailsUrl: firstEpisode.video_page_url || item.video_page_url || item.details_url,
    mobifliksId: firstEpisode.mobifliks_id || item.mobifliks_id,
    play: true,
  });
}

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

  const locationState = location.state as { backgroundView?: ViewMode } | null;
  const isMovieRoute = /^\/(movie|series)\//.test(location.pathname);

  const viewMode: ViewMode = (isMovieRoute && locationState?.backgroundView)
    ? locationState.backgroundView
    : (pathToView[location.pathname] ?? "home");

  const activeTab = viewMode === "home" ? "home" : viewMode;
  const deviceProfile = useDeviceProfile();
  const homeFeedLimit = deviceProfile.isMobile ? 16 : deviceProfile.isCompact ? 24 : 32;
  const browseBatchLimit = deviceProfile.isMobile
    ? 28
    : deviceProfile.isCompact
      ? 36
      : Math.min(Math.max(deviceProfile.homeGridItems * 2, 48), 80);
  const originalsInitialLimit = browseBatchLimit;
  const seriesFetchBatchLimit = Math.min(browseBatchLimit * 2, 200);
  const heroMovieLimit = deviceProfile.isMobile ? 8 : 12;
  const heroSeriesLimit = deviceProfile.isMobile ? 2 : 4;


  // Data states
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [categoryMovies, setCategoryMovies] = useState<Movie[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const continueWatching = useContinueWatching();
  const [activePlaybackItem, setActivePlaybackItem] = useState<ContinueWatching | null>(null);
  const activePlaybackItemRef = useRef<ContinueWatching | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [recentSeries, setRecentSeries] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | Series | null>(null);
  const [selectedMovieDetailsLoading, setSelectedMovieDetailsLoading] = useState(false);

  // UI states
  const [activeCategory, setActiveCategory] = useState("trending");
  const [activeVJ, setActiveVJ] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [activePlayerMovie, setActivePlayerMovie] = useState<Movie | Series | null>(null);
  const [activePlayerSubtitles, setActivePlayerSubtitles] = useState<SubtitleTrack[]>([]);
  const [activePlayerSkipSegments, setActivePlayerSkipSegments] = useState<SkipSegment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [originalsPage, setOriginalsPage] = useState(1);
  const selectedMovieRef = useRef<Movie | Series | null>(null);
  const prefetchedSeriesDetailsRef = useRef<Set<string>>(new Set());
  const modalHistoryRef = useRef(false);
  const videoHistoryRef = useRef(false);
  const moviesHistoryRef = useRef(false);
  const searchHistoryRef = useRef(false);
  const lastBackPressRef = useRef(0);
  const exitToastTimerRef = useRef<number | null>(null);
  const [showExitToast, setShowExitToast] = useState(false);
  const [isAuthGatedModalOpen, setIsAuthGatedModalOpen] = useState(false);
  const [gatedAction, setGatedAction] = useState<"watch" | "download" | "general">("general");
  const { user, loading: authLoading } = useAuth();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showDeferredHomeSections, setShowDeferredHomeSections] = useState(false);
  const [isStayedAlertOpen, setIsStayedAlertOpen] = useState(false);

  const [activeFilters, setActiveFilters] = useState<FilterState>({
    category: null,
    vj: null,
    year: null,
    contentType: "movies",
  });
  const [nextLoadOffset, setNextLoadOffset] = useState(0);
  const [allVJs, setAllVJs] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    scheduleLowPriorityTask(() => {
      loadMovieModal().catch(() => undefined);
    });
  }, []);

  const filterCategories = useMemo(() => [
    { id: "trending", label: "Latest Added" },
    { id: "new-week", label: "New This Week" },
    ...Object.entries(CATEGORY_TO_GENRE).map(([id, label]) => ({ id, label }))
  ], []);

  const filterYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 25 }, (_, i) => currentYear - i);
  }, []);

  useEffect(() => {
    // Only show the "Enjoying MovieBay?" prompt to guests
    if (user) return;

    const timer = setTimeout(() => {
      setIsStayedAlertOpen(true);
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [user]);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const revealDeferredUi = () => {
      startTransition(() => {
        setShowDeferredHomeSections(true);
      });
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => revealDeferredUi());
    } else {
      timeoutId = window.setTimeout(revealDeferredUi, 250);
    }

    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  // React Query for instant tab switching and caching
  const { data: heroData, isLoading: isHeroLoading } = useQuery({
    queryKey: ["hero", "latest", heroMovieLimit],
    queryFn: () => fetchHeroLatest(heroMovieLimit),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home",
  });

  const { data: trendingData } = useQuery({
    queryKey: ["trending"],
    queryFn: () => fetchTrending(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const { data: moviesQueryData, isLoading: isMoviesLoading } = useQuery({
    queryKey: ["movies", "recent", 1, browseBatchLimit],
    queryFn: () => fetchMoviesSorted("movie", browseBatchLimit, 1),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "movies" || viewMode === "home",
  });

  const { data: seriesQueryData, isLoading: isSeriesLoading } = useQuery({
    queryKey: ["series", "recent", 1, browseBatchLimit],
    queryFn: () => fetchSeries(browseBatchLimit, 1),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "series" || viewMode === "home",
  });

  const { data: originalsQueryData, isLoading: isOriginalsLoading } = useQuery({
    queryKey: ["movies", "originals", 1, originalsInitialLimit],
    queryFn: () => fetchOriginals(originalsInitialLimit, 1),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "originals",
  });

  const shouldShowHero = siteSettings.hero_carousel_enabled;

  useEffect(() => {
    let cancelled = false;

    if (viewMode !== "home" && viewMode !== "movies" && viewMode !== "series" && !isModalOpen) {
      return;
    }

    scheduleLowPriorityTask(() => {
      if (!cancelled) {
        void loadCinematicVideoPlayer();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isModalOpen, viewMode]);

  useEffect(() => {
    if (!isModalOpen || !selectedMovie) return;

    const mediaUrl = buildPrimaryPlaybackUrl(selectedMovie);
    if (!mediaUrl) return;

    scheduleLowPriorityTask(() => {
      primeMediaAvailability(mediaUrl);
    });
  }, [isModalOpen, selectedMovie]);

  // Dynamic SEO per view/modal
  const seoTitleMap: Record<ViewMode, string> = {
    home: "",
    movies: "Browse Uganda Translated Movies",
    series: "Browse Translated Series",
    search: searchQuery ? `Search: ${searchQuery}` : "Search VJ Translated Movies",
    originals: "Originals",
  };
  const seoTitle = selectedMovie && isModalOpen
    ? selectedMovie.title
    : seoTitleMap[viewMode] || "";
  const seoDescription = selectedMovie && isModalOpen
    ? selectedMovie.description || `Watch ${selectedMovie.title} translated to Luganda by top VJs on Moviebay Uganda`
    : undefined;

  useDocumentSEO({
    title: selectedMovie?.title || seoTitle || undefined,
    vjName: selectedMovie?.vj_name,
    year: selectedMovie?.year,
    description: seoDescription,
    imageUrl: selectedMovie?.image_url || selectedMovie?.backdrop_url || undefined,
    genres: selectedMovie?.genres,
    canonicalPath: selectedMovie && isModalOpen 
      ? `/${selectedMovie.type === 'series' ? 'series' : 'movie'}/${toSlug(selectedMovie.title, selectedMovie.mobifliks_id, selectedMovie.year)}`
      : `/${viewMode === "home" ? "" : viewMode}`,
    jsonLd: selectedMovie && isModalOpen ? buildMovieJsonLd(selectedMovie) : undefined,
  });


  const sortByYearDesc = useCallback((items: Movie[]) => {
    return [...items].sort((a, b) => {
      const dateA = a.release_date || "";
      const dateB = b.release_date || "";
      if (dateA && dateB) {
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
      }
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;

      const yearA = a.year || 0;
      const yearB = b.year || 0;
      if (yearA !== yearB) return yearB - yearA;

      return 0;
    });
  }, []);

  const sortByLatestAdded = useCallback((items: Movie[]) => {
    return [...items].sort((a, b) => {
      const createdA = a.created_at || "";
      const createdB = b.created_at || "";
      if (createdA && createdB) {
        if (createdA > createdB) return -1;
        if (createdA < createdB) return 1;
      }
      if (createdA && !createdB) return -1;
      if (!createdA && createdB) return 1;

      const dateA = a.release_date || "";
      const dateB = b.release_date || "";
      if (dateA && dateB) {
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
      }
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;

      return (b.year || 0) - (a.year || 0);
    });
  }, []);

  const preloadHeroAssets = useCallback(
    (items: Movie[]) => {
      preloadHeroMovies(items, deviceProfile.allowHighResImages, deviceProfile.isMobile ? 3 : 5);
    },
    [deviceProfile.allowHighResImages, deviceProfile.isMobile],
  );

  const heroCarouselMovies = useMemo(() => {
    if (!heroData?.length) return trending;
    const heroMovies = heroData
      .filter((movie: Movie) => movie.type === "movie")
      .slice(0, heroMovieLimit);
    const heroSeries = seriesQueryData?.length
      ? seriesQueryData.slice(0, heroSeriesLimit)
      : [];
    return [...heroMovies, ...heroSeries].slice(0, heroMovieLimit + heroSeriesLimit);
  }, [heroData, heroMovieLimit, heroSeriesLimit, seriesQueryData, trending]);

  const prefetchSeriesDetailsFor = useCallback((items: Array<Movie | Series>, limit = 4) => {
    const candidates = items
      .filter((item): item is Movie => item.type === "series")
      .filter((item) => !prefetchedSeriesDetailsRef.current.has(item.mobifliks_id))
      .slice(0, limit);

    if (candidates.length === 0) return;

    void Promise.all(candidates.map(async (item) => {
      prefetchedSeriesDetailsRef.current.add(item.mobifliks_id);
      try {
        await fetchSeriesDetails(item.mobifliks_id);
      } catch (error) {
        console.error("Error prefetching series details:", error);
        prefetchedSeriesDetailsRef.current.delete(item.mobifliks_id);
      }
    }));
  }, []);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      if (heroData) {
        const heroMovies = heroData
          .filter((m: Movie) => m.type === "movie")
          .slice(0, heroMovieLimit);
        const heroSeries = seriesQueryData && seriesQueryData.length > 0
          ? seriesQueryData.slice(0, heroSeriesLimit)
          : [];

        const newTrending = [...heroMovies, ...heroSeries].slice(0, heroMovieLimit + heroSeriesLimit);
        preloadHeroAssets(newTrending);
        startTransition(() => {
          setTrending(newTrending);
        });

        if (newTrending.length > 0) {
          preloadMovieBackdrop(newTrending[0]);
        }
      }

      if (trendingData) {
        startTransition(() => {
          setRecentMovies([...trendingData]);
        });
      } else if (moviesQueryData) {
        startTransition(() => {
          setRecentMovies(sortByLatestAdded(moviesQueryData));
        });
      }

      if (seriesQueryData) {
        startTransition(() => {
          setRecentSeries(sortByYearDesc(seriesQueryData));
        });
      }

      const allAvailable = [
        ...(trendingData || []),
        ...(moviesQueryData || []),
        ...(seriesQueryData || []),
      ];

      const vjSet = new Set<string>();
      ["Junior", "Jingo", "Ice P", "Emmy", "Kevo"].forEach(vj => vjSet.add(normalizeVjName(vj)));
      allAvailable.forEach((movie: Movie) => {
        if (movie.vj_name && movie.vj_name.trim()) {
          const normalizedVj = normalizeVjName(movie.vj_name);
          if (normalizedVj) vjSet.add(normalizedVj);
        }
      });

      const vjList = Array.from(vjSet)
        .filter(vj => vj.toLowerCase() !== "juniorv")
        .sort((a, b) => a.localeCompare(b))
        .map(vj => ({ id: vj, label: `VJ ${vj}` }));

      startTransition(() => {
        if (vjList.length > 0) {
          setAllVJs(vjList);
        }
      });
    }
    loadData();
  }, [heroData, heroMovieLimit, heroSeriesLimit, moviesQueryData, preloadHeroAssets, seriesQueryData, sortByLatestAdded, sortByYearDesc, trendingData]);

  useEffect(() => {
    if (!showDeferredHomeSections) return;

    let cancelled = false;

    void (async () => {
      try {
        const statsRes = await fetchStats();
        if (!statsRes || cancelled) return;

        startTransition(() => {
          setPopularSearches(
            statsRes.popular_searches
              .map((s: string) => s.replace(/\s*\(\d+ searches\)\s*$/g, "").trim())
              .filter(Boolean)
              .slice(0, 8)
          );
        });
      } catch (error) {
        console.error("Error loading extra data:", error);
      }
    })();

  }, [showDeferredHomeSections]);



  useEffect(() => {
    const combinedSeries: Movie[] = [];
    const seen = new Set<string>();

    for (const item of [...recentSeries, ...trending, ...categoryMovies]) {
      if (item.type !== "series" || seen.has(item.mobifliks_id)) continue;
      seen.add(item.mobifliks_id);
      combinedSeries.push(item);
    }

    prefetchSeriesDetailsFor(combinedSeries, viewMode === "series" ? 8 : 4);
  }, [categoryMovies, prefetchSeriesDetailsFor, recentSeries, trending, viewMode]);

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
    if (viewMode === "movies" && moviesQueryData) {
      setCategoryMovies(sortByYearDesc(moviesQueryData));
      setNextLoadOffset(browseBatchLimit);
      setIsLoading(false);
    } else if (viewMode === "series" && seriesQueryData) {
      setCategoryMovies(sortByYearDesc(seriesQueryData));
      setNextLoadOffset(seriesFetchBatchLimit);
      setIsLoading(false);
    } else if (viewMode === "originals" && originalsQueryData) {
      setCategoryMovies(sortByYearDesc(originalsQueryData));
      setOriginalsPage(1);
      setNextLoadOffset(originalsInitialLimit);
      setIsLoading(false);
    } else if ((viewMode === "movies" && isMoviesLoading) ||
      (viewMode === "series" && isSeriesLoading) ||
      (viewMode === "originals" && isOriginalsLoading)) {
      setIsLoading(true);
    }
  }, [viewMode, moviesQueryData, seriesQueryData, originalsQueryData, isMoviesLoading, isSeriesLoading, isOriginalsLoading, browseBatchLimit, originalsInitialLimit, seriesFetchBatchLimit]);


  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    navigateTo("/search");
    setCurrentPage(1);
    setIsLoading(true);
    addRecentSearch(query);

    try {
      const results = await searchMovies(query, 1, 50);
      setSearchResults(results.results);
      setTotalResults(results.total_results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMovieClick = useCallback(async (movie: Movie) => {
    let resolvedMovie: Movie | Series = movie;
    const needsSeriesDetails = movie.type === "series" && (!("episodes" in movie) || !(movie as Series).episodes?.length);

    if (needsSeriesDetails) {
      const cachedDetails = getCachedSeriesDetails(movie.mobifliks_id);
      if (cachedDetails?.episodes?.length) {
        resolvedMovie = cachedDetails;
      }
    }

    setSelectedMovie(resolvedMovie);
    setSelectedMovieDetailsLoading(
      resolvedMovie.type === "series" && (!("episodes" in resolvedMovie) || !(resolvedMovie as Series).episodes?.length)
    );
    setIsModalOpen(true);

    const typeSlug = movie.type === "series" ? "series" : "movie";
    const urlSlug = toSlug(movie.title, movie.mobifliks_id, movie.year);
    requestAnimationFrame(() => {
      navigateTo(`/${typeSlug}/${urlSlug}`, {
        replace: false,
        state: { backgroundView: viewMode }
      });
    });

    scheduleLowPriorityTask(() => addToRecent(resolvedMovie));

    void (async () => {
      try {
        const details = movie.type === "series"
          ? await fetchSeriesDetails(movie.mobifliks_id)
          : await fetchMovieDetails(movie.mobifliks_id);

        if (details) {
          startTransition(() => {
            setSelectedMovie(details);
          });
        }
      } catch (error) {
        console.error("Error fetching details:", error);
      } finally {
        if (selectedMovieRef.current?.mobifliks_id === movie.mobifliks_id) {
          setSelectedMovieDetailsLoading(false);
        }
      }
    })();
  }, [navigateTo, viewMode]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMovieDetailsLoading(false);
    
    if (location.pathname.startsWith("/movie/") || location.pathname.startsWith("/series/")) {
      const targetPath = viewMode === "home" ? "/" : `/${viewMode}`;
      navigateTo(targetPath, { replace: true });
    }
  }, [location.pathname, navigateTo, viewMode]);

  const handleCloseVideo = useCallback(() => {
    setIsVideoOpen(false);
    setActivePlaybackItem(null);
    setActivePlayerMovie(null);
    setActivePlayerSubtitles([]);
    setActivePlayerSkipSegments([]);
    
    if (location.pathname.startsWith("/movie/") || location.pathname.startsWith("/series/")) {
      const targetPath = viewMode === "home" ? "/" : `/${viewMode}`;
      navigateTo(targetPath, { replace: true });
    }
  }, [location.pathname, navigateTo, viewMode]);

  selectedMovieRef.current = selectedMovie;

  const handlePlayVideo = useCallback(async (
    url: string, 
    title: string, 
    startAt = 0, 
    playbackItem?: ContinueWatching,
    mobifliksId?: string,
    detailsUrl?: string
  ) => {
    const proxiedUrl = await buildMediaUrl({ 
      url, 
      title, 
      play: true,
      mobifliksId,
      detailsUrl
    });
    
    // Always enforce proxy if available to avoid direct link issues on certain devices.
    let playbackUrl = proxiedUrl;

    const movie = selectedMovieRef.current;
    const parsedEpisode = parseEpisodeInfoFromTitle(title);
    const selectedSeries = movie?.type === "series" ? movie as Series : null;
    const matchedEpisode = selectedSeries?.episodes?.find((episode) => {
      if (parsedEpisode.seasonNumber && parsedEpisode.episodeNumber) {
        return (
          (episode.season_number || 1) === parsedEpisode.seasonNumber &&
          episode.episode_number === parsedEpisode.episodeNumber
        );
      }
      return episode.download_url === url;
    });
    const fallbackItem: ContinueWatching | null = movie
      ? {
        id: movie.type === "series" ? `series:${movie.mobifliks_id}` : `movie:${movie.mobifliks_id}`,
        contentId: movie.mobifliks_id,
        title: movie.title,
        image: movie.backdrop_url || movie.image_url || "",
        type: movie.type,
        progress: startAt,
        duration: 0,
        url: playbackUrl,
        seriesId: movie.type === "series" ? movie.mobifliks_id : undefined,
        episodeId: matchedEpisode?.mobifliks_id,
        episodeTitle: matchedEpisode?.title,
        seasonNumber: parsedEpisode.seasonNumber ?? matchedEpisode?.season_number,
        episodeNumber: parsedEpisode.episodeNumber ?? matchedEpisode?.episode_number,
        episodeInfo: parsedEpisode.seasonNumber && parsedEpisode.episodeNumber
          ? `S${parsedEpisode.seasonNumber}:E${parsedEpisode.episodeNumber}`
          : undefined,
      }
      : null;

    const playbackMovie: Movie | Series | null = movie
      ? movie
      : playbackItem
        ? {
            mobifliks_id: playbackItem.contentId,
            title: playbackItem.title,
            image_url: playbackItem.image,
            type: playbackItem.type,
          }
        : null;

    const playbackSubtitles =
      matchedEpisode?.subtitles ??
      movie?.subtitles ??
      [];

    const playbackSkipSegments =
      matchedEpisode?.skip_segments ??
      movie?.skip_segments ??
      [];

    primeMediaAvailability(url);
    setVideoUrl(playbackUrl);
    setVideoTitle(title);
    setVideoStartTime(startAt);
    setActivePlaybackItem(playbackItem ?? fallbackItem);
    setActivePlayerMovie(playbackMovie);
    setActivePlayerSubtitles(playbackSubtitles);
    setActivePlayerSkipSegments(playbackSkipSegments);
    setIsVideoOpen(true);
    setIsModalOpen(false);
  }, []);

  const nextEpisodePlayback = useMemo(() => {
    const series = activePlayerMovie?.type === "series" ? (activePlayerMovie as Series) : null;
    if (!series?.episodes?.length) return null;

    const parsed = parseEpisodeInfoFromTitle(videoTitle);
    const episodes = [...series.episodes].sort((a, b) => {
      const seasonA = a.season_number ?? 1;
      const seasonB = b.season_number ?? 1;
      if (seasonA !== seasonB) return seasonA - seasonB;
      return a.episode_number - b.episode_number;
    });

    const currentIndex = episodes.findIndex((episode) => {
      if (parsed.seasonNumber && parsed.episodeNumber) {
        return (
          (episode.season_number ?? 1) === parsed.seasonNumber &&
          episode.episode_number === parsed.episodeNumber
        );
      }
      return episode.mobifliks_id === activePlaybackItem?.episodeId;
    });

    if (currentIndex < 0 || currentIndex >= episodes.length - 1) return null;

    const next = episodes[currentIndex + 1];
    const nextUrl = next.server2_url || next.download_url;
    if (!nextUrl) return null;

    const seasonNumber = next.season_number ?? 1;
    return {
      episode: next,
      title: `${series.title} - S${seasonNumber}:E${next.episode_number}`,
      url: nextUrl,
    };
  }, [activePlaybackItem?.episodeId, activePlayerMovie, videoTitle]);

  const handlePlayNextEpisode = useCallback(() => {
    if (!nextEpisodePlayback) return;
    const { episode, title: nextTitle, url } = nextEpisodePlayback;
    void handlePlayVideo(
      url,
      nextTitle,
      0,
      undefined,
      episode.mobifliks_id,
      episode.video_page_url,
    );
  }, [handlePlayVideo, nextEpisodePlayback]);

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
        setActivePlaybackItem(null);
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

  const handleHeroPlay = useCallback(async (movie: Movie) => {
    if (!user) {
      localStorage.setItem("intendedAction", JSON.stringify({ type: "movie", data: movie, action: "play" }));
      setGatedAction("watch");
      setIsAuthGatedModalOpen(true);
      return;
    }
    const targetUrl = movie.server2_url || movie.download_url;
    if (targetUrl) {
      const mediaUrl = await buildMediaUrl({
        url: targetUrl,
        title: movie.title,
        detailsUrl: movie.video_page_url || movie.details_url,
        mobifliksId: movie.mobifliks_id,
        play: true,
      });
      const item: ContinueWatching = {
        id: movie.type === "series" ? `series:${movie.mobifliks_id}` : `movie:${movie.mobifliks_id}`,
        contentId: movie.mobifliks_id,
        title: movie.title,
        image: movie.backdrop_url || movie.image_url || "",
        type: movie.type,
        progress: 0,
        duration: 0,
        url: mediaUrl,
      };
      handlePlayVideo(mediaUrl, movie.title, 0, item);
    } else {
      handleMovieClick(movie);
    }
  }, [handlePlayVideo, handleMovieClick, user]);

  // Handle auto-resumption of intended actions after login
  useEffect(() => {
    if (!authLoading && user && !isLoading && trending.length > 0) {
      const savedAction = localStorage.getItem("intendedAction");
      if (savedAction) {
        try {
          const action = JSON.parse(savedAction);
          localStorage.removeItem("intendedAction");
          
          toast.success(`Welcome back! Resuming your request...`);
          
          if (action.type === "movie") {
            const movie = action.data as Movie;
            
            // If it was a direct play request (from hero)
            if (action.action === "play") {
              handleHeroPlay(movie);
            } else {
              handleMovieClick(movie);
              if (action.action === "download") {
                toast("Ready to download! Click the download button in the details.");
              }
            }
          }
        } catch (e) {
          console.error("Failed to resume intended action", e);
        }
      }
    }
  }, [user, authLoading, isLoading, trending, handleHeroPlay, handleMovieClick]);

  const videoUrlRef = useRef(videoUrl);
  videoUrlRef.current = videoUrl;
  activePlaybackItemRef.current = activePlaybackItem;
  const lastContinueWatchingWriteRef = useRef(0);

  const handleVideoTimeUpdate = useCallback((currentTime: number, duration: number) => {
    const item = activePlaybackItemRef.current;
    if (duration > 0 && item) {
      const now = Date.now();
      if (now - lastContinueWatchingWriteRef.current < 5000) return;
      lastContinueWatchingWriteRef.current = now;
      updateContinueWatching({
        ...item,
        progress: currentTime,
        duration,
        url: videoUrlRef.current,
      });
    }
  }, []);

  const { theme } = useTheme();
  const isDark = theme === "dark" || !theme;
  const currentLogo = isDark ? logoDark : logoLight;

  const handleTabChange = useCallback((tab: string) => {
    const viewToPath: Record<string, string> = {
      home: "/",
      movies: "/movies",
      series: "/series",
      search: "/search",
      originals: "/originals",
      profile: "/profile",
    };
    const path = viewToPath[tab];
    if (!path) return;
    window.scrollTo({ top: 0, behavior: "instant" });

    startTransition(() => {
      navigateTo(path);
      setActiveFilters({ category: null, vj: null, year: null, contentType: tab === "movies" ? "movies" : tab === "series" ? "series" : null });
      setActiveVJ(null);
      setActiveCategory("trending");
      setOriginalsPage(1);
      setNextLoadOffset(0);

      if (tab === "home") {
        setSearchQuery("");
      }
    });
  }, [navigateTo]);

  const handleCategoryChange = useCallback(async (category: string, vjOverride?: string | null) => {
    setActiveCategory(category);
    if (vjOverride === undefined) setActiveVJ(null);
    setIsLoading(true);
    const vj = vjOverride === undefined ? null : vjOverride;
    const dbFilters: FilterOptions = { vj };
    setActiveFilters((prev) => ({ ...prev, category, vj }));
    try {
      if (category === "trending") {
        const data = await fetchTrending(dbFilters);
        startTransition(() => {
          setRecentMovies(data);
        });
      } else if (category === "new-week") {
        const data = await fetchNewThisWeek("movie", 40, 0, dbFilters);
        startTransition(() => {
          setRecentMovies(sortByLatestAdded(data));
        });
      } else {
        const genre = CATEGORY_TO_GENRE[category] || category;
        const data = await fetchByGenre(genre, "movie", 40, dbFilters);
        startTransition(() => {
          setRecentMovies(sortByYearDesc(data));
        });
      }
    } catch (error) {
      console.error("Error loading category:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sortByLatestAdded, sortByYearDesc]);

  const handleVJChange = useCallback(async (vj: string | null) => {
    setActiveVJ(vj);
    handleCategoryChange(activeCategory, vj);
  }, [activeCategory, handleCategoryChange]);

  const handleApplyFilters = useCallback(async (filters: FilterState) => {
    setIsLoading(true);
    const dbFilters: FilterOptions = { vj: filters.vj, year: filters.year };

    try {
      if (filters.contentType) {
        const contentViewMode = filters.contentType === "movies" ? "movies" : "series";
        navigateTo(`/${contentViewMode}`);

        let data: Movie[] = [];
        if (filters.contentType === "movies") {
          if (filters.category && filters.category !== "trending") {
            if (filters.category === "new-week") {
              data = await fetchNewThisWeek("movie", 100, 0, dbFilters);
            } else {
              const genre = CATEGORY_TO_GENRE[filters.category] || filters.category;
              data = await fetchByGenre(genre, "movie", 100, dbFilters);
            }
          } else {
            data = await fetchMoviesSorted("movie", 100, 1, dbFilters);
          }
        } else {
          if (filters.category && filters.category !== "trending") {
            if (filters.category === "new-week") {
              data = await fetchNewThisWeek("series", 100, 0, dbFilters);
            } else {
              const genre = CATEGORY_TO_GENRE[filters.category] || filters.category;
              data = await fetchByGenre(genre, "series", 100, dbFilters);
            }
          } else {
            data = await fetchSeries(100, 1, undefined, dbFilters);
          }
        }

        startTransition(() => {
          setCategoryMovies(filters.category === "new-week" ? sortByLatestAdded(data) : sortByYearDesc(data));
          setActiveVJ(filters.vj);
          setActiveFilters(filters);
          setNextLoadOffset(
            filters.contentType === "series" && filters.category !== "new-week"
              ? Math.min(100 * 2, 200)
              : 100
          );
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        let data: Movie[] = [];

        if (filters.category === "new-week") {
          data = await fetchNewThisWeek("movie", 100, 0, dbFilters);
        } else if (filters.category && filters.category !== "trending") {
          const genre = CATEGORY_TO_GENRE[filters.category] || filters.category;
          data = await fetchByGenre(genre, "movie", 100, dbFilters);
        } else if (filters.category === "trending") {
          data = await fetchTrending(dbFilters);
        } else {
          data = await fetchMoviesSorted("movie", 100, 1, dbFilters);
        }

        startTransition(() => {
          if (filters.category) {
            setActiveCategory(filters.category);
          }
          setActiveVJ(filters.vj);
          setActiveFilters(filters);
          setRecentMovies(filters.category === "trending" ? data : filters.category === "new-week" ? sortByLatestAdded(data) : sortByYearDesc(data));
        });
      }
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigateTo, sortByLatestAdded, sortByYearDesc]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    const dbFilters: FilterOptions = { vj: activeFilters.vj, year: activeFilters.year };
    try {
      let more: Movie[] = [];
      if (viewMode === "movies") {
        if (activeFilters.category === "new-week") {
          more = await fetchNewThisWeek("movie", browseBatchLimit, nextLoadOffset, dbFilters);
        } else if (activeFilters.category && activeFilters.category !== "trending") {
          const genre = CATEGORY_TO_GENRE[activeFilters.category] || activeFilters.category;
          more = await fetchByGenre(genre, "movie", browseBatchLimit, dbFilters, 1, nextLoadOffset);
        } else {
          more = await fetchMoviesSorted("movie", browseBatchLimit, 1, dbFilters, nextLoadOffset);
        }
        setNextLoadOffset((prev) => prev + browseBatchLimit);
      } else if (viewMode === "series") {
        if (activeFilters.category === "new-week") {
          more = await fetchNewThisWeek("series", browseBatchLimit, nextLoadOffset, dbFilters);
          setNextLoadOffset((prev) => prev + browseBatchLimit);
        } else if (activeFilters.category && activeFilters.category !== "trending") {
          const genre = CATEGORY_TO_GENRE[activeFilters.category] || activeFilters.category;
          more = await fetchByGenre(genre, "series", browseBatchLimit, dbFilters, 1, nextLoadOffset);
          setNextLoadOffset((prev) => prev + seriesFetchBatchLimit);
        } else {
          more = await fetchSeries(browseBatchLimit, 1, undefined, dbFilters, nextLoadOffset);
          setNextLoadOffset((prev) => prev + seriesFetchBatchLimit);
        }
      } else if (viewMode === "originals") {
        const nextOriginalsPage = originalsPage + 1;
        const originals = await fetchOriginals(browseBatchLimit, nextOriginalsPage);
        more = sortByYearDesc(originals);
        setOriginalsPage(nextOriginalsPage);
        setNextLoadOffset((prev) => prev + browseBatchLimit);
      }

      const existingIds = new Set(categoryMovies.map(m => m.mobifliks_id));
      const newMovies = more.filter(m => !existingIds.has(m.mobifliks_id));
      startTransition(() => {
        setCategoryMovies(prev => activeFilters.category === "new-week"
          ? sortByLatestAdded([...prev, ...newMovies])
          : sortByYearDesc([...prev, ...newMovies])
        );
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [categoryMovies, viewMode, isLoadingMore, originalsPage, sortByLatestAdded, sortByYearDesc, activeFilters, nextLoadOffset, browseBatchLimit, seriesFetchBatchLimit]);

  const getCategoryTitle = () => {
    const titles: Record<string, string> = {
      trending: "Latest Added",
      "new-week": "New This Week",
      action: "Action",
      adventure: "Adventure",
      crime: "Crime",
      romance: "Romance",
      animation: "Animation",
      horror: "Horror",
      special: "Special",
      drama: "Drama",
      fantasy: "Fantasy",
      "sci-fi": "Sci-Fi",
      thriller: "Thriller",
    };
    if (activeCategory === "trending") return "Latest Added";
    if (activeCategory === "new-week") return "New This Week";
    return `Trending in ${titles[activeCategory] || "All"}`;
  };


  return (
    <div className="min-h-screen pb-safe relative isolate [transform-style:flat]">
      {/* Premium Dynamic Mesh Background */}
      <DynamicBackground />

      {/* Site Announcement */}
      <div className="relative z-10">

        {/* Header — memo'd at component level, properly bails out on unchanged props */}
        <Header
          onSearch={handleSearch}
          onMovieSelect={handleMovieClick}
          popularSearches={popularSearches}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content */}
        <main className={`container mx-auto px-4 ${viewMode === "home" ? "pt-0 pb-4" : "pb-4 pt-[calc(6.5rem+env(safe-area-inset-top))] md:pt-28"}`}>
          {/* Home View */}
          {viewMode === "home" && (
            <div>
              {shouldShowHero && (
                <Suspense fallback={null}>
                  <HeroCarousel
                    movies={heroCarouselMovies}
                    onPlay={handleHeroPlay}
                    onMovieClick={handleMovieClick}
                    title="Latest on Moviebay"
                    onViewAll={() => handleTabChange("movies")}
                    isLoading={isHeroLoading && heroCarouselMovies.length === 0}
                  />
                </Suspense>
              )}

              <div className="mt-8">
                <CategoryChips
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                />
              </div>

              <div className="mt-4">
                <VJChips
                  activeVJ={activeVJ}
                  onVJChange={handleVJChange}
                  vjs={allVJs}
                />
              </div>

              {siteSettings.continue_watching_enabled && continueWatching.length > 0 && (
                <SectionReveal delay={200}>
                  <div className="mt-8">
                    <div className="section-divider mb-2" />
                    <Suspense fallback={null}>
                      <ContinueWatchingRow
                        items={continueWatching}
                        onResume={async (item) => {
                          const resumeTitle = item.episodeInfo
                            ? `${item.title} - ${item.episodeInfo}`
                            : item.title;
                          const mediaUrl = await buildMediaUrl({
                            url: item.url,
                            title: resumeTitle,
                            mobifliksId: item.contentId,
                            play: true,
                          });
                          handlePlayVideo(mediaUrl, resumeTitle, Number(item.progress) || 0, {
                            ...item,
                            url: mediaUrl,
                          });
                        }}
                        onRemove={(id) => removeContinueWatching(id)}
                      />
                    </Suspense>
                  </div>
                </SectionReveal>
              )}

              <div className="mt-4">
                <div className="section-divider mb-2" />
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

              {showDeferredHomeSections && (
                <Suspense fallback={null}>
                  <div className="mt-12 space-y-12 pb-12">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight">Discover More</h2>
                      <p className="text-muted-foreground text-sm">Hand-picked collections just for you</p>
                    </div>

                    {siteSettings.top10_enabled && (
                      <SectionReveal delay={100}>
                        <div className="section-divider mb-4" />
                        <Top10Row
                          movies={recentMovies}
                          onMovieClick={handleMovieClick}
                        />
                      </SectionReveal>
                    )}

                    {continueWatching.length > 0 && recentMovies.length > 0 && (
                      <SectionReveal delay={200}>
                        <div className="section-divider mb-4" />
                        <RecommendationRow
                          continueWatching={continueWatching}
                          allMovies={[...recentMovies, ...recentSeries]}
                          onMovieClick={handleMovieClick}
                        />
                      </SectionReveal>
                    )}

                    <SectionReveal delay={300}>
                      <div className="section-divider mb-4" />
                      <MovieRow
                        title="Popular Series"
                        movies={recentSeries}
                        onMovieClick={handleMovieClick}
                        onViewAll={() => handleTabChange("series")}
                        isLoading={isLoading && recentSeries.length === 0}
                      />
                    </SectionReveal>
                  </div>
                </Suspense>
              )}
            </div>
          )}

          {/* Search View */}
          {viewMode === "search" && (
            <PageTransition>
              <div className="space-y-6">
                <div className="max-w-xl mx-auto">
                  <Suspense fallback={<div className="h-12 rounded-full bg-card/60 border border-border/30" />}>
                    <SearchBar
                      onSearch={handleSearch}
                      onMovieSelect={handleMovieClick}
                      popularSearches={popularSearches}
                    />
                  </Suspense>
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
              <div className="browse-page-shell space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTabChange("home")}
                    className="shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="browse-page-title text-xl font-semibold">All Movies</h2>
                </div>

                <MovieGrid
                  movies={categoryMovies}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoading && categoryMovies.length === 0}
                  appendSkeletonCount={isLoadingMore ? Math.min(browseBatchLimit, 16) : 0}
                />

                {categoryMovies.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="browse-load-more gap-2"
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
              <div className="browse-page-shell space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTabChange("home")}
                    className="shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="browse-page-title text-xl font-semibold">All Series</h2>
                </div>

                <MovieGrid
                  movies={categoryMovies}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoading && categoryMovies.length === 0}
                  appendSkeletonCount={isLoadingMore ? Math.min(browseBatchLimit, 16) : 0}
                />

                {categoryMovies.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="browse-load-more gap-2"
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
              <div className="browse-page-shell space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTabChange("home")}
                    className="shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="browse-page-title text-xl font-semibold">Originals (English)</h2>
                </div>

                <MovieGrid
                  movies={categoryMovies}
                  onMovieClick={handleMovieClick}
                  isLoading={isLoading && categoryMovies.length === 0}
                  appendSkeletonCount={isLoadingMore ? Math.min(browseBatchLimit, 16) : 0}
                  emptyMessage="No English originals found."
                />

                {categoryMovies.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="browse-load-more gap-2"
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

        {showExitToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur border border-border/50 text-sm text-foreground shadow-lg">
            Press back again to exit
          </div>
        )}
        {/* Minimal Footer for Verification & Navigation */}
        <footer className="container relative z-10 mx-auto pb-8 px-2 pt-16 mt-8 border-t border-white/[0.05] flex flex-col">
          <div className="mb-4 self-start h-[35px]">
            <img 
              alt="MovieBay Logo" 
              className="h-full w-auto object-contain" 
              src={currentLogo} 
            />
          </div>
          <div className="mb-4 self-start">
            <div className="mt-2 text-sm text-muted-foreground max-w-lg text-left">
              <p>MovieBay does not host any media files, instead, it provides links to third-party services. Legal concerns regarding the files should be addressed directly with the respective file hosts and providers. MovieBay bears no responsibility for the media files displayed by the providers.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground self-start">
            <Link className="hover:text-white transition-colors" to="/dmca">DMCA</Link>
            <Link className="hover:text-white transition-colors" to="/settings">Settings</Link>
            <Link className="hover:text-white transition-colors" to="/privacy">Privacy Policy</Link>
            <Link className="hover:text-white transition-colors" to="/terms">Terms of Service</Link>
          </div>
        </footer>

        {/* Lazy Loaded Heavy Modals */}
        <Suspense fallback={null}>
          {/* Movie Details Modal */}
          {isModalOpen && selectedMovie && (
            <MovieModal
              movie={selectedMovie}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
              onPlay={handlePlayVideo}
              detailsLoading={selectedMovieDetailsLoading}
              onMovieSelect={handleMovieClick}
              onAuthRequired={(action) => {
                if (selectedMovie) {
                  // Close the details modal first so it doesn't block interactions on the auth prompt
                  setIsModalOpen(false);
                  localStorage.setItem("intendedAction", JSON.stringify({ type: "movie", data: selectedMovie, action: action === "watch" ? "play" : "download" }));
                  setGatedAction(action);
                  setIsAuthGatedModalOpen(true);
                }
              }}
            />
          )}

          {/* Cinematic Video Player */}
          {isVideoOpen && (
            <CinematicVideoPlayer
              isOpen={isVideoOpen}
              onClose={handleCloseVideo}
              videoUrl={videoUrl}
              title={videoTitle}
              movie={activePlayerMovie}
              onTimeUpdate={handleVideoTimeUpdate}
              startTime={videoStartTime}
              subtitles={activePlayerSubtitles}
              skipSegments={activePlayerSkipSegments}
              hasNextEpisode={!!nextEpisodePlayback}
              onPlayNext={handlePlayNextEpisode}
            />
          )}

          {/* Filter Modal */}
          {isFilterOpen && (
            <FilterModal
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              onApplyFilters={handleApplyFilters}
              categories={filterCategories}
              vjs={allVJs}
              years={filterYears}
              initialFilters={activeFilters}
            />
          )}

          {/* Auth Gated Modal */}
          <AuthGatedModal
            isOpen={isAuthGatedModalOpen}
            onClose={() => setIsAuthGatedModalOpen(false)}
            onAuthClick={() => {
              setIsAuthGatedModalOpen(false);
              setTimeout(() => {
                navigateTo("/auth");
              }, 50);
            }}
            actionType={gatedAction}
            title={selectedMovie?.title}
          />

          {/* Stayed Too Long Alert */}
          <StayedAlertModal
            isOpen={isStayedAlertOpen}
            onClose={() => setIsStayedAlertOpen(false)}
            onAuthClick={() => {
              setIsStayedAlertOpen(false);
              navigateTo("/auth");
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
