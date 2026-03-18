import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

const pathToTab: Record<string, string> = {
  "/": "home",
  "/movies": "movies",
  "/series": "series",
  "/search": "search",
  "/originals": "originals",
};

const tabToPath: Record<string, string> = {
  home: "/",
  movies: "/movies",
  series: "/series",
  search: "/search",
  originals: "/originals",
};

export function Header({ activeTab: activeTabProp, onTabChange }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = activeTabProp ?? pathToTab[location.pathname] ?? "home";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 20);
      if (currentY > 80 && currentY > lastScrollY) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      lastScrollY = currentY;
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
          "sticky top-0 z-40 pb-4 transition-all duration-300",
          isScrolled && "bg-background/40 backdrop-blur-md",
          isHidden && "-translate-y-full"
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex-shrink-0"
            onClick={() => { navigate("/"); onTabChange?.("home"); }}
            data-testid="link-logo"
          >
            {!logoLoaded && (
              <Skeleton className="h-8 md:h-10 w-16 md:w-20 rounded" />
            )}
            <img 
              src={currentLogo} 
              alt="Logo" 
              width={104}
              height={32}
              className={cn(
                "h-8 md:h-10 w-auto transition-opacity duration-300",
                logoLoaded ? "opacity-100" : "opacity-0 absolute"
              )}
              fetchPriority="high"
              onLoad={() => setLogoLoaded(true)}
            />
          </Link>

          <nav className={cn(
            "hidden md:flex items-center gap-1 p-1.5 rounded-full border-beam",
            isDark 
              ? "bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]" 
              : ""
          )} style={!isDark ? { background: "#1c1c1e" } : undefined}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { navigate(tabToPath[item.id] || "/"); onTabChange?.(item.id); }}
                  data-testid={`button-nav-${item.id}`}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 press-effect",
                    isActive ? "text-black shadow-[0_2px_12px_rgba(200,245,71,0.3)]" : "text-[#6b6b6b] hover:text-white"
                  )}
                  style={isActive ? { background: "#c8f547" } : undefined}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => { navigate("/search"); onTabChange?.("search"); }}
              data-testid="button-nav-search"
              className={cn(
                "p-2 rounded-full transition-all duration-300",
                activeTab === "search" ? "text-black shadow-[0_2px_12px_rgba(200,245,71,0.3)]" : "text-[#6b6b6b] hover:text-white"
              )}
              style={activeTab === "search" ? { background: "#c8f547" } : undefined}
            >
              <Search className="w-5 h-5" />
            </button>
          </nav>

          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-full transition-all duration-300 press-effect hover:scale-110"
                style={{
                  background: isDark ? "#c8f547" : "#2c2c2e",
                  boxShadow: isDark ? "0 2px 12px rgba(200,245,71,0.3)" : "none",
                }}
                aria-label="Toggle theme"
                data-testid="button-theme-toggle"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-black" />
                ) : (
                  <Moon className="w-5 h-5 text-[#6b6b6b]" />
                )}
              </button>
            )}
            
            <Link to="/profile" className="hidden md:flex items-center gap-3 px-3 py-2 rounded-full glass-card-premium hover:bg-white/[0.04] transition-colors" data-testid="link-profile">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium text-foreground leading-tight">Profile</p>
                <p className="text-xs text-muted-foreground font-normal">Account</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>

        <div className="md:hidden mt-4 flex justify-center">
          <nav className={cn(
            "flex items-center gap-1 p-1.5 rounded-full",
            isDark 
              ? "bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]" 
              : ""
          )} style={!isDark ? { background: "#1c1c1e" } : undefined}>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { navigate(tabToPath[item.id] || "/"); onTabChange?.(item.id); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                    isActive ? "text-black shadow-[0_2px_8px_rgba(200,245,71,0.25)]" : "text-[#6b6b6b] hover:text-white"
                  )}
                  style={isActive ? { background: "#c8f547" } : undefined}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={() => { navigate("/search"); onTabChange?.("search"); }}
              className={cn(
                "p-1.5 rounded-full transition-all duration-300",
                activeTab === "search" ? "text-black shadow-[0_2px_8px_rgba(200,245,71,0.25)]" : "text-[#6b6b6b] hover:text-white"
              )}
              style={activeTab === "search" ? { background: "#c8f547" } : undefined}
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
