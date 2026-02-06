import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, ChevronDown, User, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import logoLight from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";

interface HeaderProps {
  onSearch: (query: string) => void;
  onMovieSelect: (movie: any) => void;
  popularSearches?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function Header({ activeTab = "home", onTabChange }: HeaderProps) {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { id: "movies", label: "Movie" },
    { id: "series", label: "Series" },
    { id: "originals", label: "Originals" },
  ];

  const isDark = resolvedTheme === "dark";
  const currentLogo = isDark ? logoDark : logoLight;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <>
      {/* Gradient fade overlay - creates smooth blur effect for content scrolling up */}
      <div 
        className="fixed top-0 left-0 right-0 pointer-events-none z-30"
        style={{
          height: "calc(7rem + env(safe-area-inset-top))",
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 30%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.1) 75%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
        }}
      />
      <header 
        className={cn(
          "sticky top-0 z-40 pb-4 transition-all duration-500 relative overflow-hidden",
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        {/* Liquid glass background layers */}
        <div className="absolute inset-0 z-0">
          <div 
            className="absolute inset-0 backdrop-blur-2xl"
            style={{
              background: isScrolled 
                ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)'
                : 'transparent',
              borderBottom: isScrolled ? '1px solid rgba(255,255,255,0.1)' : 'none',
              boxShadow: isScrolled 
                ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                : 'none',
              transition: 'all 0.5s ease',
            }}
          />
          {/* Top highlight reflection */}
          {isScrolled && (
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}
          {/* Subtle animated glass blobs */}
          <div 
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#4ade80]/8 blur-3xl transition-opacity duration-700"
            style={{
              opacity: isScrolled ? 1 : 0,
              animation: "liquidFloat 8s ease-in-out infinite",
            }}
          />
          <div 
            className="absolute -top-5 -left-10 w-32 h-32 rounded-full bg-white/5 blur-3xl transition-opacity duration-700"
            style={{
              opacity: isScrolled ? 1 : 0,
              animation: "liquidFloat 10s ease-in-out infinite reverse",
            }}
          />
        </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex-shrink-0"
            onClick={() => onTabChange?.("home")}
          >
            {!logoLoaded && (
              <Skeleton className="h-8 md:h-10 w-16 md:w-20 rounded" />
            )}
            <img 
              src={currentLogo} 
              alt="SJ" 
              className={cn(
                "h-8 md:h-10 w-auto transition-opacity duration-300",
                logoLoaded ? "opacity-100" : "opacity-0 absolute"
              )}
              loading="lazy"
              onLoad={() => setLogoLoaded(true)}
            />
          </Link>

          {/* Center - Pill Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-full" style={{ background: "#1c1c1e" }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    isActive ? "text-black" : "text-[#6b6b6b] hover:text-white"
                  )}
                  style={isActive ? { background: "#4ade80" } : undefined}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => onTabChange?.("search")}
              className={cn(
                "p-2 rounded-full transition-all duration-300",
                activeTab === "search" ? "text-black" : "text-[#6b6b6b] hover:text-white"
              )}
              style={activeTab === "search" ? { background: "#4ade80" } : undefined}
            >
              <Search className="w-5 h-5" />
            </button>
          </nav>

          {/* Right - Theme toggle and User profile */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full transition-all duration-300"
                style={{
                  background: isDark ? "#4ade80" : "#2c2c2e",
                }}
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-black" />
                ) : (
                  <Moon className="w-5 h-5 text-[#6b6b6b]" />
                )}
              </button>
            )}
            
            <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20">
              <div className="w-8 h-8 rounded-full bg-[#4ade80]/20 flex items-center justify-center">
                <User className="w-4 h-4 text-[#4ade80]" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-white leading-tight">Guest</p>
                <p className="text-xs text-white/60 font-normal">Free</p>
              </div>
              <ChevronDown className="w-4 h-4 text-white/60" />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4 flex justify-center">
          <nav className="flex items-center gap-1 p-1.5 rounded-full" style={{ background: "#1c1c1e" }}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                    isActive ? "text-black" : "text-[#6b6b6b] hover:text-white"
                  )}
                  style={isActive ? { background: "#4ade80" } : undefined}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => onTabChange?.("search")}
              className={cn(
                "p-1.5 rounded-full transition-all duration-300",
                activeTab === "search" ? "text-black" : "text-[#6b6b6b] hover:text-white"
              )}
              style={activeTab === "search" ? { background: "#4ade80" } : undefined}
            >
              <Search className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </header>

    {/* Liquid glass animation keyframes */}
    <style>{`
      @keyframes liquidFloat {
        0%, 100% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(10px, -15px) scale(1.05); }
        50% { transform: translate(-5px, 10px) scale(0.95); }
        75% { transform: translate(-15px, -5px) scale(1.02); }
      }
    `}</style>
    </>
  );
}
