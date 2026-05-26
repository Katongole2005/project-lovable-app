"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl, isUsableArtworkUrl } from "@/lib/api";
import {
  getHeroBackdropUrl,
  getHeroPosterUrl,
  preloadHeroImage,
} from "@/lib/heroImages";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";
import { HeroMediaImage } from "@/components/HeroMediaImage";

interface HeroCarouselProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onMovieClick?: (movie: Movie) => void;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
  isLoading?: boolean;
}

export function HeroCarousel({
  movies,
  onPlay,
  onMovieClick,
  title = "Top Movies",
  showViewAll = true,
  onViewAll,
  isLoading = false
}: HeroCarouselProps) {
  const deviceProfile = useDeviceProfile();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const isTransitioningRef = React.useRef(false);
  const safeMovies = React.useMemo(
    () =>
      movies.filter(
        (movie): movie is Movie =>
          Boolean(movie?.mobifliks_id) &&
          (isUsableArtworkUrl(movie.backdrop_url) || isUsableArtworkUrl(movie.image_url)),
      ),
    [movies],
  );
  const totalSlides = Math.min(
    safeMovies.length,
    deviceProfile.isWeakDevice ? (deviceProfile.isMobile ? 6 : 12) : 25
  );
  const displayMovies = React.useMemo(() => safeMovies.slice(0, totalSlides), [safeMovies, totalSlides]);
  const mobileDeck = displayMovies;
  const activeIndex = totalSlides > 0 ? Math.min(selectedIndex, totalSlides - 1) : 0;

  const [previousMovie, setPreviousMovie] = React.useState<Movie | null>(null);
  const [isCrossFading, setIsCrossFading] = React.useState(false);
  const prevActiveIndexRef = React.useRef(activeIndex);

  React.useEffect(() => {
    if (prevActiveIndexRef.current !== activeIndex) {
      const prevMovie = displayMovies[prevActiveIndexRef.current];
      if (prevMovie) {
        setPreviousMovie(prevMovie);
        setIsCrossFading(true);
        const timer = setTimeout(() => {
          setIsCrossFading(false);
          setPreviousMovie(null);
        }, 800);
        prevActiveIndexRef.current = activeIndex;
        return () => clearTimeout(timer);
      }
      prevActiveIndexRef.current = activeIndex;
    }
  }, [activeIndex, displayMovies]);

  const railRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = railRef.current;
    if (!container) return;
    const activeChild = container.children[activeIndex] as HTMLElement;
    if (activeChild) {
      const containerWidth = container.clientWidth;
      const childWidth = activeChild.clientWidth;
      const childLeft = activeChild.offsetLeft;
      const targetScrollLeft = childLeft - (containerWidth / 2) + (childWidth / 2);
      
      container.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
    }
  }, [activeIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = x - xc;
    const dy = y - yc;
    
    const tiltX = -(dy / yc) * 10;
    const tiltY = (dx / xc) * 10;
    
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.05, 1.05, 1.05) translate3d(0, -5px, 0)`;
    
    const glare = card.querySelector(".hero-glare-sweep") as HTMLElement;
    if (glare) {
      const px = (x / rect.width) * 100;
      const py = (y / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255, 255, 255, 0.16) 0%, transparent 60%)`;
      glare.style.opacity = "1";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translate3d(0, 0, 0)`;
    const glare = card.querySelector(".hero-glare-sweep") as HTMLElement;
    if (glare) {
      glare.style.opacity = "0";
    }
  };
  const transitionDuration = deviceProfile.allowComplexAnimations ? 420 : 180;
  const autoplayDelayMs = deviceProfile.autoplayDelayMs;
  const sideCardCount = deviceProfile.isWeakDevice ? 2 : 3;
  const shouldAutoplay = totalSlides > 1;


  const scrollTo = React.useCallback((index: number) => {
    if (isTransitioningRef.current || totalSlides === 0) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    setSelectedIndex(Math.max(0, Math.min(index, totalSlides - 1)));
    setTimeout(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }, transitionDuration);
  }, [totalSlides, transitionDuration]);

  const scrollPrev = React.useCallback(() => {
    if (isTransitioningRef.current || totalSlides === 0) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    setSelectedIndex(prev => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }, transitionDuration);
  }, [totalSlides, transitionDuration]);

  const scrollNext = React.useCallback(() => {
    if (isTransitioningRef.current || totalSlides === 0) return;
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    setSelectedIndex(prev => (prev + 1) % totalSlides);
    setTimeout(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }, transitionDuration);
  }, [totalSlides, transitionDuration]);

  React.useEffect(() => {
    if (!shouldAutoplay || totalSlides <= 1) return;

    const delay = autoplayDelayMs || 5000;
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      setSelectedIndex((prev) => (prev + 1) % totalSlides);
    }, delay);

    return () => window.clearInterval(intervalId);
  }, [shouldAutoplay, totalSlides, autoplayDelayMs]);

  React.useEffect(() => {
    if (!displayMovies.length) return;

    const indices = [
      activeIndex,
      (activeIndex + 1) % totalSlides,
      (activeIndex + totalSlides - 1) % totalSlides,
    ];

    indices.forEach((index) => {
      const movie = displayMovies[index];
      if (!movie) return;
      preloadHeroImage(getHeroBackdropUrl(movie, deviceProfile.allowHighResImages));
      preloadHeroImage(getHeroPosterUrl(movie));
    });
  }, [activeIndex, deviceProfile.allowHighResImages, displayMovies, totalSlides]);

  React.useEffect(() => {
    if (totalSlides > 0 && selectedIndex >= totalSlides) {
      setSelectedIndex(totalSlides - 1);
    }
  }, [selectedIndex, totalSlides]);

  const getBackdrop = React.useCallback(
    (movie?: Movie) => getHeroBackdropUrl(movie, deviceProfile.allowHighResImages),
    [deviceProfile.allowHighResImages],
  );

  const touchStartX = React.useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) scrollNext(); else scrollPrev();
    }
  };

  if (isLoading || !displayMovies.length) {
    return <div className="overflow-hidden relative" aria-busy="true" aria-label="Loading latest movies">
      <div className="md:hidden rounded-3xl p-4 pt-[calc(6.5rem_+_env(safe-area-inset-top))] overflow-hidden relative hero-mobile-gradient min-h-[calc(350px_+_6.5rem_+_env(safe-area-inset-top))]">
        <div className="flex justify-between items-center mb-3">
          <div className="h-6 w-32 bg-white/8 rounded-lg shimmer" />
          <div className="h-5 w-14 bg-white/8 rounded-lg shimmer" />
        </div>
        <div className="flex justify-center py-2">
          <div className="w-[160px] h-[240px] rounded-xl bg-white/8 shimmer" />
        </div>
        <div className="mt-3 mx-auto h-5 w-40 rounded-lg bg-white/8 shimmer" />
      </div>
      <div className="hidden md:block">
        <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden hero-cinematic-container bg-[#0a0a0f]">
          <div className="absolute inset-0 loading-gradient-complex shimmer opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-black/50" />
          <div className="absolute left-10 bottom-12 space-y-5">
            <div className="h-20 w-72 rounded-xl bg-white/8 shimmer" />
            <div className="h-5 w-52 rounded-lg bg-white/8 shimmer" />
            <div className="h-4 w-[34rem] max-w-[50vw] rounded-lg bg-white/6 shimmer" />
            <div className="h-12 w-36 rounded-full bg-white/10 shimmer" />
          </div>
        </div>
      </div>
    </div>;
  }

  const currentMovie = displayMovies[activeIndex];
  const backdropSrc = getBackdrop(currentMovie);
  const posterFallbackSrc = getHeroPosterUrl(currentMovie);
  const showHeavyHeroEffects = !deviceProfile.preferLightweightRendering;
  const vjVersionCount = currentMovie.vj_count ?? currentMovie.vj_versions?.length ?? 0;
  const heroMetaChips = [
    currentMovie.year ? String(currentMovie.year) : null,
    vjVersionCount > 1
      ? `${vjVersionCount} VJ Versions`
      : currentMovie.vj_name
        ? `VJ ${currentMovie.vj_name}`
        : null,
    currentMovie.genres?.[0] ?? (currentMovie.type === "series" ? "Series" : "Movie"),
    currentMovie.server2_url || currentMovie.download_url ? "HD" : null,
  ].filter(Boolean) as string[];

  const getSideCards = () => {
    if (totalSlides <= 1) return [];
    const cards: { movie: Movie; originalIndex: number }[] = [];
    const seen = new Set<number>([activeIndex]);
    for (let i = 1; i <= totalSlides && cards.length < sideCardCount; i++) {
      const idx = (activeIndex + i) % totalSlides;
      if (!seen.has(idx)) {
        seen.add(idx);
        cards.push({ movie: displayMovies[idx], originalIndex: idx });
      }
    }
    return cards;
  };

  return (
    <div className="overflow-hidden relative isolate [transform-style:flat]">
      {/* Mobile carousel */}
      <div className="md:hidden rounded-3xl p-4 pt-[calc(6.5rem_+_env(safe-area-inset-top))] overflow-hidden relative hero-mobile-gradient min-h-[calc(460px_+_6.5rem_+_env(safe-area-inset-top))] flex flex-col justify-between">
        {/* Dynamic Ambient Blur Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl">
          {currentMovie && (
            <div
              key={`mobile-bg-${currentMovie.mobifliks_id}`}
              className="absolute inset-0 transition-opacity duration-500 ease-out"
            >
              {deviceProfile.allowAmbientEffects ? (
                <HeroMediaImage
                  primarySrc={getBackdrop(currentMovie)}
                  fallbackSrc={posterFallbackSrc}
                  alt=""
                  className="h-full w-full scale-125 object-cover opacity-35 blur-2xl"
                  priority
                />
              ) : (
                <div
                  className="h-full w-full bg-cover bg-center opacity-40"
                  ref={(el) => { if (el) el.style.backgroundImage = `url(${backdropSrc ?? posterFallbackSrc ?? ""})`; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/45 via-black/65 to-[#0a0a0f]/95" />
            </div>
          )}
        </div>

        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(270,60%,55%)/0.3_0%,transparent_65%)] pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-center mb-3">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">{title}</h2>
          {showViewAll && <button onClick={onViewAll} className="text-sm font-medium text-white/70 hover:text-white transition-colors">View all</button>}
        </div>

        <div className="relative flex items-center justify-center py-6 carousel-perspective z-10" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="relative w-[160px] h-[240px]">
            {mobileDeck.map((movie, index) => {
              const offset = index - activeIndex;
              const numSlides = mobileDeck.length;
              let adjustedOffset = offset;
              if (offset > numSlides / 2) adjustedOffset = offset - numSlides;
              if (offset < -numSlides / 2) adjustedOffset = offset + numSlides;
              const isSelected = index === activeIndex;
              const isVisible = Math.abs(adjustedOffset) <= 2;
              const rotateY = adjustedOffset * -25;
              const translateX = adjustedOffset * 28;
              const translateZ = Math.abs(adjustedOffset) * -120;
              const scale = isSelected ? 1 : Math.max(0.65, 1 - Math.abs(adjustedOffset) * 0.2);
              const opacity = isSelected ? 1 : Math.max(0.5, 1 - Math.abs(adjustedOffset) * 0.25);
              const zIndex = 20 - Math.abs(adjustedOffset) * 5;
              if (!isVisible) return null;
              return (
                <div
                  key={movie.mobifliks_id}
                  className={cn(
                    "absolute inset-0 cursor-pointer transition-all ease-out preserve-3d dynamic-card",
                    deviceProfile.isWeakDevice ? "duration-200" : "duration-300"
                  )}
                  ref={(el) => {
                    if (el) {
                      el.style.transform = `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
                      el.style.opacity = opacity.toString();
                      el.style.zIndex = zIndex.toString();
                    }
                  }}
                  onClick={() => isSelected ? (onMovieClick ? onMovieClick(movie) : onPlay(movie)) : scrollTo(index)}
                >
                  <div className={cn(
                    "w-full h-full rounded-xl overflow-hidden shadow-2xl transition-all duration-300 border border-white/10", 
                    isSelected && "shadow-[0_20px_50px_-10px_rgba(239,68,68,0.35)] border-red-500/40 scale-102"
                  )}>
                    <HeroMediaImage
                      primarySrc={getImageUrl(movie.image_url)}
                      fallbackSrc={getHeroPosterUrl(movie)}
                      alt={movie.title}
                      className={cn(
                        "h-full w-full object-cover",
                        isSelected && deviceProfile.allowAmbientEffects && "animate-ken-burns animate-10s",
                      )}
                      priority={Math.abs(adjustedOffset) <= 1}
                    />
                    <div className={cn("absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300", isSelected ? "opacity-0" : "opacity-60")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {currentMovie && (
            <div key={`${currentMovie.mobifliks_id}-${activeIndex}`} className="relative z-10 mt-2 text-center">
              <div className="flex flex-col items-center justify-center gap-2 px-4">
                {currentMovie.logo_url ? (
                  <img
                    src={currentMovie.logo_url}
                    alt={currentMovie.title}
                    className="hero-stagger-logo h-10 w-auto max-w-full object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
                    loading="eager"
                  />
                ) : (
                  <h3 className="hero-stagger-logo text-lg font-display font-bold text-white tracking-tight drop-shadow-md line-clamp-1">{currentMovie.title}</h3>
                )}
                <div className="hero-stagger-meta flex max-w-full flex-wrap items-center justify-center gap-1.5">
                  {heroMetaChips.slice(0, 4).map((chip) => (
                    <span
                      key={chip}
                      className="hero-meta-chip rounded-md px-2.5 py-0.5 text-[10px] font-semibold text-white/90"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                
                {/* Mobile Hero Actions */}
                <div className="hero-stagger-cta flex items-center justify-center gap-3 mt-3 w-full max-w-[280px]">
                  <button
                    onClick={() => onMovieClick ? onMovieClick(currentMovie) : onPlay(currentMovie)}
                    className="btn-premium-red flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-white font-bold text-xs shadow-lg shadow-red-600/20 active:scale-95 transition-transform"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-white" />
                    Watch Now
                  </button>
                  {onMovieClick && (
                    <button
                      onClick={() => onMovieClick(currentMovie)}
                      className="btn-glass flex-1 py-2 px-4 rounded-full text-white font-semibold text-xs active:scale-95 transition-transform"
                    >
                      Details
                    </button>
                  )}
                </div>
              </div>
            </div>
        )}

        <div className="relative z-10 mt-4">
          <div className="mx-auto flex w-full max-w-[180px] items-center justify-center gap-3">
            <span className="text-[10px] font-semibold tabular-nums text-white/55">
              {String(activeIndex + 1).padStart(2, "0")}
            </span>
            <div className="hero-progress-rail h-0.5 flex-1 overflow-hidden rounded-full">
              {shouldAutoplay && (
                  <div
                    key={`mobile-progress-${activeIndex}`}
                    className="hero-progress-bar-fill hero-progress-highlight h-full rounded-full animate-progress"
                    ref={(el) => { if (el) el.style.setProperty("--duration", `${autoplayDelayMs}ms`); }}
                  />
              )}
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-white/35">
              {String(totalSlides).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden hero-cinematic-container">
          <div className="absolute inset-0 bg-[#0a0a0f]" />
          <div className="absolute inset-0 select-none pointer-events-none">
            {/* Outgoing previous slide backdrop */}
            {previousMovie && isCrossFading && (
              <div className="absolute inset-0 hero-backdrop-outgoing z-0">
                <HeroMediaImage
                  primarySrc={getBackdrop(previousMovie)}
                  fallbackSrc={getHeroPosterUrl(previousMovie)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {/* Incoming current slide backdrop */}
            {currentMovie && (
              <div 
                key={`backdrop-${currentMovie.mobifliks_id}`} 
                className={cn(
                  "absolute inset-0 z-0",
                  isCrossFading ? "hero-backdrop-incoming" : ""
                )}
              >
                <HeroMediaImage
                  primarySrc={backdropSrc}
                  fallbackSrc={posterFallbackSrc}
                  alt=""
                  className={cn(
                    "h-full w-full object-cover",
                    showHeavyHeroEffects && deviceProfile.allowComplexAnimations && "hero-backdrop-drift",
                  )}
                  priority
                />
              </div>
            )}
          </div>

	          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-black/45" />
	          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/35" />
	          <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#0a0a0f]/85 via-black/45 to-transparent" />
	          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/25 to-transparent" />
	          {showHeavyHeroEffects && (
	            <>
	              <div className="hero-ambient-wash absolute inset-0 pointer-events-none" />
	              <div
	                className={cn(
	                  "hero-light-sweep absolute inset-0 pointer-events-none",
	                  isTransitioning && "active",
	                )}
	              />
	              <div className="hero-grain-overlay absolute inset-0 pointer-events-none" />
	              <div className="hero-content-glass absolute left-0 bottom-0 top-0 w-[58%] pointer-events-none" />
	            </>
	          )}

	          <div className="absolute inset-0 pointer-events-none hero-vignette" />

          <div className="relative z-10 h-full flex flex-col justify-end hero-cinematic-container">

            <div className="px-6 pb-4 lg:px-10 xl:px-14 2xl:px-16">
                <>
                  <div 
                    key={`info-${activeIndex}`}
                    className="max-w-[min(640px,48vw)]"
                  >
                    <div className="mb-4 lg:mb-5">
                      {currentMovie.logo_url ? (
                        <img
                          src={currentMovie.logo_url}
                          alt={currentMovie.title}
                          className="hero-stagger-logo max-h-[64px] w-auto max-w-[min(520px,40vw)] object-contain object-left drop-shadow-[0_8px_24px_rgba(0,0,0,0.92)] md:max-h-[75px] lg:max-h-[88px] xl:max-h-[105px] 2xl:max-h-[120px]"
                          loading="eager"
                        />
                      ) : (
                        <h2 className="hero-stagger-logo font-display text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] lg:text-5xl xl:text-6xl 2xl:text-7xl">
                          <span className="hero-premium-title">{currentMovie.title}</span>
                        </h2>
                      )}
                      <div className="hero-stagger-line mt-4 h-px w-28 bg-gradient-to-r from-red-500/85 via-white/35 to-transparent shadow-[0_0_18px_rgba(239,68,68,0.45)]" />
                    </div>
                    <div
                      className="hero-stagger-meta flex flex-wrap items-center gap-2 mb-3 lg:mb-4"
                    >
                      {heroMetaChips.map((chip) => (
                        <span
                          key={chip}
	                          className="hero-meta-chip rounded-md px-3 py-1 text-xs font-semibold text-white/80"
	                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    {currentMovie.description && (
                      <p 
                        className="hero-stagger-desc text-[13px] lg:text-sm xl:text-base text-white/[0.82] max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl line-clamp-2 mb-4 lg:mb-5 leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]"
                      >
                        {currentMovie.description}
                      </p>
                    )}

                    <div className="hero-stagger-cta flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => onMovieClick ? onMovieClick(currentMovie) : onPlay(currentMovie)}
                        data-testid="button-hero-play"
                        className="btn-premium-red hero-cta-glow group flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 lg:px-7 lg:py-3 rounded-full text-white font-semibold text-xs md:text-sm lg:text-base"
                      >
                        <Play className="w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 fill-current text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                        Watch Now
                      </button>
                      <button
                        onClick={onViewAll}
                        data-testid="button-hero-more"
                        className="btn-glass px-4 py-2 md:px-5 md:py-2.5 lg:px-7 lg:py-3 rounded-full text-white font-medium text-xs md:text-sm lg:text-base"
                      >
                        More
                      </button>
                      <div className="h-5 w-px bg-white/15 mx-1 shrink-0" />
                      <button
                        onClick={scrollPrev}
                        data-testid="button-hero-prev"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.09] text-white/70 backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/[0.16] hover:text-white active:scale-95"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={scrollNext}
                        data-testid="button-hero-next"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.09] text-white/70 backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/[0.16] hover:text-white active:scale-95"
                        aria-label="Next"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <div className="hero-progress-rail h-[3px] w-16 lg:w-20 overflow-hidden rounded-full flex-shrink-0">
                        {shouldAutoplay && (
                          <div
                            key={`desktop-progress-${activeIndex}`}
                            className="hero-progress-bar-fill hero-progress-highlight h-full rounded-full"
                            ref={(el) => { if (el) el.style.setProperty("--duration", `${autoplayDelayMs}ms`); }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </>
            </div>

             <div className="pb-3 md:pb-4 lg:pb-6 mt-3 lg:mt-4">
              <div ref={railRef} className="flex items-end gap-2.5 overflow-x-auto hide-scrollbar px-4 lg:px-8 xl:px-12 2xl:px-14 snap-x">
                {displayMovies.map((movie, idx) => {
                  const isActiveCard = idx === activeIndex;
                  const mBackdrop = getBackdrop(movie);
                  const mPoster = getHeroPosterUrl(movie);
                  return (
                    <button
                      key={movie.mobifliks_id}
                      onClick={() => scrollTo(idx)}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      aria-label={`Go to ${movie.title}`}
                      className={cn(
                        "relative flex-shrink-0 w-[115px] sm:w-[130px] md:w-[145px] lg:w-[165px] xl:w-[185px] 2xl:w-[210px] aspect-video rounded-xl overflow-hidden border transition-all duration-300 snap-start hero-rail-card hero-rail-card-enter",
                        isActiveCard ? "active" : ""
                      )}
                      style={{
                        animationDelay: `${idx * 45}ms`
                      }}
                    >
                      <div className="hero-glare-sweep absolute inset-0 pointer-events-none z-20 opacity-0 transition-opacity duration-300" />
                      <HeroMediaImage
                        primarySrc={mBackdrop}
                        fallbackSrc={mPoster}
                        alt={movie.title}
                        className="h-full w-full object-cover"
                        priority={Math.abs(idx - activeIndex) <= 2}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      {movie.logo_url ? (
                        <img
                          src={movie.logo_url}
                          alt={movie.title}
                          className="absolute bottom-2 right-2 h-5 xl:h-6 w-auto max-w-[70px] object-contain drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] z-10"
                        />
                      ) : (
                        <span className="absolute bottom-1.5 left-2 text-[9px] xl:text-[10px] font-bold text-white/85 line-clamp-1 max-w-[90%] z-10">
                          {movie.title}
                        </span>
                      )}
                      {isActiveCard && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-red-500 origin-left animate-rail-progress z-20 shadow-[0_0_10px_#ef4444]"
                          style={{ animationDuration: shouldAutoplay ? `${autoplayDelayMs}ms` : "0ms" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-20" aria-hidden="true">
            <svg width="400" height="10" viewBox="0 0 400 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[240px] md:w-[300px] lg:w-[380px]">
              <path d="M0 10 C10 10 16 1 28 1 L372 1 C384 1 390 10 400 10 L400 10 L0 10 Z" fill="white" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
