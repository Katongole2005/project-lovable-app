import { useEffect, useMemo, useRef, useState, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, User, ChevronDown, Moon, Sun, Home, Film, Tv, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettingsContext } from "@/hooks/useSiteSettings";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
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
  { id: "home", label: "Home", path: "/", icon: Home },
  { id: "movies", label: "Movies", path: "/movies", icon: Film },
  { id: "series", label: "Series", path: "/series", icon: Tv },
  { id: "originals", label: "Originals", path: "/originals", icon: Sparkles },
];

const preloadProfilePage = () => {
  void import("@/pages/Profile");
};

function HeaderComponent({ activeTab, onTabChange }: HeaderProps) {
  const { user } = useAuth();
  const { settings } = useSiteSettingsContext();
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const hasAnnouncement = Boolean(settings.site_announcement && !announcementDismissed);
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
          "fixed left-0 right-0 top-0 z-30 pointer-events-none transition-transform duration-300 ease-out md:hidden",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full"
        )}
        style={{
          height: hasAnnouncement ? "calc(9.5rem + env(safe-area-inset-top))" : "calc(7rem + env(safe-area-inset-top))",
          background:
            "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.95) 30%, hsl(var(--background) / 0.7) 50%, hsl(var(--background) / 0.3) 75%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 100%)",
        }}
      />

      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-40 pointer-events-none pb-4 transition-transform duration-300 ease-out will-change-transform",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full",
          isScrolled && "bg-background/40 backdrop-blur-md md:bg-transparent md:backdrop-blur-0"
        )}
        style={{ paddingTop: hasAnnouncement ? "env(safe-area-inset-top)" : "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <AnnouncementBanner dismissed={announcementDismissed} onDismiss={() => setAnnouncementDismissed(true)} />
        <div className={cn("container pointer-events-auto mx-auto px-4", hasAnnouncement && "mt-3")}>
          <div className="relative flex items-center justify-between gap-4">
            <Link
              to="/"
              className="flex-shrink-0 md:invisible md:pointer-events-none"
              onClick={() => handleTabNavigation("home")}
              data-testid="link-logo"
            >
              <img
                src={currentLogo}
                alt="MovieBay"
                className="h-8 w-auto md:h-10"
                
              />
            </Link>

            <nav className="hidden md:flex pill-nav pill-nav-desktop absolute left-1/2 top-0 -translate-x-1/2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabNavigation(item.id)}
                    className={cn("pill-nav-item", currentTab === item.id && "active")}
                    data-testid={`button-nav-${item.id}`}
                  >
                    {currentTab === item.id && (
                      <div
                        className="pill-nav-indicator"
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      <Icon className="h-[18px] w-[18px] stroke-[2.45]" />
                      <span>{item.label}</span>
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => handleTabNavigation("search")}
                className={cn(
                  "relative rounded-full p-2 transition-all duration-300",
                  currentTab === "search"
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Search"
                title="Search"
                data-testid="button-nav-search"
              >
                {currentTab === "search" && (
                  <div
                    className="pill-nav-indicator"
                  />
                )}
                <Search className={cn("relative z-10 h-[19px] w-[19px]", currentTab === "search" && "animate-pulse")} />
              </button>
              <button
                onClick={() => handleTabNavigation("profile")}
                onMouseEnter={preloadProfilePage}
                onFocus={preloadProfilePage}
                className={cn(
                  "relative rounded-full transition-all duration-300",
                  currentTab === "profile"
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Profile"
                title="Profile"
                data-testid="button-nav-profile"
              >
                {currentTab === "profile" && (
                  <div
                    className="pill-nav-indicator"
                  />
                )}
                <User className={cn("relative z-10 h-[19px] w-[19px]", currentTab === "profile" && "animate-pulse")} />
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "rounded-full p-2.5 backdrop-blur transition-all duration-300 hover:bg-card md:hidden",
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
                onMouseEnter={preloadProfilePage}
                onFocus={preloadProfilePage}
                onPointerDown={preloadProfilePage}
                onTouchStart={preloadProfilePage}
                onClick={() => handleTabNavigation("profile")}
                className="hidden items-center gap-3 rounded-full border border-border/40 bg-card/60 px-3 py-2 backdrop-blur"
                data-testid="link-profile"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="max-w-[80px] truncate text-sm font-black leading-tight text-foreground">
                    {(() => {
                      if (!user) return "Guest";
                      const fullName = user.user_metadata?.full_name || user.user_metadata?.first_name || user.email?.split("@")[0];
                      if (!fullName) return "Member";
                      const nameParts = fullName.trim().split(/\s+/);
                      return nameParts.length > 1 ? nameParts.pop() : nameParts[0];
                    })()}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                    {user ? "Pro" : "Free"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="mt-4 flex justify-center md:hidden">
            <nav className="pill-nav relative">
              {navItems.filter((item) => item.id !== "home").map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabNavigation(item.id)}
                  className={cn(
                    "pill-nav-item px-3 py-1.5 text-xs",
                    currentTab === item.id && "active"
                  )}
                  data-testid={`button-nav-mobile-${item.id}`}
                >
                  {currentTab === item.id && (
                    <div
                      className="pill-nav-indicator"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => handleTabNavigation("search")}
                className={cn(
                  "relative rounded-full p-1.5 transition-all duration-300",
                  currentTab === "search"
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Search"
                title="Search"
                data-testid="button-nav-mobile-search"
              >
                {currentTab === "search" && (
                  <div
                    className="pill-nav-indicator"
                  />
                )}
                <Search className={cn("relative z-10 h-4 w-4", currentTab === "search" && "animate-pulse")} />
              </button>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

export const Header = memo(HeaderComponent);
