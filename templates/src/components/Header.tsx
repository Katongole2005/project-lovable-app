import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, User, ChevronDown, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import logoLight from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onMovieSelect?: (movie: unknown) => void;
  popularSearches?: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const navItems = [
  { id: "movies", label: "Movie", path: "/movies" },
  { id: "series", label: "Series", path: "/series" },
  { id: "originals", label: "Originals", path: "/originals" },
];

export function Header({ activeTab, onTabChange }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      setIsScrolled(currentScrollY > 20);

      if (currentScrollY <= 12) {
        setIsHeaderVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (scrollDelta > 6 && currentScrollY > 96) {
        setIsHeaderVisible(false);
      } else if (scrollDelta < -6) {
        setIsHeaderVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentTab = useMemo(() => {
    if (activeTab) {
      return activeTab;
    }

    if (location.pathname === "/") return "home";
    if (location.pathname === "/series") return "series";
    if (location.pathname === "/originals") return "originals";
    if (location.pathname === "/search") return "search";
    if (location.pathname === "/profile") return "profile";
    return "movies";
  }, [activeTab, location.pathname]);

  const isDark = resolvedTheme === "dark";
  const currentLogo = isDark ? logoDark : logoLight;
  const playButtonSurfaceClass =
    "border border-white/10 bg-[linear-gradient(135deg,#ff8a3d_0%,#ff5b2e_52%,#ff4d6d_100%)] text-white shadow-[0_10px_26px_rgba(255,91,46,0.24),0_0_22px_rgba(255,138,61,0.18)]";

  const handleTabNavigation = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
      return;
    }

    const fallbackPath: Record<string, string> = {
      home: "/",
      movies: "/movies",
      series: "/series",
      originals: "/originals",
      search: "/search",
      profile: "/profile",
    };

    navigate(fallbackPath[tab] ?? "/");
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <>
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-30 pointer-events-none transition-transform duration-300 ease-out",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        )}
        style={{
          height: "calc(7rem + env(safe-area-inset-top))",
          background:
            "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 30%, hsl(var(--background) / 0.7) 50%, hsl(var(--background) / 0.3) 75%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
        }}
      />

      <header
        className={cn(
          "sticky top-0 z-40 pb-4 transition-all duration-300 ease-out will-change-transform",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full",
          isScrolled && "bg-background/40 backdrop-blur-md"
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="flex-shrink-0"
              onClick={() => handleTabNavigation("home")}
              data-testid="link-logo"
            >
              <img
                src={currentLogo}
                alt="MovieBay"
                className="h-8 w-auto md:h-10"
                loading="lazy"
              />
            </Link>

            <nav className="hidden md:flex pill-nav">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabNavigation(item.id)}
                  className={cn("pill-nav-item", currentTab === item.id && "active")}
                  data-testid={`button-nav-${item.id}`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => handleTabNavigation("search")}
                className={cn(
                  "rounded-full p-2 transition-all duration-300",
                  currentTab === "search"
                    ? playButtonSurfaceClass
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Search"
                title="Search"
                data-testid="button-nav-search"
              >
                <Search className="h-5 w-5" />
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "rounded-full p-2.5 backdrop-blur transition-all duration-300 hover:bg-card",
                    isDark
                      ? playButtonSurfaceClass
                      : "border border-border/40 bg-card/60 text-foreground"
                  )}
                  aria-label="Toggle theme"
                  data-testid="button-theme-toggle"
                >
                  {isDark ? (
                    <Sun className="h-5 w-5 text-foreground" />
                  ) : (
                    <Moon className="h-5 w-5 text-foreground" />
                  )}
                </button>
              )}

              <Link
                to="/profile"
                onClick={() => handleTabNavigation("profile")}
                className="hidden items-center gap-3 rounded-full border border-border/40 bg-card/60 px-3 py-2 backdrop-blur md:flex"
                data-testid="link-profile"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm">
                  <p className="font-medium leading-tight text-foreground">Guest</p>
                  <p className="text-xs font-normal text-muted-foreground">Free</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="mt-4 flex justify-center md:hidden">
            <nav className="pill-nav">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabNavigation(item.id)}
                  className={cn(
                    "pill-nav-item px-3 py-1.5 text-xs",
                    currentTab === item.id && "active"
                  )}
                  data-testid={`button-nav-mobile-${item.id}`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => handleTabNavigation("search")}
                className={cn(
                  "rounded-full p-1.5 transition-all duration-300",
                  currentTab === "search"
                    ? playButtonSurfaceClass
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Search"
                title="Search"
                data-testid="button-nav-mobile-search"
              >
                <Search className="h-4 w-4" />
              </button>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
