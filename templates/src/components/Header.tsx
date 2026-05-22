"use client";
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router-polyfill";
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
  void import("@/views/Profile");
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
  const currentLogo = isDark ? logoDark.src : logoLight.src;
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
      {hasAnnouncement && (
        <div className="fixed left-0 right-0 top-0 z-50">
          <AnnouncementBanner dismissed={announcementDismissed} onDismiss={() => setAnnouncementDismissed(true)} />
        </div>
      )}

      <header
        className={cn(
          "pointer-events-none fixed inset-x-0 z-50 flex justify-center px-2 md:px-3",
          hasAnnouncement ? "top-[calc(env(safe-area-inset-top)+3.5rem)]" : "top-[calc(env(safe-area-inset-top)+1.25rem)]"
        )}
      >
        <div className="pointer-events-auto relative z-10 flex items-center gap-2 rounded-full px-[14px] py-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
          {/* Dedicated background and blur layer for Chrome compatibility */}
          <div className="absolute inset-0 -z-10 rounded-full border border-white/10 bg-white/[0.08] backdrop-blur-[24px] backdrop-saturate-[1.8] pointer-events-none transform-gpu [backface-visibility:hidden] [-webkit-backdrop-filter:blur(24px)_saturate(1.8)]" />
          
          <nav className="flex items-center gap-2 relative z-10">
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabNavigation(item.id)}
                className={cn(
                  "inline-flex min-h-[40px] md:min-h-[44px] items-center gap-1.5 md:gap-2 rounded-full px-3 md:px-4 text-[13px] md:text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 shrink-0",
                  isActive
                    ? "bg-white/95 text-[#111] shadow-[0_8px_20px_rgba(0,0,0,0.26)]"
                    : "text-white/85 hover:-translate-y-[1px] hover:bg-white/12 hover:text-white hover:shadow-[0_6px_14px_rgba(0,0,0,0.2)]"
                )}
              >
                <span className="text-base"><Icon className="h-[18px] w-[18px] md:h-5 md:w-5" /></span>
                <span className={cn(isActive ? "block" : "hidden md:block")}>{item.label}</span>
              </button>
            );
          })}
          
          <div className="mx-1 h-6 w-px bg-white/10 shrink-0 hidden md:block" />

          <button
            onClick={() => handleTabNavigation("search")}
            className={cn(
              "md:ml-1 inline-flex min-h-[40px] md:min-h-[44px] min-w-[40px] md:min-w-[44px] items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 shrink-0",
              currentTab === "search"
                ? "bg-white/95 text-[#111] shadow-[0_8px_20px_rgba(0,0,0,0.26)]"
                : "text-white/85 hover:bg-white/12 hover:text-white hover:shadow-[0_6px_14px_rgba(0,0,0,0.2)]"
            )}
            aria-label="Search"
          >
            <Search className="h-[18px] w-[18px] md:h-5 md:w-5" />
          </button>
          
          <button
            onClick={() => handleTabNavigation("profile")}
            onMouseEnter={preloadProfilePage}
            className={cn(
              "ml-0.5 md:ml-1 inline-flex min-h-[40px] md:min-h-[44px] min-w-[40px] md:min-w-[44px] items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 shrink-0",
              currentTab === "profile"
                ? "bg-white/95 text-[#111] shadow-[0_8px_20px_rgba(0,0,0,0.26)]"
                : "text-white/85 hover:bg-white/12 hover:text-white hover:shadow-[0_6px_14px_rgba(0,0,0,0.2)]"
            )}
            aria-label="Profile"
          >
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="h-5 w-5 md:h-6 md:w-6 rounded-full object-cover" />
            ) : (
              <User className="h-[18px] w-[18px] md:h-5 md:w-5" />
            )}
          </button>
          </nav>
        </div>
      </header>
    </>
  );
}

export const Header = memo(HeaderComponent);
