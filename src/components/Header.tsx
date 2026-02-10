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
          background: 'linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 30%, hsl(var(--background) / 0.7) 50%, hsl(var(--background) / 0.3) 75%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
        }}
      />
      <header 
        className={cn(
          "sticky top-0 z-40 pb-4 transition-all duration-500",
          isScrolled && "bg-background/40 backdrop-blur-md"
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
      <div className="container mx-auto px-4">
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
          <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">
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
            
            <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-full bg-card/60 backdrop-blur border border-border/40">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-foreground leading-tight">Guest</p>
                <p className="text-xs text-muted-foreground font-normal">Free</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4 flex justify-center">
          <nav className="flex items-center gap-1 p-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]">
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
    </>
  );
}
