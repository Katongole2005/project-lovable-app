import * as React from "react";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl, isUsableArtworkUrl } from "@/lib/api";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";

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
    () => movies.filter((movie): movie is Movie => Boolean(movie?.mobifliks_id) && isUsableArtworkUrl(movie.backdrop_url)),
    [movies]
  );
  const totalSlides = Math.min(
    safeMovies.length,
    deviceProfile.isWeakDevice ? (deviceProfile.isMobile ? 6 : 12) : 25
  );
  const displayMovies = React.useMemo(() => safeMovies.slice(0, totalSlides), [safeMovies, totalSlides]);
  const mobileDeck = displayMovies;
  const activeIndex = totalSlides > 0 ? Math.min(selectedIndex, totalSlides - 1) : 0;
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
    let animationFrameId: number;
    let lastTime = performance.now();
    const delay = autoplayDelayMs || 4000;
    
    const loop = (time: number) => {
      if (time - lastTime >= delay) {
        setSelectedIndex(prev => (prev + 1) % totalSlides);
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [shouldAutoplay, totalSlides, autoplayDelayMs]);

  React.useEffect(() => {
    if (totalSlides > 0 && selectedIndex >= totalSlides) {
      setSelectedIndex(totalSlides - 1);
    }
  }, [selectedIndex, totalSlides]);

  const getBackdrop = React.useCallback(
    (movie?: Movie) => {
      if (!movie?.backdrop_url) return null;
      return deviceProfile.allowHighResImages
        ? movie.backdrop_url.replace('/original/', '/w1280/').replace('/w780/', '/w1280/')
        : getOptimizedBackdropUrl(movie.backdrop_url);
    },
    [deviceProfile.allowHighResImages]
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
    return <div className="overflow-hidden relative" aria-busy={isLoading} aria-label="Loading latest movies">
      <div className="md:hidden rounded-3xl p-4 pt-[calc(6.5rem+env(safe-area-inset-top))] overflow-hidden relative hero-mobile-gradient min-h-[calc(350px+6.5rem+env(safe-area-inset-top))]">
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
    <div className="overflow-hidden relative">
      {/* Mobile carousel */}
      <div className="md:hidden rounded-3xl p-4 pt-[calc(6.5rem+env(safe-area-inset-top))] overflow-hidden relative hero-mobile-gradient min-h-[calc(460px+6.5rem+env(safe-area-inset-top))] flex flex-col justify-between">
        {/* Dynamic Ambient Blur Background Layer */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none rounded-3xl">
          {currentMovie && (
            <div
              key={`mobile-bg-${currentMovie.mobifliks_id}`}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
            >
              <img
                src={currentMovie.backdrop_url ? getOptimizedBackdropUrl(currentMovie.backdrop_url) : getImageUrl(currentMovie.image_url)}
                alt=""
                className="w-full h-full object-cover blur-[36px] scale-125 opacity-35"
              />
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
                  style={{
                    transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity: opacity,
                    zIndex: zIndex,
                  } as React.CSSProperties}
                  onClick={() => isSelected ? (onMovieClick ? onMovieClick(movie) : onPlay(movie)) : scrollTo(index)}
                >
                  <div className={cn(
                    "w-full h-full rounded-xl overflow-hidden shadow-2xl transition-all duration-300 border border-white/10", 
                    isSelected && "shadow-[0_20px_50px_-10px_rgba(239,68,68,0.35)] border-red-500/40 scale-102"
                  )}>
                    <img
                      src={getImageUrl(movie.image_url)}
                      alt={movie.title}
                      className={cn("w-full h-full object-cover", isSelected && deviceProfile.allowAmbientEffects && "animate-ken-burns animate-10s")}
                      loading="eager"
                      fetchpriority={index < 3 ? "high" : "auto"}
                    />
                    <div className={cn("absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-opacity duration-300", isSelected ? "opacity-0" : "opacity-60")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {currentMovie && (
            <div key={currentMovie.mobifliks_id} className="relative z-10 mt-2 text-center">
              <div className="flex flex-col items-center justify-center gap-2 px-4">
                {currentMovie.logo_url ? (
                  <img
                    src={currentMovie.logo_url}
                    alt={currentMovie.title}
                    className="h-10 w-auto max-w-full object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
                    loading="eager"
                  />
                ) : (
                  <h3 className="text-lg font-display font-bold text-white tracking-tight drop-shadow-md line-clamp-1">{currentMovie.title}</h3>
                )}
                <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
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
                <div className="flex items-center justify-center gap-3 mt-3 w-full max-w-[280px]">
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
                    style={{ "--duration": `${autoplayDelayMs}ms` } as React.CSSProperties}
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
          <>
            {backdropSrc && (
              <div
                key={`backdrop-${activeIndex}`}
                className="absolute inset-0"
              >
	                <img
	                  src={backdropSrc}
	                  alt=""
	                  className={cn("h-full w-full object-cover", deviceProfile.allowComplexAnimations && "hero-backdrop-drift")}
	                  loading="eager"
	                  fetchpriority="high"
	                />
              </div>
            )}
            {!backdropSrc && (
              <div
                key={`backdrop-fallback-${activeIndex}`}
                className="absolute inset-0 blur-[80px] pointer-events-none bg-cover bg-center opacity-40"
                style={{ backgroundImage: `url(${getImageUrl(currentMovie.image_url)})` }}
              />
            )}
          </>

	          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-black/45" />
	          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/35" />
	          <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#0a0a0f]/85 via-black/45 to-transparent" />
	          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/25 to-transparent" />
	          <div className="hero-ambient-wash absolute inset-0 pointer-events-none" />
	          <div className={cn("hero-light-sweep absolute inset-0 pointer-events-none", isTransitioning && "active")} />
	          <div className="hero-grain-overlay absolute inset-0 pointer-events-none" />
	          <div className="hero-content-glass absolute left-0 bottom-0 top-0 w-[58%] pointer-events-none" />

	          <div className="absolute inset-0 pointer-events-none hero-vignette" />

          <div className="relative z-10 h-full flex hero-cinematic-container">

            <div className="flex-1 flex flex-col justify-end p-6 pb-[8vh] lg:p-10 lg:pb-[9vh] xl:p-14 xl:pb-[9vh] 2xl:p-16 2xl:pb-[10vh]">
                <>
                  <div 
                    key={`info-${activeIndex}`}
                    className="max-w-[min(640px,48vw)]"
                  >
                    <div className="mb-6 lg:mb-8">
                      {currentMovie.logo_url ? (
                        <img
                          src={currentMovie.logo_url}
                          alt={currentMovie.title}
                          className="hero-title-reveal max-h-[96px] w-auto max-w-[min(560px,42vw)] object-contain object-left drop-shadow-[0_12px_34px_rgba(0,0,0,0.92)] lg:max-h-[118px] xl:max-h-[132px] 2xl:max-h-[148px]"
                          loading="eager"
                        />
                      ) : (
                        <h2 className="hero-title-reveal font-display text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] lg:text-5xl xl:text-6xl 2xl:text-7xl">
                          {currentMovie.title}
                        </h2>
                      )}
                      <div className="mt-4 h-px w-28 bg-gradient-to-r from-red-500/85 via-white/35 to-transparent shadow-[0_0_18px_rgba(239,68,68,0.45)]" />
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-2 mb-5 lg:mb-7"
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
                        className="text-sm lg:text-base 2xl:text-lg text-white/50 max-w-lg 2xl:max-w-2xl line-clamp-2 mb-6 lg:mb-8 leading-relaxed"
                      >
                        {currentMovie.description}
                      </p>
                    )}

                    <div 
                      className="flex items-center gap-3"
                    >
                      <button
                        onClick={() => onMovieClick ? onMovieClick(currentMovie) : onPlay(currentMovie)}
                        data-testid="button-hero-play"
	                        className="btn-premium-red hero-cta-glow group flex items-center gap-2.5 px-6 py-3 lg:px-8 lg:py-3.5 rounded-full text-white font-semibold text-sm lg:text-base"
                      >
                        <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-current text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                        Watch Now
                      </button>
                      <button
                        onClick={onViewAll}
                        data-testid="button-hero-more"
                        className="btn-glass px-6 py-3 lg:px-8 lg:py-3.5 rounded-full text-white font-medium text-sm lg:text-base"
                      >
                        More
                      </button>
                    </div>
                  </div>
                </>

              <div className="mt-6 flex items-center gap-3 lg:mt-8">
                <button
                  onClick={scrollPrev}
                  data-testid="button-hero-prev"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/65 backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-white/15 hover:text-white active:scale-95 lg:h-10 lg:w-10"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={scrollNext}
                  data-testid="button-hero-next"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-white/65 backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:bg-white/15 hover:text-white active:scale-95 lg:h-10 lg:w-10"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="ml-1 flex min-w-[130px] items-center gap-3">
	                  <div className="hero-progress-rail h-0.5 flex-1 overflow-hidden rounded-full">
	                  {shouldAutoplay && (
	                    <div
	                      key={`desktop-progress-${activeIndex}`}
	                      className="hero-progress-bar-fill hero-progress-highlight h-full rounded-full"
	                      style={{ "--duration": `${autoplayDelayMs}ms` } as React.CSSProperties}
	                    />
                  )}
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-end pb-8 pr-6 xl:pr-10 2xl:pr-14 min-w-[380px] 2xl:min-w-[520px]">
                <>
                  <div 
                    key={`cards-${activeIndex}`} 
                    className="flex items-end gap-4 xl:gap-5"
                  >
                    {getSideCards().map(({ movie, originalIndex }, cardIdx) => (
                      <button
                        key={movie.mobifliks_id}
                        className="relative flex flex-col items-center cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl hover:-translate-y-2 transition-all duration-300"
                        onClick={() => scrollTo(originalIndex)}
                        data-testid={`button-hero-side-card-${originalIndex}`}
                        aria-label={`Go to ${movie.title}`}
                      >
                        <div className="relative w-[100px] xl:w-[120px] 2xl:w-[140px] aspect-[2/3] rounded-xl xl:rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-hover:shadow-[0_12px_48px_rgba(239,68,68,0.3)]">
                          <img
                            src={getImageUrl(movie.image_url)}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-115"
                            loading="eager"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        </div>
                        <p className="mt-2.5 text-[10px] xl:text-xs text-white/40 text-center font-bold uppercase tracking-widest max-w-[100px] xl:max-w-[120px] 2xl:max-w-[140px] truncate group-hover:text-primary transition-colors">
                          {movie.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </>
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
  );
}
