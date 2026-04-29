import * as React from "react";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";
import { getImageUrl, getOptimizedBackdropUrl } from "@/lib/api";
import { Star, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";
import { motion, AnimatePresence } from "framer-motion";

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
  const safeMovies = React.useMemo(
    () => movies.filter((movie): movie is Movie => Boolean(movie?.mobifliks_id)),
    [movies]
  );
  const totalSlides = Math.min(
    safeMovies.length,
    deviceProfile.isWeakDevice ? (deviceProfile.isMobile ? 6 : 12) : 25
  );
  const displayMovies = React.useMemo(() => safeMovies.slice(0, totalSlides), [safeMovies, totalSlides]);
  const mobileDeck = displayMovies;
  const activeIndex = totalSlides > 0 ? Math.min(selectedIndex, totalSlides - 1) : 0;
  const transitionDuration = deviceProfile.allowComplexAnimations ? 1300 : 650;
  const autoplayDelayMs = deviceProfile.autoplayDelayMs;
  const sideCardCount = deviceProfile.isWeakDevice ? 2 : 3;
  const shouldAutoplay = totalSlides > 1;


  const scrollTo = React.useCallback((index: number) => {
    if (isTransitioning || totalSlides === 0) return;
    setIsTransitioning(true);
    setSelectedIndex(Math.max(0, Math.min(index, totalSlides - 1)));
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  }, [isTransitioning, totalSlides, transitionDuration]);

  const scrollPrev = React.useCallback(() => {
    if (isTransitioning || totalSlides === 0) return;
    setIsTransitioning(true);
    setSelectedIndex(prev => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsTransitioning(false), transitionDuration);
  }, [totalSlides, isTransitioning, transitionDuration]);

  const scrollNext = React.useCallback(() => {
    if (isTransitioning || totalSlides === 0) return;
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

  const getImdbRating = (movie: Movie) => {
    const hash = (movie.mobifliks_id || movie.title || "movie").split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return (5 + Math.abs(hash) % 40 / 10).toFixed(1);
  };

  const getStarCount = (movie: Movie) => {
    const rating = parseFloat(getImdbRating(movie));
    return Math.round(rating / 2);
  };
  const allowHeroMotion = deviceProfile.allowComplexAnimations && !deviceProfile.prefersReducedMotion;

  if (!displayMovies.length) {
    return <div className="overflow-hidden relative" aria-hidden="true">
      <div className="md:hidden rounded-3xl p-4 overflow-hidden relative hero-mobile-gradient min-h-[350px]">
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
      <div className="md:hidden rounded-3xl p-4 overflow-hidden relative hero-mobile-gradient">
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(270,60%,55%)/0.3_0%,transparent_65%)] pointer-events-none" />
        <div className="relative z-10 flex justify-between items-center mb-3">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">{title}</h2>
          {showViewAll && <button onClick={onViewAll} className="text-sm font-medium text-white/70 hover:text-white transition-colors">View all</button>}
        </div>

        <div className="relative flex items-center justify-center py-2 carousel-perspective" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
                  className="absolute inset-0 cursor-pointer transition-all duration-500 ease-out preserve-3d dynamic-card"
                  style={{
                    transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity: opacity,
                    zIndex: zIndex,
                  } as React.CSSProperties}
                  onClick={() => isSelected ? (onMovieClick ? onMovieClick(movie) : onPlay(movie)) : scrollTo(index)}
                >
                  <div className={cn("w-full h-full rounded-xl overflow-hidden shadow-2xl transition-shadow duration-500", isSelected && "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]")}>
                    <img
                      src={getImageUrl(movie.image_url)}
                      alt={movie.title}
                      className={cn("w-full h-full object-cover", isSelected && deviceProfile.allowAmbientEffects && "animate-ken-burns animate-10s")}
                      loading={index < 2 ? "eager" : "lazy"}
                      fetchpriority={index === 0 ? "high" : "auto"}
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
              <div className="flex flex-col items-center justify-center gap-3 mb-2 px-4">
                {currentMovie.logo_url ? (
                  <img
                    src={currentMovie.logo_url}
                    alt={currentMovie.title}
                    className="h-10 w-auto max-w-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    loading="eager"
                  />
                ) : (
                  <h3 className="text-lg font-display font-bold text-white tracking-tight drop-shadow-lg line-clamp-1">{currentMovie.title}</h3>
                )}
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
                    index === activeIndex
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
                    key={`mobile-progress-${activeIndex}`}
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
          
          @keyframes waterRipple {
            0% {
              clip-path: circle(0% at 50% 50%);
              filter: url(#water-distortion-${activeIndex}) blur(15px);
              transform: scale(1.1);
            }
            100% {
              clip-path: circle(150% at 50% 50%);
              filter: url(#water-distortion-${activeIndex}) blur(0px);
              transform: scale(1);
            }
          }
          
          @keyframes rippleDisplacement {
            0% { stop-color: rgba(255,255,255,0.5); }
            100% { stop-color: rgba(255,255,255,0); }
          }
          
          @keyframes waveScale {
            0% { transform: scale(0); opacity: 0.8; }
            100% { transform: scale(5); opacity: 0; }
          }
          
          .animate-water-ripple {
            animation: waterRipple 2s cubic-bezier(0.1, 0, 0.2, 1) forwards;
          }
          
          .ripple-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            border-radius: 50%;
            border: 1.5px solid rgba(255, 255, 255, 0.3);
            pointer-events: none;
            z-index: 5;
            transform-origin: center;
          }
          
          .animate-ripple-ring-1 {
            width: 100px; height: 100px;
            animation: waveScale 1.8s cubic-bezier(0.1, 0, 0.2, 1) forwards;
          }
          .animate-ripple-ring-2 {
            width: 100px; height: 100px;
            animation: waveScale 1.8s cubic-bezier(0.1, 0, 0.2, 1) 0.3s forwards;
          }
          .animate-ripple-ring-3 {
            width: 100px; height: 100px;
            animation: waveScale 1.8s cubic-bezier(0.1, 0, 0.2, 1) 0.6s forwards;
          }
        `}</style>
      </div >

      <div className="hidden md:block">
        <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden hero-cinematic-container">

          <div className="absolute inset-0 bg-[#0a0a0f]" />

          <AnimatePresence mode="popLayout" initial={false}>
            {backdropSrc && (
              <motion.div
                key={`backdrop-${activeIndex}`}
                initial={allowHeroMotion ? { opacity: 0, scale: 1.03 } : false}
                animate={{ opacity: 1, scale: 1 }}
                exit={allowHeroMotion ? { opacity: 0 } : undefined}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <motion.img
                  src={backdropSrc}
                  alt=""
                  initial={{ scale: 1 }}
                  animate={allowHeroMotion && deviceProfile.allowAmbientEffects && !deviceProfile.isMobile ? {
                    scale: [1, 1.15, 1],
                    x: [0, -20, 0],
                    y: [0, -10, 0]
                  } : {}}
                  transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={cn(
                    "w-full h-full object-cover",
                    allowHeroMotion && "will-change-transform"
                  )}
                  loading="eager"
                  fetchpriority="high"
                />
              </motion.div>
            )}
            {!backdropSrc && (
              <motion.div
                key={`backdrop-fallback-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 blur-[80px] pointer-events-none bg-cover bg-center"
                style={{ backgroundImage: `url(${getImageUrl(currentMovie.image_url)})` }}
              />
            )}
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
          <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#0a0a0f]/80 via-black/40 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-1/4 bg-gradient-to-b from-black/20 to-transparent" />

          <div className="absolute inset-0 pointer-events-none hero-vignette" />

          <div className="relative z-10 h-full flex hero-cinematic-container">

            <div className="flex-1 flex flex-col justify-end p-6 lg:p-10 xl:p-14 pb-8 lg:pb-12">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div 
                    key={`info-${activeIndex}`}
                    initial={allowHeroMotion ? "hidden" : false}
                    animate="visible"
                    exit={allowHeroMotion ? "exit" : undefined}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { 
                        opacity: 1,
                        transition: { 
                          staggerChildren: 0.04
                        } 
                      },
                      exit: { opacity: 0, transition: { duration: 0.18 } }
                    }}
                  >
                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.95 },
                        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } }
                      }}
                      className="flex items-end gap-4 lg:gap-6 mb-4 lg:mb-5"
                    >
                      <span
                        className="text-6xl lg:text-8xl xl:text-9xl font-black text-white/10 leading-none font-display select-none hero-info-track-number"
                      >
                        {String(activeIndex + 1).padStart(2, "0")}
                      </span>
                      <div className="pb-1 lg:pb-2">
                        {currentMovie.logo_url ? (
                          <motion.img
                            src={currentMovie.logo_url}
                            alt={currentMovie.title}
                            animate={allowHeroMotion && deviceProfile.allowAmbientEffects ? {
                              y: [0, -8, 0],
                              rotate: [0, 1, 0, -1, 0]
                            } : {}}
                            transition={{
                              duration: 6,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className="h-16 lg:h-24 xl:h-28 w-auto max-w-[400px] object-contain object-left drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
                            loading="eager"
                          />
                        ) : (
                          <h2 className="text-2xl lg:text-4xl xl:text-5xl font-display font-bold text-white leading-tight tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                            {currentMovie.title}
                          </h2>
                        )}
                      </div>
                    </motion.div>

                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0, transition: { duration: 0.18 } }
                      }}
                      className="flex items-center gap-3 mb-4 lg:mb-5"
                    >
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
                    </motion.div>

                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, x: -20 },
                        visible: { opacity: 1, x: 0, transition: { duration: 0.18 } }
                      }}
                      className="flex flex-wrap items-center gap-2 mb-5 lg:mb-7"
                    >
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
                    </motion.div>

                    {currentMovie.description && (
                      <motion.p 
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.18 } }
                        }}
                        className="text-sm lg:text-base text-white/50 max-w-lg line-clamp-2 mb-6 lg:mb-8 leading-relaxed"
                      >
                        {currentMovie.description}
                      </motion.p>
                    )}

                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
                      }}
                      className="flex items-center gap-3"
                    >
                      <button
                        onClick={() => onMovieClick ? onMovieClick(currentMovie) : onPlay(currentMovie)}
                        data-testid="button-hero-play"
                        className="btn-premium-red group flex items-center gap-2.5 px-6 py-3 lg:px-8 lg:py-3.5 rounded-full text-white font-semibold text-sm lg:text-base"
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
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

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
                          index === activeIndex
                            ? "w-6 h-1.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                            : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))
                    : (() => {
                      const maxDots = 7;
                      const half = Math.floor(maxDots / 2);
                      let start = Math.max(0, activeIndex - half);
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
                              i === activeIndex
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
                      key={`desktop-progress-${activeIndex}`}
                      className="hero-progress-bar-fill h-full rounded-full bg-gradient-to-r from-white/60 to-white/90"
                      style={{ "--duration": `${autoplayDelayMs}ms` } as React.CSSProperties}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-end pb-8 pr-6 xl:pr-10 min-w-[380px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div 
                    key={`cards-${activeIndex}`} 
                    className="flex items-end gap-4 xl:gap-5"
                    initial={allowHeroMotion ? "hidden" : false}
                    animate="visible"
                    exit={allowHeroMotion ? "exit" : undefined}
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
                      exit: { opacity: 0, transition: { duration: 0.16 } }
                    }}
                  >
                    {getSideCards().map(({ movie, originalIndex }, cardIdx) => (
                      <motion.button
                        key={movie.mobifliks_id}
                        variants={{
                          hidden: { opacity: 0, x: 20, scale: 0.9 },
                          visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }
                        }}
                        className="relative flex flex-col items-center cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl hover:-translate-y-2 transition-all duration-300"
                        onClick={() => scrollTo(originalIndex)}
                        data-testid={`button-hero-side-card-${originalIndex}`}
                        aria-label={`Go to ${movie.title}`}
                      >
                        <div className="relative w-[100px] xl:w-[120px] aspect-[2/3] rounded-xl xl:rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-hover:shadow-[0_12px_48px_rgba(239,68,68,0.3)]">
                          <img
                            src={getImageUrl(movie.image_url)}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-115"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        </div>
                        <p className="mt-2.5 text-[10px] xl:text-xs text-white/40 text-center font-bold uppercase tracking-widest max-w-[100px] xl:max-w-[120px] truncate group-hover:text-primary transition-colors">
                          {movie.title}
                        </p>
                      </motion.button>
                    ))}
                  </motion.div>
                </AnimatePresence>
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
      {/* Hidden SVG Filter for Realistic Liquid "Shuffle" Effect */}
      <svg className="absolute w-0 h-0 invisible pointer-events-none" aria-hidden="true">
        <filter id={`water-distortion-${activeIndex}`} key={activeIndex} x="-20%" y="-20%" width="140%" height="140%">
          {/* Base Turbulence for the "Ripple" waves */}
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.015" numOctaves="3" result="noise">
            <animate attributeName="baseFrequency" values="0.01 0.015; 0.015 0.01; 0.01 0.015" dur="10s" repeatCount="indefinite" />
          </feTurbulence>
          
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" values="0;120;0" dur="1.8s" keyTimes="0; 0.5; 1" />
          </feDisplacementMap>
          
          <feGaussianBlur stdDeviation="0">
            <animate attributeName="stdDeviation" values="0;12;0" dur="1.8s" keyTimes="0; 0.5; 1" />
          </feGaussianBlur>
        </filter>
      </svg>
    </div >
  );
}
