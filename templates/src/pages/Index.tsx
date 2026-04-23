import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, startTransition } from "react";
import { useSearchParams, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { CategoryChips } from "@/components/CategoryChips";
import { VJChips } from "@/components/VJChips";
import { MovieRow } from "@/components/MovieRow";
import { MovieGrid } from "@/components/MovieGrid";
import { FilterState } from "@/components/FilterModal";
import { PageTransition, SectionReveal } from "@/components/PageTransition";

const loadHeroCarousel = () => import("@/components/HeroCarousel").then(module => ({ default: module.HeroCarousel }));
const loadCinematicVideoPlayer = () => import("@/components/CinematicVideoPlayer").then(module => ({ default: module.CinematicVideoPlayer }));
const HeroCarousel = lazy(loadHeroCarousel);
const ContinueWatchingRow = lazy(() => import("@/components/ContinueWatchingRow").then(module => ({ default: module.ContinueWatchingRow })));
const RecommendationRow = lazy(() => import("@/components/RecommendationRow").then(module => ({ default: module.RecommendationRow })));
const Top10Row = lazy(() => import("@/components/Top10Row").then(module => ({ default: module.Top10Row })));
const SearchBar = lazy(() => import("@/components/SearchBar").then(module => ({ default: module.SearchBar })));
const MovieModal = lazy(() => import("@/components/MovieModal").then(module => ({ default: module.MovieModal })));
const CinematicVideoPlayer = lazy(loadCinematicVideoPlayer);
const FilterModal = lazy(() => import("@/components/FilterModal").then(module => ({ default: module.FilterModal })));
const AmbientParticles = lazy(() => import("@/components/AmbientParticles").then(module => ({ default: module.AmbientParticles })));
import { DynamicBackground } from "@/components/DynamicBackground";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";
import { useSiteSettingsContext } from "@/hooks/useSiteSettings";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { Button } from "@/components/ui/button";
import {
  fetchTrending,
  fetchRecent,
  fetchSeries,
  searchMovies,
  fetchMovieDetails,
  fetchSeriesDetails,
  getCachedSeriesDetails,
  hasPendingSeriesDetailsRequest,
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
  primeMediaAvailability
} from "@/lib/api";
import type { FilterOptions } from "@/lib/api";
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
  romance: "Romance",
  animation: "Animation",
  horror: "Horror",
  special: "Special",
  drama: "Drama",
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

function buildPrimaryPlaybackUrl(item: Movie | Series): string | null {
  if (item.type === "movie") {
    const targetUrl = item.download_url || item.server2_url;
    if (targetUrl) {
      return buildMediaUrl({
        url: targetUrl,
        title: item.title,
        detailsUrl: item.video_page_url || item.details_url,
        mobifliksId: item.mobifliks_id,
        play: true,
      });
    }
  }

  const firstEpisode = (item as Series).episodes?.find((episode) => episode.download_url || episode.server2_url);
  const targetUrl = firstEpisode?.download_url || firstEpisode?.server2_url;
  if (!targetUrl) {
    return null;
  }

  const seasonNumber = firstEpisode.season_number || 1;
  return buildMediaUrl({
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
  const originalsInitialLimit = deviceProfile.isMobile ? 24 : 36;
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showDeferredHomeSections, setShowDeferredHomeSections] = useState(false);
  const [showAmbientEffects, setShowAmbientEffects] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    category: null,
    vj: null,
    year: null,
    contentType: "movies",
  });
  const [nextPage, setNextPage] = useState(2);
  const [allVJs, setAllVJs] = useState<{ id: string; label: string }[]>([]);

  const filterCategories = useMemo(() => [
    { id: "trending", label: "Trending" },
    ...Object.entries(CATEGORY_TO_GENRE).map(([id, label]) => ({ id, label }))
  ], []);

  const filterYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 25 }, (_, i) => currentYear - i);
  }, []);

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const revealDeferredUi = () => {
      startTransition(() => {
        setShowAmbientEffects(true);
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
  const { data: trendingData, isLoading: isTrendingLoading } = useQuery({
    queryKey: ["trending"],
    queryFn: () => fetchTrending(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const { data: moviesQueryData, isLoading: isMoviesLoading } = useQuery({
    queryKey: ["movies", "recent", 1, homeFeedLimit],
    queryFn: () => fetchMoviesSorted("movie", homeFeedLimit, 1),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "movies" || viewMode === "home",
  });

  const { data: seriesQueryData, isLoading: isSeriesLoading } = useQuery({
    queryKey: ["series", "recent", 1, homeFeedLimit],
    queryFn: () => fetchSeries(homeFeedLimit, 1),
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
  const isHeroLoading = shouldShowHero && trending.length === 0 && (isTrendingLoading || isMoviesLoading || isSeriesLoading);

  useEffect(() => {
    if (!shouldShowHero || viewMode !== "home") return;
    void loadHeroCarousel();
  }, [shouldShowHero, viewMode]);

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

  useEffect(() => {
    if (continueWatching.length === 0) return;

    scheduleLowPriorityTask(() => {
      continueWatching.slice(0, 1).forEach((item) => {
        const mediaUrl = buildMediaUrl({
          url: item.url,
          title: item.episodeInfo ? `${item.title} - ${item.episodeInfo}` : item.title,
          mobifliksId: item.contentId,
          play: true,
        });
        primeMediaAvailability(mediaUrl);
      });
    });
  }, [continueWatching]);

  // Dynamic SEO per view/modal
  const seoTitleMap: Record<ViewMode, string> = {
    home: "",
    movies: "Browse Uganda Translated Movies",
    series: "Browse Translated Series",
    search: searchQuery ? `Search: ${searchQuery}` : "Search VJ Translated Movies",
    originals: "Originals",
  };
  const seoTitle = selectedMovie && isModalOpen
    ? `${selectedMovie.title}${selectedMovie.year ? ` (${selectedMovie.year})` : ""} - Translated by VJ`
    : seoTitleMap[viewMode] || "";
  const seoDescription = selectedMovie && isModalOpen
    ? selectedMovie.description || `Watch ${selectedMovie.title} translated to Luganda by top VJs on Moviebay Uganda`
    : undefined;

  useDocumentSEO({
    title: selectedMovie?.title || seoTitle || undefined,
    vjName: selectedMovie?.vj_name,
    year: selectedMovie?.year,
    description: seoDescription,
    imageUrl: selectedMovie?.backdrop_url || selectedMovie?.image_url || undefined,
    genres: selectedMovie?.genres,
    canonicalPath: selectedMovie && isModalOpen 
      ? `/${selectedMovie.type === 'series' ? 'series' : 'movie'}/${selectedMovie.mobifliks_id}`
      : `/${viewMode === "home" ? "" : viewMode}`,
    jsonLd: selectedMovie && isModalOpen ? buildMovieJsonLd(selectedMovie) : undefined,
  });


  const sortByYearDesc = useCallback((items: Movie[]) => {
    return [...items].sort((a, b) => {
      // Primary: release_date (YYYY-MM-DD string comparison)
      const dateA = a.release_date || "";
      const dateB = b.release_date || "";
      if (dateA && dateB) {
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
      }
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;

      // Secondary: year
      const yearA = a.year || 0;
      const yearB = b.year || 0;
      if (yearA !== yearB) return yearB - yearA;

      // Tertiary: created_at (if available in types)
      return 0;
    });
  }, []);

  const preloadHeroAssets = useCallback((items: Movie[]) => {
    for (const [index, item] of items.slice(0, 3).entries()) {
      if (item.backdrop_url) {
        preloadImage(getOptimizedBackdropUrl(item.backdrop_url)).catch(() => { });
      }
      if (item.image_url && index < 2) {
        preloadImage(getImageUrl(item.image_url)).catch(() => { });
      }
    }
  }, []);

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
      // Sync React Query data to local state for components expecting state
      if (trendingData || moviesQueryData) {
        const tData = trendingData || [];
        const mData = moviesQueryData || [];

        const baseForTrending = tData.length > 0 ? tData : mData;
        const sortedTrending = sortByYearDesc(baseForTrending);

        // Hero carousel: keep above-the-fold work small.
        const heroMovies = sortedTrending.filter((m: Movie) => m.type === 'movie').slice(0, heroMovieLimit);
        const heroSeries = (seriesQueryData && seriesQueryData.length > 0)
          ? seriesQueryData.slice(0, heroSeriesLimit)
          : sortedTrending.filter((m: Movie) => m.type === 'series').slice(0, heroSeriesLimit);

        const newTrending = [...heroMovies, ...heroSeries].slice(0, heroMovieLimit + heroSeriesLimit);
        preloadHeroAssets(newTrending);
        startTransition(() => {
          setTrending(newTrending);
          setRecentMovies(sortedTrending.length > 0 ? sortedTrending : sortByYearDesc(mData));

          if (seriesQueryData) {
            setRecentSeries(sortByYearDesc(seriesQueryData));
          }
        });

        if (newTrending.length > 0) {
          preloadMovieBackdrop(newTrending[0]);
        }
      }

      const allAvailable = [
        ...(trendingData || []),
        ...(moviesQueryData || []),
        ...(seriesQueryData || []),
      ];

      const vjSet = new Set<string>();
      ["Junior", "Jingo", "Ice P", "Emmy", "Kevo"].forEach(vj => vjSet.add(vj));
      allAvailable.forEach((movie: Movie) => {
        if (movie.vj_name && movie.vj_name.trim()) {
          vjSet.add(movie.vj_name.trim());
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
  }, [heroMovieLimit, heroSeriesLimit, moviesQueryData, preloadHeroAssets, seriesQueryData, sortByYearDesc, trendingData]);

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

    return () => {
      cancelled = true;
    };
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
    if (viewMode === "movies" && moviesQueryData) {
      setCategoryMovies(sortByYearDesc(moviesQueryData));
      setIsLoading(false);
    } else if (viewMode === "series" && seriesQueryData) {
      setCategoryMovies(sortByYearDesc(seriesQueryData));
      setIsLoading(false);
    } else if (viewMode === "originals" && originalsQueryData) {
      setCategoryMovies(sortByYearDesc(originalsQueryData));
      setOriginalsPage(1);
      setIsLoading(false);
    } else if ((viewMode === "movies" && isMoviesLoading) ||
      (viewMode === "series" && isSeriesLoading) ||
      (viewMode === "originals" && isOriginalsLoading)) {
      setIsLoading(true);
    }
  }, [viewMode, moviesQueryData, seriesQueryData, originalsQueryData, isMoviesLoading, isSeriesLoading, isOriginalsLoading]);


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

  // Handle movie click - prefer cached/prefetched series details before opening
  const handleMovieClick = useCallback(async (movie: Movie) => {
    let resolvedMovie: Movie | Series = movie;
    const needsSeriesDetails = movie.type === "series" && (!("episodes" in movie) || !(movie as Series).episodes?.length);

    if (needsSeriesDetails) {
      const cachedDetails = getCachedSeriesDetails(movie.mobifliks_id);
      if (cachedDetails?.episodes?.length) {
        resolvedMovie = cachedDetails;
      }

      try {
        if (resolvedMovie === movie) {
          const fastDetails = await Promise.race<Series | null>([
            fetchSeriesDetails(movie.mobifliks_id),
            new Promise<null>((resolve) =>
              window.setTimeout(
                () => resolve(null),
                hasPendingSeriesDetailsRequest(movie.mobifliks_id) ? 260 : 180
              )
            ),
          ]);

          if (fastDetails?.episodes?.length) {
            resolvedMovie = fastDetails;
          }
        }
      } catch (error) {
        console.error("Error getting fast series details:", error);
      }
    }

    setSelectedMovie(resolvedMovie);
    setSelectedMovieDetailsLoading(
      resolvedMovie.type === "series" && (!("episodes" in resolvedMovie) || !(resolvedMovie as Series).episodes?.length)
    );
    setIsModalOpen(true);

    // Push shareable URL with SEO-friendly slug
    const typeSlug = movie.type === "series" ? "series" : "movie";
    const urlSlug = toSlug(movie.title, movie.mobifliks_id, movie.year);
    requestAnimationFrame(() => {
      navigateTo(`/${typeSlug}/${urlSlug}`, {
        replace: false,
        state: { backgroundView: viewMode }
      });
    });

    scheduleLowPriorityTask(() => addToRecent(resolvedMovie));

    // Fetch full details in background (for episodes, cast, etc.)
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
    
    // Synchronize URL: revert to base view if we're on a movie/series route
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
    
    // Synchronize URL: revert to base view if we're on a movie/series route
    if (location.pathname.startsWith("/movie/") || location.pathname.startsWith("/series/")) {
      const targetPath = viewMode === "home" ? "/" : `/${viewMode}`;
      navigateTo(targetPath, { replace: true });
    }
  }, [location.pathname, navigateTo, viewMode]);

  selectedMovieRef.current = selectedMovie;

  const handlePlayVideo = useCallback((url: string, title: string, startAt = 0, playbackItem?: ContinueWatching) => {
    const proxiedUrl = buildMediaUrl({ url, title, play: true });
    const cachedMedia = getCachedMediaAvailability(proxiedUrl);
    const playbackUrl = cachedMedia?.resolved_url || proxiedUrl;

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
        image: movie.image_url || "",
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

  // React Router now handles history for movies/series/search/originals views

  // Handle play from hero
  const handleHeroPlay = useCallback((movie: Movie) => {
    const targetUrl = movie.download_url || movie.server2_url;
    if (targetUrl) {
      const mediaUrl = buildMediaUrl({
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
        image: movie.image_url || "",
        type: movie.type,
        progress: 0,
        duration: 0,
        url: mediaUrl,
      };
      handlePlayVideo(mediaUrl, movie.title, 0, item);
    } else {
      handleMovieClick(movie);
    }
  }, [handlePlayVideo, handleMovieClick]);

  const videoUrlRef = useRef(videoUrl);
  videoUrlRef.current = videoUrl;
  activePlaybackItemRef.current = activePlaybackItem;

  const handleVideoTimeUpdate = useCallback((currentTime: number, duration: number) => {
    const item = activePlaybackItemRef.current;
    if (duration > 0 && item) {
      updateContinueWatching({
        ...item,
        progress: currentTime,
        duration,
        url: videoUrlRef.current,
      });
    }
  }, []);

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

      if (tab === "home") {
        setSearchQuery("");
      }
    });
  }, [navigateTo]);

  // Handle category change
  const handleCategoryChange = useCallback(async (category: string, vjOverride?: string | null) => {
    setActiveCategory(category);
    if (vjOverride === undefined) setActiveVJ(null);
    setIsLoading(true);
    const vj = vjOverride === undefined ? null : vjOverride;
    const dbFilters: FilterOptions = { vj };
    try {
      if (category === "trending") {
        const data = await fetchTrending(dbFilters);
        startTransition(() => {
          setRecentMovies(sortByYearDesc(data));
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
  }, []);

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
            const genre = CATEGORY_TO_GENRE[filters.category] || filters.category;
            data = await fetchByGenre(genre, "movie", 100, dbFilters);
          } else {
            data = await fetchMoviesSorted("movie", 100, 1, dbFilters);
          }
        } else {
          if (filters.category && filters.category !== "trending") {
            const genre = CATEGORY_TO_GENRE[filters.category] || filters.category;
            data = await fetchByGenre(genre, "series", 100, dbFilters);
          } else {
            data = await fetchSeries(100, 1, undefined, dbFilters);
          }
        }

        startTransition(() => {
          setCategoryMovies(sortByYearDesc(data));
          setActiveVJ(filters.vj);
          setActiveFilters(filters);
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        let data: Movie[] = [];

        if (filters.category && filters.category !== "trending") {
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
          setRecentMovies(sortByYearDesc(data));
        });
      }
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sortByYearDesc]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    const dbFilters: FilterOptions = { vj: activeFilters.vj, year: activeFilters.year };
    try {
      const currentCount = categoryMovies.length;
      const nextPage = Math.floor(currentCount / 20) + 1;

      let more: Movie[] = [];
      if (viewMode === "movies") {
        if (activeFilters.category && activeFilters.category !== "trending") {
          const genre = CATEGORY_TO_GENRE[activeFilters.category] || activeFilters.category;
          more = await fetchByGenre(genre, "movie", 20, dbFilters, nextPage);
        } else {
          more = await fetchMoviesSorted("movie", 20, nextPage, dbFilters);
        }
      } else if (viewMode === "series") {
        if (activeFilters.category && activeFilters.category !== "trending") {
          const genre = CATEGORY_TO_GENRE[activeFilters.category] || activeFilters.category;
          more = await fetchByGenre(genre, "series", 20, dbFilters, nextPage);
        } else {
          more = await fetchSeries(20, nextPage, undefined, dbFilters);
        }
      } else if (viewMode === "originals") {
        const nextOriginalsPage = originalsPage + 1;
        const originals = await fetchOriginals(60, nextOriginalsPage);
        more = sortByYearDesc(originals);
        setOriginalsPage(nextOriginalsPage);
      }

      const existingIds = new Set(categoryMovies.map(m => m.mobifliks_id));
      const newMovies = more.filter(m => !existingIds.has(m.mobifliks_id));
      startTransition(() => {
        setCategoryMovies(prev => sortByYearDesc([...prev, ...newMovies]));
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [categoryMovies, viewMode, isLoadingMore, originalsPage, sortByYearDesc, activeFilters]);

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
    <div className="min-h-screen pb-safe relative">
      {showAmbientEffects && (
        <Suspense fallback={null}>
          <AmbientParticles />
        </Suspense>
      )}

      {/* Premium Dynamic Mesh Background */}
      <DynamicBackground />

      {/* Site Announcement */}
      <div className="relative z-10">
        <AnnouncementBanner />

        {/* Header */}
        <Header
          onSearch={handleSearch}
          onMovieSelect={handleMovieClick}
          popularSearches={popularSearches}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-4">
          {/* Home View */}
          {viewMode === "home" && (
            <PageTransition>
              {shouldShowHero && (
                trending.length > 0 ? (
                  <Suspense fallback={null}>
                    <HeroCarousel
                      movies={trending}
                      onPlay={handleHeroPlay}
                      onMovieClick={handleMovieClick}
                      title="Top Movies"
                      onViewAll={() => handleTabChange("movies")}
                    />
                  </Suspense>
                ) : isHeroLoading ? (
                  null
                ) : null
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
                        onResume={(item) => {
                          const resumeTitle = item.episodeInfo
                            ? `${item.title} - ${item.episodeInfo}`
                            : item.title;
                          const mediaUrl = buildMediaUrl({
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
                  {siteSettings.top10_enabled && (
                    <div className="mt-4">
                      <div className="section-divider mb-2" />
                      <Top10Row
                        movies={recentMovies}
                        onMovieClick={handleMovieClick}
                      />
                    </div>
                  )}

                  {continueWatching.length > 0 && recentMovies.length > 0 && (
                    <div className="mt-4">
                      <div className="section-divider mb-2" />
                      <RecommendationRow
                        continueWatching={continueWatching}
                        allMovies={[...recentMovies, ...recentSeries]}
                        onMovieClick={handleMovieClick}
                      />
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="section-divider mb-2" />
                    <MovieRow
                      title="Popular Series"
                      movies={recentSeries}
                      onMovieClick={handleMovieClick}
                      onViewAll={() => handleTabChange("series")}
                      isLoading={isLoading && recentSeries.length === 0}
                    />
                  </div>
                </Suspense>
              )}
            </PageTransition>
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

        {showExitToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur border border-border/50 text-sm text-foreground shadow-lg">
            Press back again to exit
          </div>
        )}

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
              subtitles={activePlayerSubtitles.length > 0 ? activePlayerSubtitles : [
                { id: "en", label: "English", language: "en", url: "" },
                { id: "lug", label: "Luganda", language: "lug", url: "" },
              ]}
              skipSegments={activePlayerSkipSegments.length > 0 ? activePlayerSkipSegments : [
                { label: "Intro", startTime: 2, endTime: 12 },
                { label: "Recap", startTime: 60, endTime: 90 },
              ]}
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
        </Suspense>
      </div>
    </div>
  );
}
