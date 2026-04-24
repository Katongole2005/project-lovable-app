import * as React from "react";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl } from "@/lib/api";
import { Star, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";

interface HeroCarouselProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onMovieClick?: (movie: Movie) => void;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function HeroCarousel({
  movies,
  onPlay,
  onMovieClick,
  title = "Top Movies",
  showViewAll = true,
  onViewAll
}: HeroCarouselProps) {
  const deviceProfile = useDeviceProfile();
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const totalSlides = Math.min(
    movies.length,
    deviceProfile.isWeakDevice ? (deviceProfile.isMobile ? 6 : 12) : 25
  );
  const displayMovies = React.useMemo(() => movies.slice(0, totalSlides), [movies, totalSlides]);
  const mobileDeck = displayMovies;
  const transitionDuration = deviceProfile.allowComplexAnimations ? 1300 : 650;
  const autoplayDelayMs = deviceProfile.autoplayDelayMs;
  const sideCardCount = deviceProfile.isWeakDevice ? 2 : 3;
  const shouldAutoplay = totalSlides > 1 && autoplayDelayMs > 0;


  const scrollTo = React.useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedIndex(index);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  }, [isTransitioning, transitionDuration]);

  const scrollPrev = React.useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedIndex(prev => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  }, [totalSlides, isTransitioning, transitionDuration]);

  const scrollNext = React.useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedIndex(prev => (prev + 1) % totalSlides);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  }, [totalSlides, isTransitioning, transitionDuration]);

  React.useEffect(() => {
    if (!shouldAutoplay) return;
    const timer = window.setInterval(() => {
      scrollNext();
    }, autoplayDelayMs);
    return () => window.clearInterval(timer);
  }, [autoplayDelayMs, scrollNext, shouldAutoplay]);

  React.useEffect(() => {
    if (totalSlides > 0 && selectedIndex >= totalSlides) {
      setSelectedIndex(0);
    }
  }, [selectedIndex, totalSlides]);

  const getBackdrop = React.useCallback(
    (movie: Movie) => {
      if (!movie.backdrop_url) return null;
      return deviceProfile.allowHighResImages
        ? movie.backdrop_url.replace('/original/', '/w1280/').replace('/w780/', '/w1280/')
        : getOptimizedBackdropUrl(movie.backdrop_url);
    },
    [deviceProfile.allowHighResImages]
  );

  React.useEffect(() => {
    if (totalSlides <= 1 || deviceProfile.isWeakDevice) return;

    const nextIdx = (selectedIndex + 1) % totalSlides;
    const nextMovie = displayMovies[nextIdx];
    if (!nextMovie) return;

    const backdropUrl = getBackdrop(nextMovie);
    if (backdropUrl) {
      const img = new Image();
      img.src = backdropUrl;
    }
  }, [deviceProfile.isWeakDevice, displayMovies, getBackdrop, selectedIndex, totalSlides]);

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

  const getImdbRating = (movie: Movie) => {
    const hash = movie.mobifliks_id.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return (5 + Math.abs(hash) % 40 / 10).toFixed(1);
  };

  const getStarCount = (movie: Movie) => {
    const rating = parseFloat(getImdbRating(movie));
    return Math.round(rating / 2);
  };

  if (!displayMovies.length) {
    return <div className="rounded-3xl p-6 overflow-hidden relative loading-gradient-complex">
      <div className="flex justify-between items-center mb-6">
        <div className="h-7 w-32 bg-white/8 rounded-lg shimmer" />
        <div className="h-5 w-16 bg-white/8 rounded-lg shimmer" />
      </div>
      <div className="flex justify-center gap-4">
        <div className="w-36 h-52 bg-white/6 rounded-2xl shimmer" />
        <div className="w-40 h-56 bg-white/8 rounded-2xl shimmer delay-150" />
        <div className="w-36 h-52 bg-white/6 rounded-2xl shimmer delay-300" />
      </div>
    </div>;
  }

  const currentMovie = displayMovies[selectedIndex];
  const backdropSrc = getBackdrop(currentMovie);

  const getSideCards = () => {
    if (totalSlides <= 1) return [];
    const cards: { movie: Movie; originalIndex: number }[] = [];
    const seen = new Set<number>([selectedIndex]);
    for (let i = 1; i <= totalSlides && cards.length < sideCardCount; i++) {
      const idx = (selectedIndex + i) % totalSlides;
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
      <div className="md:hidden rounded-3xl p-4 overflow-hidden relative hero-mobile-gradient">
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(270,60%,55%)/0.3_0%,transparent_65%)] pointer-events-none" />
        <div className="relative z-10 flex justify-between items-center mb-3">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">{title}</h2>
          {showViewAll && <button onClick={onViewAll} className="text-sm font-medium text-white/70 hover:text-white transition-colors">View all</button>}
        </div>

        <div className="relative flex items-center justify-center py-2 carousel-perspective" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <div className="relative w-[160px] h-[240px]">
            {mobileDeck.map((movie, index) => {
              const offset = index - selectedIndex;
              const numSlides = mobileDeck.length;
              let adjustedOffset = offset;
              if (offset > numSlides / 2) adjustedOffset = offset - numSlides;
              if (offset < -numSlides / 2) adjustedOffset = offset + numSlides;
              const isSelected = index === selectedIndex;
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
                  className="absolute inset-0 cursor-pointer transition-all duration-500 ease-out preserve-3d dynamic-card"
                  style={{
                    "--tx": `${translateX}%`,
                    "--tz": `${translateZ}px`,
                    "--ry": `${rotateY}deg`,
                    "--scale": scale,
                    "--opacity": opacity,
                    "--zIndex": zIndex,
                  } as React.CSSProperties}
                  onClick={() => isSelected ? (onMovieClick ? onMovieClick(movie) : onPlay(movie)) : scrollTo(index)}
                >
                  <div className={cn("w-full h-full rounded-xl overflow-hidden shadow-2xl transition-shadow duration-500", isSelected && "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]")}>
                    <img
                      src={getImageUrl(movie.image_url)}
                      alt={movie.title}
                      className={cn("w-full h-full object-cover", isSelected && deviceProfile.allowAmbientEffects && "animate-ken-burns animate-10s")}
                      loading={index < 2 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                    <div className={cn("absolute inset-0 bg-gradient-to-t from-black/40 to-transparent transition-opacity duration-300", isSelected ? "opacity-0" : "opacity-50")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {currentMovie && (
            <div key={currentMovie.mobifliks_id} className="relative z-10 mt-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h3 className="text-lg font-display font-bold text-white tracking-tight drop-shadow-lg">{currentMovie.title}</h3>
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-md text-black bg-gradient-to-r from-[hsl(45,100%,55%)] to-[hsl(35,100%,50%)] shadow-[0_0_12px_hsl(45_100%_50%/0.3)]">
                  IMDB {getImdbRating(currentMovie)}
                </span>
              </div>
            </div>
        )}

        <div className="relative z-10 mt-3">
          <div className="flex flex-col items-center gap-2">
            <div className="flex justify-center gap-1.5">
              {mobileDeck.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={cn(
                    "transition-all duration-500 rounded-full",
                    index === selectedIndex
                      ? "w-4 h-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                      : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <div className="w-24 mx-auto h-0.5 rounded-full bg-white/20 overflow-hidden">
              {shouldAutoplay && (
                  <div
                    key={`mobile-progress-${selectedIndex}`}
                    className="hero-progress-bar-fill h-full bg-white rounded-full animate-progress"
                    style={{ "--duration": `${autoplayDelayMs}ms` } as React.CSSProperties}
                  />
              )}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes kenBurns {
            0% { transform: scale(1) translate(0, 0); }
            50% { transform: scale(1.08) translate(-1.5%, -1%); }
            100% { transform: scale(1) translate(0, 0); }
          }
          .animate-ken-burns {
            animation: kenBurns 12s ease-in-out infinite;
          }
        `}</style>
      </div >

      <div className="hidden md:block">
        <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden hero-cinematic-container">

          <div className="absolute inset-0 bg-[#0a0a0f]" />

          {backdropSrc && (
              <div key={`backdrop-${selectedIndex}`} className="absolute inset-0">
                <img
                  src={backdropSrc}
                  alt=""
                  className={cn("w-full h-full object-cover will-change-transform transition-transform duration-700", deviceProfile.allowAmbientEffects && "scale-102")}
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
          )}
          {!backdropSrc && (
              <div
                key={`backdrop-fallback-${selectedIndex}`}
                className="absolute inset-0 opacity-40 blur-[80px] pointer-events-none bg-cover bg-center"
                style={{ backgroundImage: `url(${getImageUrl(currentMovie.image_url)})` }}
              />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
          <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#0a0a0f]/80 via-black/40 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/20 to-transparent" />

          <div className="absolute inset-0 pointer-events-none hero-vignette" />

          <div className="relative z-10 h-full flex hero-cinematic-container">

            <div className="flex-1 flex flex-col justify-end p-6 lg:p-10 xl:p-14 pb-8 lg:pb-12">
                <div key={`info-${selectedIndex}`}>
                  <div className="flex items-end gap-4 lg:gap-6 mb-4 lg:mb-5">
                    <span
                      className="text-6xl lg:text-8xl xl:text-9xl font-black text-white/10 leading-none font-display select-none hero-info-track-number"
                    >
                      {String(selectedIndex + 1).padStart(2, "0")}
                    </span>
                    <div className="pb-1 lg:pb-2">
                      <h2 className="text-2xl lg:text-4xl xl:text-5xl font-display font-bold text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {currentMovie.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4 lg:mb-5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4 lg:w-5 lg:h-5",
                            i < getStarCount(currentMovie)
                              ? "text-amber-400 fill-amber-400"
                              : "text-white/20"
                          )}
                        />
                      ))}
                    </div>
                    <span className="px-3 py-1 text-xs font-bold rounded-md text-black bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                      IMDB {getImdbRating(currentMovie)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-5 lg:mb-7">
                    {currentMovie.genres && currentMovie.genres.length > 0 && (
                      <>
                        <span className="text-sm text-white/50 font-medium">Genre:</span>
                        {currentMovie.genres.slice(0, 3).map(genre => (
                          <span key={genre} className="text-sm text-white/80 font-medium">
                            {genre}
                          </span>
                        ))}
                      </>
                    )}
                    {currentMovie.year && (
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded bg-white/10 text-white/70 border border-white/10">
                        {currentMovie.year}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded bg-white/10 text-white/70 border border-white/10 uppercase">
                      {currentMovie.type === "series" ? "Series" : "Movie"}
                    </span>
                  </div>

                  {currentMovie.description && (
                    <p className="text-sm lg:text-base text-white/50 max-w-lg line-clamp-2 mb-6 lg:mb-8 leading-relaxed">
                      {currentMovie.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onMovieClick ? onMovieClick(currentMovie) : onPlay(currentMovie)}
                      data-testid="button-hero-play"
                      className="group flex items-center gap-2.5 px-6 py-3 lg:px-8 lg:py-3.5 rounded-full bg-white text-black font-semibold text-sm lg:text-base hover:bg-white/90 active:scale-95 transition-all duration-200 shadow-[0_4px_24px_rgba(255,255,255,0.15)]"
                    >
                      <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-current" />
                      Watch Now
                    </button>
                    <button
                      onClick={onViewAll}
                      data-testid="button-hero-more"
                      className="px-6 py-3 lg:px-8 lg:py-3.5 rounded-full bg-white/10 backdrop-blur-sm text-white font-medium text-sm lg:text-base border border-white/15 hover:bg-white/20 active:scale-95 transition-all duration-200"
                    >
                      More
                    </button>
                  </div>
                </div>

              <div className="flex items-center gap-3 mt-6 lg:mt-8">
                <button
                  onClick={scrollPrev}
                  data-testid="button-hero-prev"
                  className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white active:scale-90 transition-all duration-200"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={scrollNext}
                  data-testid="button-hero-next"
                  className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white active:scale-90 transition-all duration-200"
                  aria-label="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-1.5 ml-2">
                  {totalSlides <= 10
                    ? displayMovies.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => scrollTo(index)}
                        data-testid={`button-hero-dot-${index}`}
                        className={cn(
                          "rounded-full transition-all duration-500",
                          index === selectedIndex
                            ? "w-6 h-1.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                            : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))
                    : (() => {
                      const maxDots = 7;
                      const half = Math.floor(maxDots / 2);
                      let start = Math.max(0, selectedIndex - half);
                      let end = start + maxDots;
                      if (end > totalSlides) { end = totalSlides; start = Math.max(0, end - maxDots); }
                      const dots = [];
                      if (start > 0) dots.push(<span key="s" className="w-1 h-1 rounded-full bg-white/20" />);
                      for (let i = start; i < end; i++) {
                        dots.push(
                          <button
                            key={i}
                            onClick={() => scrollTo(i)}
                            data-testid={`button-hero-dot-${i}`}
                            className={cn(
                              "rounded-full transition-all duration-500",
                              i === selectedIndex
                                ? "w-6 h-1.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                                : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
                            )}
                            aria-label={`Go to slide ${i + 1}`}
                          />
                        );
                      }
                      if (end < totalSlides) dots.push(<span key="e" className="w-1 h-1 rounded-full bg-white/20" />);
                      return dots;
                    })()
                  }
                </div>
                <div className="ml-3 w-20 h-1 rounded-full bg-white/10 overflow-hidden">
                  {shouldAutoplay && (
                    <div
                      key={`desktop-progress-${selectedIndex}`}
                      className="hero-progress-bar-fill h-full rounded-full bg-gradient-to-r from-white/60 to-white/90"
                      style={{ "--duration": `${autoplayDelayMs}ms` } as React.CSSProperties}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-end pb-8 pr-6 xl:pr-10 min-w-[380px]">
                <div key={`cards-${selectedIndex}`} className="flex items-end gap-4 xl:gap-5">
                  {getSideCards().map(({ movie, originalIndex }, cardIdx) => (
                    <button
                      key={movie.mobifliks_id}
                      className="relative flex flex-col items-center cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl hover:-translate-y-1 hover:scale-105 active:scale-95 transition-transform duration-300"
                      style={{ transitionDelay: `${150 + cardIdx * 80}ms` }}
                      onClick={() => scrollTo(originalIndex)}
                      data-testid={`button-hero-side-card-${originalIndex}`}
                      aria-label={`Go to ${movie.title}`}
                    >
                      <div className="relative w-[100px] xl:w-[120px] aspect-[2/3] rounded-xl xl:rounded-2xl overflow-hidden border border-white/10 group-hover:border-white/25 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                        <img
                          src={getImageUrl(movie.image_url)}
                          alt={movie.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      </div>
                      <p className="mt-2.5 text-xs text-white/60 text-center font-medium max-w-[100px] xl:max-w-[120px] truncate group-hover:text-white/90 transition-colors">
                        {movie.title}
                      </p>
                    </button>
                  ))}
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
    </div >
  );
}
