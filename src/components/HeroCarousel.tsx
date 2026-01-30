import * as React from "react";
import { cn } from "@/lib/utils";
import type { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/api";
interface HeroCarouselProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  title?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}
export function HeroCarousel({
  movies,
  onPlay,
  title = "Top Movies",
  showViewAll = true,
  onViewAll
}: HeroCarouselProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const totalSlides = Math.min(movies.length, 8);

  // Trigger load animation
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);
  const scrollTo = React.useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedIndex(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);
  const scrollPrev = React.useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedIndex(prev => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [totalSlides, isTransitioning]);
  const scrollNext = React.useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setSelectedIndex(prev => (prev + 1) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [totalSlides, isTransitioning]);

  // Auto-advance every 3 seconds
  React.useEffect(() => {
    if (totalSlides <= 1) return;
    const timer = setInterval(() => {
      scrollNext();
    }, 3000);
    return () => clearInterval(timer);
  }, [scrollNext, totalSlides]);

  // Touch/swipe handling
  const touchStartX = React.useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) scrollNext();else scrollPrev();
    }
  };

  // Generate random IMDB rating for demo (between 5.0 and 9.0)
  const getImdbRating = (movie: Movie) => {
    const hash = movie.mobifliks_id.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return (5 + Math.abs(hash) % 40 / 10).toFixed(1);
  };
  if (!movies.length) {
    return <div className="rounded-3xl bg-[hsl(265,70%,25%)] p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-7 w-32 bg-white/10 rounded shimmer" />
          <div className="h-5 w-16 bg-white/10 rounded shimmer" />
        </div>
        <div className="flex justify-center gap-4">
          <div className="w-40 h-56 bg-white/10 rounded-2xl shimmer" />
        </div>
      </div>;
  }
  const currentMovie = movies[selectedIndex];

  // Desktop layout - get exactly 5 visible cards (2 left + center + 2 right)
  const getDesktopCards = () => {
    const cards: {
      movie: Movie;
      position: number;
      originalIndex: number;
    }[] = [];
    const numSlides = Math.min(movies.length, 8);
    for (let i = -2; i <= 2; i++) {
      let index = selectedIndex + i;
      if (index < 0) index = numSlides + index;
      if (index >= numSlides) index = index - numSlides;
      if (index >= 0 && index < numSlides) {
        cards.push({
          movie: movies[index],
          position: i,
          originalIndex: index
        });
      }
    }
    // Sort by position so center renders last (on top)
    return cards.sort((a, b) => Math.abs(b.position) - Math.abs(a.position));
  };

  // 3D STACKED HERO - Matching reference: wide spread, dramatic angles
  // CINEMATIC ANIMATIONS: slow, smooth, premium motion
  const getCardStyles = (position: number, isAnimating: boolean = false) => {
    const isCenter = position === 0;
    const absPos = Math.abs(position);
    const sign = position > 0 ? 1 : -1;

    // CENTER CARD: Forward, largest, facing straight - SUBTLE SCALE UP (1.05x)
    if (isCenter) {
      return {
        translateX: 0,
        translateZ: 150,
        // Pushed more forward for depth
        rotateY: 0,
        scale: 1.05,
        // Cinematic scale-up effect
        opacity: 1,
        brightness: 1,
        zIndex: 100
      };
    }
    // FIRST SIDE CARDS (nearest): Angled inward, drifting backward
    else if (absPos === 1) {
      return {
        translateX: sign * 230,
        // Wide spread like reference
        translateZ: 10,
        // Drifted backward in perspective
        rotateY: sign * -18,
        // Negative = facing toward center
        scale: 0.88,
        // Slightly smaller for depth contrast
        opacity: 1,
        brightness: 0.85,
        zIndex: 80
      };
    }
    // FAR SIDE CARDS: More dramatic angle, further back in stack
    else {
      return {
        translateX: sign * 420,
        // Very wide spread
        translateZ: -80,
        // Further back in perspective
        rotateY: sign * -25,
        // More dramatic inward angle
        scale: 0.78,
        opacity: 0.92,
        brightness: 0.7,
        zIndex: 60
      };
    }
  };
  return <div className="rounded-3xl bg-[hsl(265,70%,25%)] p-4 md:p-8 lg:p-10 overflow-hidden relative">
      {/* ===== DESKTOP AMBIENT LIGHTING & ATMOSPHERE ===== */}
      {/* Primary spotlight glow behind center card */}
      <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(270,60%,55%)/0.35_0%,transparent_65%)] pointer-events-none" />
      
      {/* Floating ambient orbs */}
      <div className="hidden md:block absolute top-10 left-[15%] w-64 h-64 bg-[hsl(280,60%,50%)/0.12] rounded-full blur-[80px] pointer-events-none" style={{
      animation: 'floatSlow 10s ease-in-out infinite'
    }} />
      <div className="hidden md:block absolute bottom-10 right-[15%] w-56 h-56 bg-[hsl(260,70%,60%)/0.1] rounded-full blur-[70px] pointer-events-none" style={{
      animation: 'floatSlow 12s ease-in-out infinite reverse'
    }} />
      
      {/* Cinematic vignette overlay */}
      <div className="hidden md:block absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(265,70%,12%)/0.7_100%)] pointer-events-none rounded-3xl" />
      
      {/* Subtle noise texture */}
      <div className="hidden md:block absolute inset-0 opacity-[0.025] pointer-events-none rounded-3xl" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
    }} />
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-center mb-4 md:mb-8 lg:mb-10">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-white tracking-tight">
          {title}
        </h2>
        {showViewAll && <button onClick={onViewAll} className="text-sm md:text-base font-medium text-white/70 hover:text-white transition-colors">
            View all
          </button>}
      </div>

      {/* ===== MOBILE CAROUSEL - UNCHANGED ===== */}
      <div className="md:hidden relative flex items-center justify-center py-2" style={{
      perspective: "1200px"
    }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="relative w-[160px] h-[240px]">
          {movies.slice(0, 8).map((movie, index) => {
          const offset = index - selectedIndex;
          const numSlides = Math.min(movies.length, 8);
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
          return <div key={movie.mobifliks_id} className="absolute inset-0 cursor-pointer transition-all duration-500 ease-out" style={{
            transform: `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
            opacity,
            zIndex,
            transformStyle: "preserve-3d"
          }} onClick={() => isSelected ? onPlay(movie) : scrollTo(index)}>
                <div className={cn("w-full h-full rounded-xl overflow-hidden shadow-2xl transition-shadow duration-500", isSelected && "shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)]")}>
                  <img src={getImageUrl(movie.image_url)} alt={movie.title} className="w-full h-full object-cover" loading={index < 3 ? "eager" : "lazy"} />
                  <div className={cn("absolute inset-0 bg-gradient-to-t from-black/40 to-transparent transition-opacity duration-300", isSelected ? "opacity-0" : "opacity-50")} />
                </div>
              </div>;
        })}
        </div>
      </div>

      {/* ===== DESKTOP/TABLET 3D STACKED HERO - CINEMATIC ANIMATIONS ===== */}
      <div className="hidden md:block relative py-4 lg:py-6" style={{
      perspective: "1200px",
      perspectiveOrigin: "50% 55%"
    }}>
        {/* Background glow with PARALLAX - shifts subtly based on selection */}
        <div className="absolute top-1/2 left-1/2 w-[350px] lg:w-[450px] h-[450px] lg:h-[550px] pointer-events-none" style={{
        opacity: isLoaded ? 0.85 : 0,
        background: 'radial-gradient(ellipse at center, hsl(270,65%,55%) 0%, hsl(265,60%,35%) 35%, transparent 65%)',
        filter: 'blur(55px)',
        // Subtle parallax: background shifts opposite to card movement
        transform: `translate(calc(-50% + ${selectedIndex * -3}px), calc(-50% + ${Math.sin(selectedIndex * 0.5) * 2}px))`,
        transition: 'opacity 1.2s ease-out, transform 1s cubic-bezier(0.4, 0, 0.2, 1)'
      }} />
        
        {/* Secondary ambient glow for depth */}
        <div className="absolute top-1/2 left-1/2 w-[500px] lg:w-[600px] h-[350px] lg:h-[400px] pointer-events-none" style={{
        opacity: isLoaded ? 0.4 : 0,
        background: 'radial-gradient(ellipse at center, hsl(280,50%,45%) 0%, transparent 60%)',
        filter: 'blur(80px)',
        transform: `translate(calc(-50% + ${selectedIndex * 5}px), calc(-50% + 20px))`,
        transition: 'opacity 1.5s ease-out, transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }} />
        
        {/* 3D Stage */}
        <div className="relative flex items-end justify-center min-h-[380px] lg:min-h-[480px] pb-2" style={{
        transformStyle: 'preserve-3d'
      }}>
          {getDesktopCards().map(({
          movie,
          position,
          originalIndex
        }) => {
          const isCenter = position === 0;
          const styles = getCardStyles(position, isTransitioning);
          return <div key={movie.mobifliks_id} className="absolute cursor-pointer" style={{
            transform: isLoaded ? `translateX(${styles.translateX}px) translateZ(${styles.translateZ}px) rotateY(${styles.rotateY}deg) scale(${styles.scale})` : `translateX(${styles.translateX}px) translateY(60px) translateZ(${styles.translateZ - 100}px) rotateY(${styles.rotateY + (position > 0 ? 10 : -10)}deg) scale(${styles.scale * 0.8})`,
            opacity: isLoaded ? styles.opacity : 0,
            zIndex: styles.zIndex,
            transformStyle: "preserve-3d",
            filter: `brightness(${styles.brightness})`,
            // CINEMATIC TIMING: 800ms ease-in-out for smooth, slow transitions
            transition: `transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s ease-out, filter 0.8s ease-in-out`,
            bottom: '0'
          }} onClick={() => isCenter ? onPlay(movie) : scrollTo(originalIndex)}>
                {/* Card */}
                <div className="relative w-[160px] lg:w-[220px] h-[240px] lg:h-[330px] rounded-xl lg:rounded-2xl overflow-hidden" style={{
              boxShadow: isCenter ? '0 35px 70px -20px rgba(0,0,0,0.7), 0 0 50px -10px rgba(139,92,246,0.4)' : `${position * 10}px 25px 50px -15px rgba(0,0,0,0.55)`,
              transition: 'box-shadow 0.7s ease'
            }}>
                  {/* Movie poster */}
                  <img src={getImageUrl(movie.image_url)} alt={movie.title} className={cn("w-full h-full object-cover transition-transform duration-500", isCenter && "hover:scale-[1.02]")} loading={Math.abs(position) < 2 ? "eager" : "lazy"} />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0" style={{
                background: isCenter ? 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 35%, transparent 100%)' : 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)'
              }} />

                  {/* Content type badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-black/60 text-white border border-white/20 backdrop-blur">
                      {movie.type === "series" ? "SERIES" : "MOVIE"}
                    </span>
                  </div>
                  
                  {/* Glow ring for center */}
                  {isCenter && <div className="absolute inset-0 rounded-xl lg:rounded-2xl ring-1 ring-white/15 ring-inset pointer-events-none" />}
                </div>
                
                {/* Genre pills BELOW each card */}
                {movie.genres && movie.genres.length > 0 && <div className="flex gap-1.5 lg:gap-2 justify-center mt-3 lg:mt-4">
                    {movie.genres.slice(0, 3).map(genre => <span key={genre} className="px-2.5 lg:px-3.5 py-1 lg:py-1.5 text-[10px] lg:text-xs font-medium rounded-full bg-white/10 backdrop-blur-sm text-white/90 border border-white/20">
                        {genre}
                      </span>)}
                  </div>}
              </div>;
        })}
        </div>
        
        {/* Navigation arrows for desktop */}
        <button onClick={scrollPrev} className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all duration-300 z-30" aria-label="Previous movie">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={scrollNext} className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all duration-300 z-30" aria-label="Next movie">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Movie Info - Enhanced for desktop */}
      {currentMovie && <div className="relative z-10 mt-4 md:mt-6 text-center" key={currentMovie.mobifliks_id}>
          {/* Title and rating with parallax effect */}
          <div className="flex items-center justify-center gap-3 md:gap-4 mb-3 md:mb-4" style={{
        transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
        opacity: isLoaded ? 1 : 0,
        transition: 'all 0.6s ease-out 0.2s'
      }}>
            <h3 className="text-lg md:text-2xl lg:text-3xl font-display font-bold text-white tracking-tight drop-shadow-lg">
              {currentMovie.title}
            </h3>
            <span className="px-3 md:px-5 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-md text-black shadow-[0_0_30px_rgba(250,204,21,0.5),0_4px_15px_rgba(0,0,0,0.3)] bg-[hsl(50,100%,50%)]" style={{
          animation: 'float 3s ease-in-out infinite',
          transform: 'translateY(-2px)'
        }}>
              VIEWS {getImdbRating(currentMovie)}
            </span>
          </div>

          {/* Genre pills - shown on mobile, hidden on desktop (already on cards) */}
          <div className="md:hidden">
          </div>
        </div>}

      {/* Dot Indicators - Enhanced */}
      <div className="relative z-10 flex justify-center gap-2 md:gap-3 mt-4 md:mt-8" style={{
      transform: isLoaded ? 'translateY(0)' : 'translateY(10px)',
      opacity: isLoaded ? 1 : 0,
      transition: 'all 0.6s ease-out 0.4s'
    }}>
        {movies.slice(0, 8).map((_, index) => <button key={index} onClick={() => scrollTo(index)} className={cn("transition-all duration-500 rounded-full", index === selectedIndex ? "w-6 md:w-10 h-2 md:h-2.5 bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "w-2 md:w-2.5 h-2 md:h-2.5 bg-white/30 hover:bg-white/50")} aria-label={`Go to slide ${index + 1}`} />)}
      </div>
      
      {/* CSS Keyframes for cinematic animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-3px) translateX(1px); }
        }
        @keyframes cinematicPulse {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.4; transform: translate(-50%, -50%) scale(1.02); }
        }
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
    </div>;
}
