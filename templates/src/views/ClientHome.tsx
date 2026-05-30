"use client";
import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, startTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { useSearchParams, useLocation, useNavigate, useParams, Link } from "@/lib/router-polyfill";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { CategoryChips } from "@/components/CategoryChips";
import { VJChips } from "@/components/VJChips";
import { HeroCarousel } from "@/components/HeroCarousel";
import { MovieRow } from "@/components/MovieRow";
import { LandscapeMovieRow } from "@/components/LandscapeMovieRow";
import { MovieGrid } from "@/components/MovieGrid";
import { FilterState } from "@/components/FilterModal";
import { PageTransition, SectionReveal } from "@/components/PageTransition";
import { DeferredSection } from "@/components/DeferredSection";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";

// Helper function to retry lazy loading chunks in case of network errors or outdated hashes
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      (typeof window !== "undefined" ? window.sessionStorage : { getItem: ()=>null, setItem: ()=>{}, removeItem: ()=>{} }).getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      (typeof window !== "undefined" ? window.sessionStorage : { getItem: ()=>null, setItem: ()=>{}, removeItem: ()=>{} }).setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume that the error is due to an outdated chunk hash or temporary network issue
        (typeof window !== "undefined" ? window.sessionStorage : { getItem: ()=>null, setItem: ()=>{}, removeItem: ()=>{} }).setItem('page-has-been-force-refreshed', 'true');
        
        // Force bypass CDN and browser cache by appending a timestamp to the URL
        const currentUrl = new URL((typeof window !== "undefined" ? window.location : { origin: "", pathname: "", search: "", href: "" }).href);
        currentUrl.searchParams.set('v', new Date().getTime().toString());
        (typeof window !== "undefined" ? window.location : { origin: "", pathname: "", search: "", href: "" }).href = currentUrl.toString();
        
        // Return a promise that never resolves while the page is reloading
        return new Promise(() => {});
      }
      throw error;
    }
  });

const loadCinematicVideoPlayer = () => import("@/components/CinematicVideoPlayer").then(module => ({ default: module.CinematicVideoPlayer }));
const loadMovieModal = () => import("@/components/MovieModal").then(module => ({ default: module.MovieModal }));
const MovieModal = lazyWithRetry(loadMovieModal);
const CinematicVideoPlayer = lazyWithRetry(loadCinematicVideoPlayer);
const FilterModal = lazyWithRetry(() => import("@/components/FilterModal").then(module => ({ default: module.FilterModal })));

import { ContinueWatchingRow } from "@/components/ContinueWatchingRow";
import { RecommendationRow } from "@/components/RecommendationRow";
import { Top10Row } from "@/components/Top10Row";
import { SearchBar } from "@/components/SearchBar";
import { MovieCard, MovieCardSkeleton } from "@/components/MovieCard";
import { BlurImage } from "@/components/BlurImage";
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
  fetchCuratedMovies,
  fetchOriginals,
  fetchMoviesSorted,
  fetchHomeFeed,
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
import { addToRecent, addRecentSearch, updateContinueWatching, removeContinueWatching, getRecentSearches, removeRecentSearch, clearRecentSearches } from "@/lib/storage";
import type { Movie, Series, ContinueWatching, SkipSegment, SubtitleTrack } from "@/types/movie";
import { 
  ChevronLeft, Loader2, Play, Search, X, 
  Flame, Compass, ShieldAlert, Heart, Sparkles, 
  Skull, Tv, Atom, Zap, TrendingUp, Clock 
} from "lucide-react";

const genreBentoCards = [
  { id: "action", label: "Action", icon: Flame, gradient: "from-red-600/20 to-red-950/30 border-red-500/20 text-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]" },
  { id: "adventure", label: "Adventure", icon: Compass, gradient: "from-blue-600/20 to-blue-950/30 border-blue-500/20 text-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]" },
  { id: "crime", label: "Crime", icon: ShieldAlert, gradient: "from-indigo-600/20 to-indigo-950/30 border-indigo-500/20 text-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]" },
  { id: "romance", label: "Romance", icon: Heart, gradient: "from-pink-600/20 to-pink-950/30 border-pink-500/20 text-pink-400 hover:shadow-[0_0_20px_rgba(236,72,153,0.15)]" },
  { id: "animation", label: "Animation", icon: Sparkles, gradient: "from-amber-500/20 to-amber-950/30 border-amber-500/20 text-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]" },
  { id: "horror", label: "Horror", icon: Skull, gradient: "from-purple-600/20 to-purple-950/30 border-purple-500/20 text-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]" },
  { id: "drama", label: "Drama", icon: Tv, gradient: "from-orange-600/20 to-orange-950/30 border-orange-500/20 text-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]" },
  { id: "fantasy", label: "Fantasy", icon: Sparkles, gradient: "from-emerald-600/20 to-emerald-950/30 border-emerald-500/20 text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]" },
  { id: "sci-fi", label: "Sci-Fi", icon: Atom, gradient: "from-cyan-600/20 to-cyan-950/30 border-cyan-500/20 text-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]" },
  { id: "thriller", label: "Thriller", icon: Zap, gradient: "from-fuchsia-600/20 to-fuchsia-950/30 border-fuchsia-500/20 text-fuchsia-400 hover:shadow-[0_0_20px_rgba(217,70,239,0.15)]" },
];
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

const CURATED_CATEGORIES = new Set([
  "popular-su-in",
  "action-movies",
  "scifi-movies",
  "crime-thrillers",
  "action-series",
  "revenge-stories",
  "spy-thrillers",
  "psychological-thrillers",
  "scifi-series",
  "space-adventures",
  "time-travel",
  "dystopian-worlds",
  "cyberpunk",
  "romantic-movies",
  "romantic-series",
  "erotic-thrillers",
  "korean-dramas",
  "teen-romance",
  "teen-drama",
  "historical-drama",
  "war-series",
  "war-movies",
  "detective-stories",
  "survival-horror",
  "horror-series",
  "horror-movies"
]);

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

export default function WrappedClientHome() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ClientHome />
    </Suspense>
  );
}

function ClientHome() {
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const viewMode: ViewMode = (mounted && isMovieRoute && locationState?.backgroundView)
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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const [searchInputValue, setSearchInputValue] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "series">("all");
  const [sortFilter, setSortFilter] = useState<"popular" | "rating" | "newest">("popular");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceSearchRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleRemoveRecentSearch = useCallback((term: string) => {
    removeRecentSearch(term);
    setRecentSearches(getRecentSearches());
  }, []);

  const handleClearRecentSearches = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [isVideoMkv, setIsVideoMkv] = useState(false);
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
  const [showDeferredHomeSections, setShowDeferredHomeSections] = useState(true);
  const [enabledQueries, setEnabledQueries] = useState<Record<string, boolean>>({});
  const enableQuery = useCallback((key: string) => {
    setEnabledQueries((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);
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

  // ── Consolidated home feed — 1 request instead of 4 ─────────────────────
  // fetchHomeFeed hits /api/home-feed which runs all 4 queries in Promise.all
  // server-side and returns a single JSON payload with 5-minute edge caching.
  const { data: homeFeedData, isLoading: isHomeFeedLoading } = useQuery({
    queryKey: ["home-feed", heroMovieLimit, browseBatchLimit],
    queryFn: () =>
      fetchHomeFeed({
        heroLimit:   heroMovieLimit,
        moviesLimit: browseBatchLimit,
        seriesLimit: browseBatchLimit,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes — matches server-side edge cache TTL
    enabled: viewMode === "home" || viewMode === "movies" || viewMode === "series",
  });

  // Spread the consolidated feed into the existing named variables
  // so zero other code needs to change downstream.
  const heroData        = homeFeedData?.hero;
  const isHeroLoading   = isHomeFeedLoading && !homeFeedData?.hero;
  const trendingData    = homeFeedData?.trending;
  const moviesQueryData = homeFeedData?.movies;
  const isMoviesLoading = isHomeFeedLoading && !homeFeedData?.movies;
  const seriesQueryData = homeFeedData?.series;
  const isSeriesLoading = isHomeFeedLoading && !homeFeedData?.series;

  // Originals remain a separate query (only loaded when on /originals tab)
  const { data: originalsQueryData, isLoading: isOriginalsLoading } = useQuery({
    queryKey: ["movies", "originals", 1, originalsInitialLimit],
    queryFn: () => fetchOriginals(originalsInitialLimit, 1),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "originals",
  });

  const { data: suInMoviesData } = useQuery({
    queryKey: ["movies", "curated", "popular-su-in"],
    queryFn: () => fetchCuratedMovies("popular-su-in", 15),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home" && Boolean(enabledQueries["popular-su-in"]),
  });

  const { data: actionMoviesData } = useQuery({
    queryKey: ["movies", "curated", "action-movies"],
    queryFn: () => fetchCuratedMovies("action-movies", 15),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home" && Boolean(enabledQueries["action-movies"]),
  });

  const { data: scifiMoviesData } = useQuery({
    queryKey: ["movies", "curated", "scifi-movies"],
    queryFn: () => fetchCuratedMovies("scifi-movies", 15),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home" && Boolean(enabledQueries["scifi-movies"]),
  });

  const { data: crimeThrillersData } = useQuery({
    queryKey: ["movies", "curated", "crime-thrillers"],
    queryFn: () => fetchCuratedMovies("crime-thrillers", 15),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home" && Boolean(enabledQueries["crime-thrillers"]),
  });

  const { data: cyberpunkData } = useQuery({
    queryKey: ["movies", "curated", "cyberpunk"],
    queryFn: () => fetchCuratedMovies("cyberpunk", 15),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home" && Boolean(enabledQueries["cyberpunk"]),
  });

  const { data: romanceData } = useQuery({
    queryKey: ["movies", "curated", "romantic-movies"],
    queryFn: () => fetchCuratedMovies("romantic-movies", 15),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home" && Boolean(enabledQueries["romantic-movies"]),
  });

  const { data: horrorData } = useQuery({
    queryKey: ["movies", "curated", "horror-movies"],
    queryFn: () => fetchCuratedMovies("horror-movies", 15),
    staleTime: 1000 * 60 * 10,
    enabled: viewMode === "home" && Boolean(enabledQueries["horror-movies"]),
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

    let active = true;
    const prime = async () => {
      const mediaUrl = await buildPrimaryPlaybackUrl(selectedMovie);
      if (!mediaUrl || !active) return;
      scheduleLowPriorityTask(() => {
        primeMediaAvailability(mediaUrl);
      });
    };
    void prime();

    return () => {
      active = false;
    };
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

  const homeJsonLd = useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Moviebay",
      "url": "https://s-u.in",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://s-u.in/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    };
  }, []);

  useDocumentSEO({
    title: selectedMovie?.title || seoTitle || undefined,
    vjName: selectedMovie?.vj_name,
    year: selectedMovie?.year,
    description: seoDescription,
    imageUrl: selectedMovie?.image_url || selectedMovie?.backdrop_url || undefined,
    genres: selectedMovie?.genres,
    canonicalPath: selectedMovie && isModalOpen 
      ? `/${selectedMovie.type === 'series' ? 'series' : 'movie'}/${toSlug(selectedMovie.title, selectedMovie.id, selectedMovie.year)}`
      : `/${viewMode === "home" ? "" : viewMode}`,
    jsonLd: selectedMovie && isModalOpen ? buildMovieJsonLd(selectedMovie) : homeJsonLd,
  });


  const sortByYearDesc = useCallback((items: Movie[]) => {
    const sorted = [...items].sort((a, b) => {
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

    const junior: Movie[] = [];
    const others: Movie[] = [];
    sorted.forEach((item) => {
      const isJunior =
        item.vj_name?.toLowerCase().includes("junior") ||
        item.vj_name?.toLowerCase().replace(/\s+/g, "") === "vjjunior";
      if (isJunior) {
        junior.push(item);
      } else {
        others.push(item);
      }
    });
    return [...junior, ...others];
  }, []);

  const sortByLatestAdded = useCallback((items: Movie[]) => {
    const sorted = [...items].sort((a, b) => {
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

    const junior: Movie[] = [];
    const others: Movie[] = [];
    sorted.forEach((item) => {
      const isJunior =
        item.vj_name?.toLowerCase().includes("junior") ||
        item.vj_name?.toLowerCase().replace(/\s+/g, "") === "vjjunior";
      if (isJunior) {
        junior.push(item);
      } else {
        others.push(item);
      }
    });
    return [...junior, ...others];
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


  const handleSearch = useCallback(async (query: string, skipNavigate = false) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setSearchInputValue(query);
    if (!skipNavigate) {
      navigateTo(`/search?q=${encodeURIComponent(query)}`, { shallow: true });
    } else {
      navigateTo(`/search?q=${encodeURIComponent(query)}`, { replace: true, shallow: true });
    }
    setCurrentPage(1);
    setIsLoading(true);
    addRecentSearch(query);
    setRecentSearches(getRecentSearches());

    try {
      const results = await searchMovies(query, 1, 50);
      setSearchResults(results.results);
      setTotalResults(results.total_results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [navigateTo]);

  const handleSearchInputChange = (val: string) => {
    setSearchInputValue(val);
    
    if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current);
    
    if (!val.trim()) {
      setSearchQuery("");
      setSearchResults([]);
      setTotalResults(0);
      return;
    }

    debounceSearchRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchMovies(val, 1, 50);
        setSearchResults(results.results);
        setTotalResults(results.total_results);
        setSearchQuery(val);
      } catch (error) {
        console.error("Dynamic search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current);
      handleSearch(searchInputValue, true);
    }
  };

  const defaultRecommendedMovies = useMemo(() => {
    return [...recentMovies, ...recentSeries].slice(0, 15);
  }, [recentMovies, recentSeries]);

  const filteredAndSortedResults = useMemo(() => {
    const baseList = searchInputValue.trim() ? searchResults : defaultRecommendedMovies;
    
    // 1. Apply Media Type Filter
    let filtered = baseList;
    if (typeFilter === "movie") {
      filtered = baseList.filter(m => m.type === "movie" || m.type === undefined);
    } else if (typeFilter === "series") {
      filtered = baseList.filter(m => m.type === "series");
    }
    
    // 2. Apply Sorting
    return [...filtered].sort((a, b) => {
      if (sortFilter === "popular") {
        return (b.views ?? 0) - (a.views ?? 0);
      } else if (sortFilter === "rating") {
        const rA = (a as any).vote_average ?? (a as any).rating ?? 0;
        const rB = (b as any).vote_average ?? (b as any).rating ?? 0;
        return rB - rA;
      } else if (sortFilter === "newest") {
        const yA = parseInt(a.year?.toString() || "0");
        const yB = parseInt(b.year?.toString() || "0");
        return yB - yA;
      }
      return 0;
    });
  }, [searchResults, defaultRecommendedMovies, searchInputValue, typeFilter, sortFilter]);

  useEffect(() => {
    return () => {
      if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current);
    };
  }, []);

  // Synchronize URL query parameter 'q' with search state
  useEffect(() => {
    if (viewMode === "search") {
      const q = searchParams.get("q") || "";
      if (q !== searchQuery) {
        if (q) {
          void handleSearch(q, true);
        } else {
          setSearchQuery("");
          setSearchInputValue("");
          setSearchResults([]);
        }
      }
    }
  }, [viewMode, searchParams, searchQuery, handleSearch]);

  const handleMovieClick = useCallback(async (movie: Movie) => {
    let resolvedMovie: Movie | Series = movie;
    const needsSeriesDetails = movie.type === "series" && (!("episodes" in movie) || !(movie as Series).episodes?.length);

    if (needsSeriesDetails) {
      const cachedDetails = getCachedSeriesDetails(movie.mobifliks_id);
      if (cachedDetails?.episodes?.length) {
        resolvedMovie = cachedDetails;
      }
    }

    startTransition(() => {
      setSelectedMovie(resolvedMovie);
      setSelectedMovieDetailsLoading(
        resolvedMovie.type === "series" && (!("episodes" in resolvedMovie) || !(resolvedMovie as Series).episodes?.length)
      );
      setIsModalOpen(true);
    });

    const typeSlug = movie.type === "series" ? "series" : "movie";
    const urlSlug = toSlug(movie.title, movie.id, movie.year);
    // Delay URL change to allow modal animation to complete smoothly.
    // Changing URL instantly triggers mobile browser UI jumps (address bar shift) which glitches the animation.
    setTimeout(() => {
      navigateTo(`/${typeSlug}/${urlSlug}`, {
        replace: false,
        state: { backgroundView: viewMode },
        shallow: true
      });
    }, 400);

    scheduleLowPriorityTask(() => addToRecent(resolvedMovie));

    void (async () => {
      try {
        const details = movie.type === "series"
          ? await fetchSeriesDetails(String(movie.id))
          : await fetchMovieDetails(String(movie.id));

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
      navigateTo(targetPath, { replace: true, shallow: true });
    }
  }, [location.pathname, navigateTo, viewMode]);

  const handleCloseVideo = useCallback(() => {
    setIsVideoOpen(false);
    setActivePlaybackItem(null);
    setActivePlayerMovie(null);
    setActivePlayerSubtitles([]);
    setActivePlayerSkipSegments([]);
    setVideoUrl("");
    setVideoTitle("");
    
    if (location.pathname.startsWith("/movie/") || location.pathname.startsWith("/series/")) {
      const targetPath = viewMode === "home" ? "/" : `/${viewMode}`;
      navigateTo(targetPath, { replace: true, shallow: true });
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
        logoUrl: movie.logo_url,
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
    startTransition(() => {
      const isMkv = (url || "").toLowerCase().includes(".mkv") || (url || "").toLowerCase().includes(".avi");
      setIsVideoMkv(isMkv);
      setVideoUrl(playbackUrl);
      setVideoTitle(title);
      setVideoStartTime(startAt);
      setActivePlaybackItem(playbackItem ?? fallbackItem);
      setActivePlayerMovie(playbackMovie);
      setActivePlayerSubtitles(playbackSubtitles);
      setActivePlayerSkipSegments(playbackSkipSegments);
      setIsVideoOpen(true);
      setIsModalOpen(false);
    });
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
        // Proactively find and cleanly tear down the video element in the DOM or global registry before unmounting
        const globalVideo = typeof window !== "undefined" ? (window as any).__activeVideoElement : null;
        const video = document.querySelector("video") || globalVideo;
        if (video) {
          try {
            console.log("[ClientHome PopState] Tearing down active media stream connection...");
            video.pause();
            video.src = "";
            video.removeAttribute("src");
            while (video.firstChild) {
              video.removeChild(video.firstChild);
            }
            video.load();
            if (typeof window !== "undefined") {
              (window as any).__activeVideoElement = null;
            }
          } catch (e) {
            console.warn("[ClientHome PopState] Video stream cleanup failed:", e);
          }
        }
        handleCloseVideo();
        return;
      }
      if (isModalOpen) {
        setIsModalOpen(false);
        if (window.location.pathname.startsWith("/movie/") || window.location.pathname.startsWith("/series/")) {
          const targetPath = viewMode === "home" ? "/" : `/${viewMode}`;
          navigateTo(targetPath, { replace: true, shallow: true });
        }
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
  }, [isModalOpen, isVideoOpen, viewMode, handleCloseVideo]);

  const handleHeroPlay = useCallback(async (movie: Movie) => {
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
  }, [handlePlayVideo, handleMovieClick]);

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

  const handleVideoTimeUpdate = useCallback((currentTime: number, duration: number, force = false) => {
    const item = activePlaybackItemRef.current;
    if (duration > 0 && item) {
      const now = Date.now();
      if (!force && now - lastContinueWatchingWriteRef.current < 5000) return;
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
  const currentLogo = isDark ? logoDark.src : logoLight.src;

  const handleTabChange = useCallback((tab: string, categoryOverride?: string | null) => {
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
      const targetCategory = categoryOverride !== undefined ? categoryOverride : "trending";
      setActiveFilters({ category: targetCategory === "trending" ? null : targetCategory, vj: null, year: null, contentType: tab === "movies" ? "movies" : tab === "series" ? "series" : null });
      setActiveVJ(null);
      setActiveCategory(targetCategory || "trending");
      setOriginalsPage(1);
      setNextLoadOffset(0);

      if (tab === "home" || tab === "search") {
        setSearchQuery("");
        setSearchInputValue("");
        setSearchResults([]);
      }

      if (categoryOverride && categoryOverride !== "trending") {
        setIsLoading(true);
        (async () => {
          try {
            let data: Movie[] = [];
            const dbFilters: FilterOptions = { vj: null };
            if (CURATED_CATEGORIES.has(categoryOverride)) {
              data = await fetchCuratedMovies(categoryOverride, 100, dbFilters);
            } else {
              const genre = CATEGORY_TO_GENRE[categoryOverride] || categoryOverride;
              data = await fetchByGenre(genre, tab === "series" ? "series" : "movie", 100, dbFilters);
            }
            startTransition(() => {
              setCategoryMovies(categoryOverride === "new-week" ? sortByLatestAdded(data) : sortByYearDesc(data));
            });
          } catch (e) {
            console.error(e);
          } finally {
            setIsLoading(false);
          }
        })();
      }
    });
  }, [navigateTo, sortByLatestAdded, sortByYearDesc]);

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
      } else if (CURATED_CATEGORIES.has(category)) {
        const data = await fetchCuratedMovies(category, 40, dbFilters);
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
            } else if (CURATED_CATEGORIES.has(filters.category)) {
              data = await fetchCuratedMovies(filters.category, 100, dbFilters);
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
            } else if (CURATED_CATEGORIES.has(filters.category)) {
              data = await fetchCuratedMovies(filters.category, 100, dbFilters);
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
        } else if (filters.category && CURATED_CATEGORIES.has(filters.category)) {
          data = await fetchCuratedMovies(filters.category, 100, dbFilters);
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
        } else if (activeFilters.category && CURATED_CATEGORIES.has(activeFilters.category)) {
          more = await fetchCuratedMovies(activeFilters.category, browseBatchLimit, dbFilters, 1, nextLoadOffset);
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
        } else if (activeFilters.category && CURATED_CATEGORIES.has(activeFilters.category)) {
          more = await fetchCuratedMovies(activeFilters.category, browseBatchLimit, dbFilters, 1, nextLoadOffset);
          setNextLoadOffset((prev) => prev + seriesFetchBatchLimit);
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
      "popular-su-in": "Popular on s-u.in",
      "action-movies": "Action Movies",
      "scifi-movies": "Sci-Fi Movies",
      "crime-thrillers": "Crime Thrillers",
      "action-series": "Action Series",
      "revenge-stories": "Revenge Stories",
      "spy-thrillers": "Spy Thrillers",
      "psychological-thrillers": "Psychological Thrillers",
      "scifi-series": "Sci-Fi Series",
      "space-adventures": "Space Adventures",
      "time-travel": "Time Travel",
      "dystopian-worlds": "Dystopian Worlds",
      "cyberpunk": "Cyberpunk",
      "romantic-movies": "Romantic Movies",
      "romantic-series": "Romantic Series",
      "erotic-thrillers": "Erotic Thrillers",
      "korean-dramas": "Korean Dramas",
      "teen-romance": "Teen Romance",
      "teen-drama": "Teen Drama",
      "historical-drama": "Historical Drama",
      "war-series": "War Series",
      "war-movies": "War Movies",
      "detective-stories": "Detective Stories",
      "survival-horror": "Survival Horror",
      "horror-series": "Horror Series",
      "horror-movies": "Horror Movies",
    };
    if (activeCategory === "trending") return "Latest Added";
    if (activeCategory === "new-week") return "New This Week";
    if (CURATED_CATEGORIES.has(activeCategory)) return titles[activeCategory] || activeCategory;
    return `Trending in ${titles[activeCategory] || "All"}`;
  };


  const {
    displayCategoryMovies,
    displayPopularSeries,
    displaySuInMovies,
    displaySpotlightMovies,
    displayActionMovies,
    displayScifiMovies,
    displayCrimeThrillers,
    displayCyberpunkMovies,
    displayRomanceMovies,
    displayHorrorMovies,
  } = useMemo(() => {
    const getCleanTitleKey = (title: string): string => {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    };

    const filterRowUnique = (items: Movie[] | undefined, limit: number): Movie[] => {
      if (!items) return [];
      const rowSeen = new Set<string>();
      const filtered: Movie[] = [];
      for (const item of items) {
        const titleKey = getCleanTitleKey(item.title);
        if (!rowSeen.has(titleKey)) {
          filtered.push(item);
          rowSeen.add(titleKey);
          if (filtered.length >= limit) break;
        }
      }
      return filtered;
    };

    // 1. Dynamic category row (Latest Added / Active Selection)
    const catDisplay = filterRowUnique(recentMovies, 20);

    // 2. Popular Series
    const seriesDisplay = filterRowUnique(recentSeries, 15);

    // 2b. Popular on s-u.in
    const suInDisplay = filterRowUnique(suInMoviesData, 15);

    // 3. Spotlight Selection
    const spotlightDisplay = filterRowUnique(recentMovies, 12);

    // 4. Curated Rows (fully populated to their limits)
    const actionDisplay = filterRowUnique(actionMoviesData, 15);
    const scifiDisplay = filterRowUnique(scifiMoviesData, 15);
    const crimeDisplay = filterRowUnique(crimeThrillersData, 15);
    const cyberpunkDisplay = filterRowUnique(cyberpunkData, 15);
    const romanceDisplay = filterRowUnique(romanceData, 15);
    const horrorDisplay = filterRowUnique(horrorData, 15);

    return {
      displayCategoryMovies: catDisplay,
      displayPopularSeries: seriesDisplay,
      displaySuInMovies: suInDisplay,
      displaySpotlightMovies: spotlightDisplay,
      displayActionMovies: actionDisplay,
      displayScifiMovies: scifiDisplay,
      displayCrimeThrillers: crimeDisplay,
      displayCyberpunkMovies: cyberpunkDisplay,
      displayRomanceMovies: romanceDisplay,
      displayHorrorMovies: horrorDisplay,
    };
  }, [
    recentMovies,
    recentSeries,
    suInMoviesData,
    actionMoviesData,
    scifiMoviesData,
    crimeThrillersData,
    cyberpunkData,
    romanceData,
    horrorData,
  ]);

  return (
    <div suppressHydrationWarning className="min-h-screen pb-safe relative">
      {/* Premium Dynamic Mesh Background */}
      <DynamicBackground />

      {/* Site Announcement */}
      <div className="relative z-10">

        {/* Header — memo'd at component level, properly bails out on unchanged props */}
        <Header
          onSearch={handleSearch}
          onMovieSelect={handleMovieClick as any}
          popularSearches={popularSearches}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content */}
        <main className={`container mx-auto px-4 ${viewMode === "home" ? "pt-0 pb-4" : "pb-4 pt-[calc(6.5rem_+_env(safe-area-inset-top))] md:pt-28"}`}>
          <AnimatePresence mode="wait">
            {/* Home View */}
            {viewMode === "home" && (
              <PageTransition viewKey="home" className="space-y-0">
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

              {isMounted && siteSettings.continue_watching_enabled && continueWatching.length > 0 && (
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

                          let freshTargetUrl = item.url;
                          let freshMobifliksId = item.contentId;
                          let detailedMovie: any = null;

                          try {
                            if (item.type === "series") {
                              const series = await fetchSeriesDetails(item.contentId);
                              detailedMovie = series;
                              const episode = series?.episodes?.find((ep) => {
                                if (item.episodeId && ep.mobifliks_id === item.episodeId) return true;
                                const sNum = item.seasonNumber ?? 1;
                                const epNum = item.episodeNumber ?? 1;
                                return (ep.season_number || 1) === sNum && ep.episode_number === epNum;
                              });
                              if (episode) {
                                freshTargetUrl = episode.server2_url || episode.download_url || freshTargetUrl;
                                freshMobifliksId = episode.mobifliks_id || freshMobifliksId;
                              }
                            } else {
                              const movie = await fetchMovieDetails(item.contentId);
                              detailedMovie = movie;
                              if (movie) {
                                freshTargetUrl = movie.server2_url || movie.download_url || freshTargetUrl;
                              }
                            }
                          } catch (err) {
                            console.error("[Continue Watching] Self-healing resolution error:", err);
                          }

                          const mediaUrl = await buildMediaUrl({
                            url: freshTargetUrl,
                            title: resumeTitle,
                            mobifliksId: freshMobifliksId,
                            play: true,
                          });

                          handlePlayVideo(
                            mediaUrl,
                            resumeTitle,
                            Number(item.progress) || 0,
                            {
                              ...item,
                              url: mediaUrl,
                            },
                            freshMobifliksId,
                            detailedMovie?.video_page_url || detailedMovie?.details_url
                          );
                        }}
                        onRemove={(id) => removeContinueWatching(id)}
                      />
                    </Suspense>
                  </div>
                </SectionReveal>
              )}

              <div className="mt-4">
                <div className="section-divider mb-2" />
                <LandscapeMovieRow
                  title={getCategoryTitle()}
                  movies={displayCategoryMovies}
                  onMovieClick={handleMovieClick}
                  onViewAll={() => handleTabChange("movies")}
                  isLoading={isLoading && recentMovies.length === 0}
                  showFilters
                  onFilterClick={() => setIsFilterOpen(true)}
                />
              </div>

              {showDeferredHomeSections && (
                <Suspense fallback={null}>
                  <div className="mt-6 md:mt-8 space-y-6 md:space-y-8 pb-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight">Discover More</h2>
                      <p className="text-muted-foreground text-sm">Hand-picked collections just for you</p>
                    </div>

                    {siteSettings.top10_enabled && (
                      <SectionReveal delay={100}>
                        <div className="section-divider mb-2" />
                        <Top10Row
                          movies={recentMovies}
                          onMovieClick={handleMovieClick}
                        />
                      </SectionReveal>
                    )}

                    {isMounted && continueWatching.length > 0 && recentMovies.length > 0 && (
                      <SectionReveal delay={200}>
                        <div className="section-divider mb-2" />
                        <RecommendationRow
                          continueWatching={continueWatching}
                          allMovies={[...recentMovies, ...recentSeries]}
                          onMovieClick={handleMovieClick}
                        />
                      </SectionReveal>
                    )}

                    <SectionReveal delay={300}>
                      <div className="section-divider mb-2" />
                      <LandscapeMovieRow
                        title="Popular Series"
                        movies={displayPopularSeries}
                        onMovieClick={handleMovieClick}
                        onViewAll={() => handleTabChange("series")}
                        isLoading={isLoading && recentSeries.length === 0}
                      />
                    </SectionReveal>

                    {!(suInMoviesData !== undefined && suInMoviesData.length === 0) && (
                      <DeferredSection id="popular-su-in" onNearViewport={() => enableQuery("popular-su-in")}>
                        {suInMoviesData && suInMoviesData.length > 0 ? (
                          <SectionReveal delay={350}>
                            <div className="section-divider mb-2" />
                            <LandscapeMovieRow
                              title="Popular on s-u.in"
                              movies={displaySuInMovies}
                              onMovieClick={handleMovieClick}
                              onViewAll={() => handleTabChange("movies", "popular-su-in")}
                            />
                          </SectionReveal>
                        ) : (
                          <div className="pt-2">
                            <LandscapeMovieRow
                              title="Popular on s-u.in"
                              movies={[]}
                              isLoading={true}
                              onMovieClick={handleMovieClick}
                            />
                          </div>
                        )}
                      </DeferredSection>
                    )}

                    <SectionReveal delay={400}>
                      <div className="section-divider mb-2" />
                      <LandscapeMovieRow
                        title="Spotlight Selection"
                        movies={displaySpotlightMovies}
                        onMovieClick={handleMovieClick}
                        isLoading={isLoading && recentMovies.length === 0}
                      />
                    </SectionReveal>

                    {!(actionMoviesData !== undefined && actionMoviesData.length === 0) && (
                      <DeferredSection id="action-movies" onNearViewport={() => enableQuery("action-movies")}>
                        {actionMoviesData && actionMoviesData.length > 0 ? (
                          <SectionReveal delay={450}>
                            <div className="section-divider mb-2" />
                            <LandscapeMovieRow
                              title="Action Movies"
                              movies={displayActionMovies}
                              onMovieClick={handleMovieClick}
                              onViewAll={() => handleTabChange("movies", "action-movies")}
                            />
                          </SectionReveal>
                        ) : (
                          <div className="pt-2">
                            <LandscapeMovieRow
                              title="Action Movies"
                              movies={[]}
                              isLoading={true}
                              onMovieClick={handleMovieClick}
                            />
                          </div>
                        )}
                      </DeferredSection>
                    )}

                    {!(scifiMoviesData !== undefined && scifiMoviesData.length === 0) && (
                      <DeferredSection id="scifi-movies" onNearViewport={() => enableQuery("scifi-movies")}>
                        {scifiMoviesData && scifiMoviesData.length > 0 ? (
                          <SectionReveal delay={500}>
                            <div className="section-divider mb-2" />
                            <LandscapeMovieRow
                              title="Sci-Fi Movies"
                              movies={displayScifiMovies}
                              onMovieClick={handleMovieClick}
                              onViewAll={() => handleTabChange("movies", "scifi-movies")}
                            />
                          </SectionReveal>
                        ) : (
                          <div className="pt-2">
                            <LandscapeMovieRow
                              title="Sci-Fi Movies"
                              movies={[]}
                              isLoading={true}
                              onMovieClick={handleMovieClick}
                            />
                          </div>
                        )}
                      </DeferredSection>
                    )}

                    {!(crimeThrillersData !== undefined && crimeThrillersData.length === 0) && (
                      <DeferredSection id="crime-thrillers" onNearViewport={() => enableQuery("crime-thrillers")}>
                        {crimeThrillersData && crimeThrillersData.length > 0 ? (
                          <SectionReveal delay={550}>
                            <div className="section-divider mb-2" />
                            <LandscapeMovieRow
                              title="Crime Thrillers"
                              movies={displayCrimeThrillers}
                              onMovieClick={handleMovieClick}
                              onViewAll={() => handleTabChange("movies", "crime-thrillers")}
                            />
                          </SectionReveal>
                        ) : (
                          <div className="pt-2">
                            <LandscapeMovieRow
                              title="Crime Thrillers"
                              movies={[]}
                              isLoading={true}
                              onMovieClick={handleMovieClick}
                            />
                          </div>
                        )}
                      </DeferredSection>
                    )}

                    {!(cyberpunkData !== undefined && cyberpunkData.length === 0) && (
                      <DeferredSection id="cyberpunk" onNearViewport={() => enableQuery("cyberpunk")}>
                        {cyberpunkData && cyberpunkData.length > 0 ? (
                          <SectionReveal delay={600}>
                            <div className="section-divider mb-2" />
                            <LandscapeMovieRow
                              title="Cyberpunk"
                              movies={displayCyberpunkMovies}
                              onMovieClick={handleMovieClick}
                              onViewAll={() => handleTabChange("movies", "cyberpunk")}
                            />
                          </SectionReveal>
                        ) : (
                          <div className="pt-2">
                            <LandscapeMovieRow
                              title="Cyberpunk"
                              movies={[]}
                              isLoading={true}
                              onMovieClick={handleMovieClick}
                            />
                          </div>
                        )}
                      </DeferredSection>
                    )}

                    {!(romanceData !== undefined && romanceData.length === 0) && (
                      <DeferredSection id="romantic-movies" onNearViewport={() => enableQuery("romantic-movies")}>
                        {romanceData && romanceData.length > 0 ? (
                          <SectionReveal delay={650}>
                            <div className="section-divider mb-2" />
                            <LandscapeMovieRow
                              title="Romantic Movies"
                              movies={displayRomanceMovies}
                              onMovieClick={handleMovieClick}
                              onViewAll={() => handleTabChange("movies", "romantic-movies")}
                            />
                          </SectionReveal>
                        ) : (
                          <div className="pt-2">
                            <LandscapeMovieRow
                              title="Romantic Movies"
                              movies={[]}
                              isLoading={true}
                              onMovieClick={handleMovieClick}
                            />
                          </div>
                        )}
                      </DeferredSection>
                    )}

                    {!(horrorData !== undefined && horrorData.length === 0) && (
                      <DeferredSection id="horror-movies" onNearViewport={() => enableQuery("horror-movies")}>
                        {horrorData && horrorData.length > 0 ? (
                          <SectionReveal delay={700}>
                            <div className="section-divider mb-2" />
                            <LandscapeMovieRow
                              title="Horror Movies"
                              movies={displayHorrorMovies}
                              onMovieClick={handleMovieClick}
                              onViewAll={() => handleTabChange("movies", "horror-movies")}
                            />
                          </SectionReveal>
                        ) : (
                          <div className="pt-2">
                            <LandscapeMovieRow
                              title="Horror Movies"
                              movies={[]}
                              isLoading={true}
                              onMovieClick={handleMovieClick}
                            />
                          </div>
                        )}
                      </DeferredSection>
                    )}
                  </div>
                </Suspense>
              )}
              </PageTransition>
            )}

          {/* Search View */}
          {viewMode === "search" && (
            <PageTransition viewKey="search">
              <div className="space-y-8 pb-12">
                <div className="max-w-xl mx-auto">
                  <Suspense fallback={<div className="h-12 rounded-full bg-card/60 border border-border/30 animate-pulse" />}>
                    <SearchBar
                      onSearch={handleSearch}
                      onMovieSelect={handleMovieClick}
                      popularSearches={popularSearches}
                      initialQuery={searchQuery}
                      isLoadingResults={isLoading}
                    />
                  </Suspense>
                </div>
 
                {/* Clean Slate Bento Landing State */}
                {!searchQuery && (
                  <div className="space-y-8 animate-fade-in">
                    {/* Recent & Popular Searches bento grid */}
                    {(recentSearches.length > 0 || popularSearches.length > 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                          <div className="glass-card-premium p-5 rounded-2xl border-white/[0.05] space-y-4 shadow-elevated">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                Recent Searches
                              </h3>
                              <button
                                onClick={handleClearRecentSearches}
                                className="text-xs text-primary hover:text-primary/80 hover:underline transition-all active:scale-95 font-semibold"
                              >
                                Clear All
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {recentSearches.map((term, index) => (
                                <div
                                  key={`recent-${term}-${index}`}
                                  className="group inline-flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-white/95 transition-all duration-300 shadow-sm"
                                >
                                  <button
                                    onClick={() => handleSearch(term)}
                                    className="font-medium hover:text-primary transition-colors text-left"
                                  >
                                    {term}
                                  </button>
                                  <button
                                    onClick={() => handleRemoveRecentSearch(term)}
                                    className="p-0.5 rounded-full hover:bg-white/15 text-muted-foreground hover:text-foreground transition-all duration-200"
                                    aria-label={`Remove ${term}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Trending Searches */}
                        {popularSearches.length > 0 && (
                          <div className="glass-card-premium p-5 rounded-2xl border-white/[0.05] space-y-4 shadow-elevated">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-emerald-400" />
                              Trending Searches
                            </h3>
                            <div className="flex flex-wrap gap-2.5">
                              {popularSearches.map((term, index) => (
                                <button
                                  key={`trending-${term}-${index}`}
                                  onClick={() => handleSearch(term)}
                                  className="px-4 py-2 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/30 text-sm text-primary font-semibold transition-all duration-300 active:scale-95 hover:shadow-[0_0_12px_rgba(239,68,68,0.12)]"
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}



                    {/* Featured / Recommended strip */}
                    {recentMovies.length > 0 && (
                      <div className="space-y-4 pt-4">
                        <div className="section-divider opacity-40" />
                        <LandscapeMovieRow
                          title="Highly Recommended For You"
                          movies={recentMovies.slice(0, 10)}
                          onMovieClick={handleMovieClick}
                        />
                      </div>
                    )}
                  </div>
                )}
 
                {/* Search Results State */}
                {searchQuery && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSearchInputValue("");
                            setSearchResults([]);
                            navigateTo("/search", { replace: true, shallow: true });
                          }}
                          className="shrink-0 p-2.5 rounded-full hover:bg-white/10 text-white transition-all duration-200 active:scale-95 border border-white/5 bg-white/5 backdrop-blur-md"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                          <h2 className="text-xl font-semibold text-white">Search Results</h2>
                          <p className="text-sm text-muted-foreground">
                            {filteredAndSortedResults.length} results for "{searchQuery}"
                          </p>
                        </div>
                      </div>

                      {/* Interactive Sort & Filter pill panel */}
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Media Type Filter */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                          <button
                            onClick={() => setTypeFilter("all")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95",
                              typeFilter === "all"
                                ? "bg-white text-black shadow-sm"
                                : "text-muted-foreground hover:text-white"
                            )}
                          >
                            All Content
                          </button>
                          <button
                            onClick={() => setTypeFilter("movie")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95",
                              typeFilter === "movie"
                                ? "bg-white text-black shadow-sm"
                                : "text-muted-foreground hover:text-white"
                            )}
                          >
                            Movies
                          </button>
                          <button
                            onClick={() => setTypeFilter("series")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95",
                              typeFilter === "series"
                                ? "bg-white text-black shadow-sm"
                                : "text-muted-foreground hover:text-white"
                            )}
                          >
                            TV Shows
                          </button>
                        </div>

                        {/* Sort Order */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                          <button
                            onClick={() => setSortFilter("popular")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95",
                              sortFilter === "popular"
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted-foreground hover:text-white"
                            )}
                          >
                            Popular
                          </button>
                          <button
                            onClick={() => setSortFilter("rating")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95",
                              sortFilter === "rating"
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted-foreground hover:text-white"
                            )}
                          >
                            Rating
                          </button>
                          <button
                            onClick={() => setSortFilter("newest")}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95",
                              sortFilter === "newest"
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted-foreground hover:text-white"
                            )}
                          >
                            Newest
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Results MovieGrid or Redesigned Empty State */}
                    {filteredAndSortedResults.length === 0 && !isLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-5 animate-fade-in glass-card-premium rounded-3xl border-white/[0.05]">
                        <div className="p-5 rounded-full bg-white/5 border border-white/10 text-muted-foreground/60 shadow-inner">
                          <Search className="w-10 h-10 animate-pulse text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-white">No Matching Content</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            We couldn't find any results for <span className="text-white font-semibold">"{searchQuery}"</span> with the selected filter. Try adjusting your categories.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setTypeFilter("all");
                            setSortFilter("popular");
                          }}
                          className="px-5 py-2 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all active:scale-95 hover:shadow-glow"
                        >
                          Reset Filter Tags
                        </button>
                      </div>
                    ) : (
                      <MovieGrid
                        movies={filteredAndSortedResults}
                        onMovieClick={handleMovieClick}
                        isLoading={isLoading}
                        emptyMessage={`No results found for "${searchQuery}"`}
                      />
                    )}
                  </div>
                )}
              </div>
            </PageTransition>
          )}

          {/* Movies Category */}
          {viewMode === "movies" && (
            <PageTransition viewKey="movies">
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
            <PageTransition viewKey="series">
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
            <PageTransition viewKey="originals">
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
          </AnimatePresence>
        </main>

        {showExitToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur border border-border/50 text-sm text-foreground shadow-lg">
            Press back again to exit
          </div>
        )}
        {viewMode !== "search" && (
          <footer className="container relative z-10 mx-auto pb-6 px-4 pt-8 mt-4 flex flex-col md:flex-row items-center justify-between gap-4 opacity-80 hover:opacity-100 transition-opacity">
            <div className="h-[24px]">
              <img 
                alt="MovieBay Logo" 
                className="h-full w-auto object-contain opacity-50 grayscale" 
                src={currentLogo} 
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground/60">
              <Link className="hover:text-white transition-colors" href="/dmca" suppressHydrationWarning>DMCA</Link>
              <Link className="hover:text-white transition-colors" href="/settings" suppressHydrationWarning>Settings</Link>
              <Link className="hover:text-white transition-colors" href="/privacy" suppressHydrationWarning>Privacy</Link>
              <Link className="hover:text-white transition-colors" href="/terms" suppressHydrationWarning>Terms</Link>
            </div>
          </footer>
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
              isMkv={isVideoMkv}
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
