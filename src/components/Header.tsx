import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, User, ChevronDown, Moon, Sun, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

const navItems = [
  { id: "movies", label: "Movies", path: "/movies" },
  { id: "series", label: "Series", path: "/series" },
  { id: "trending", label: "Trending", path: "/trending" },
  { id: "bookmarks", label: "My List", path: "/bookmarks" },
];

export function Header() {
  const [activeTab, setActiveTab] = useState("movies");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/series") setActiveTab("series");
    else if (path === "/trending") setActiveTab("trending");
    else if (path === "/bookmarks") setActiveTab("bookmarks");
    else if (path === "/search") setActiveTab("search");
    else setActiveTab("movies");
    
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500",
        scrolled 
          ? "py-3 bg-background/80 backdrop-blur-2xl border-b border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.3)]" 
          : "py-6 bg-transparent"
      )}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8 xl:gap-12">
            <Link 
              to="/" 
              className="flex items-center gap-2 group"
              onClick={() => handleTabClick("movies")}
              data-testid="link-logo"
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/30 transition-colors" />
                <div className="relative w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                  <span className="text-primary-foreground font-bold text-lg">M</span>
                </div>
              </div>
              <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                MOVIE<span className="text-primary">BAY</span>
              </span>
            </Link>

            <nav className={cn(
              "hidden md:flex items-center gap-1 p-1.5 rounded-full border-beam",
              isDark 
                ? "bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]" 
                : "bg-[#1c1c1e]"
            )}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => handleTabClick(item.id)}
                    data-testid={`button-nav-${item.id}`}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 press-effect",
                      isActive ? "nav-pill-active shadow-[0_2px_12px_rgba(200,245,71,0.3)]" : "text-[#6b6b6b] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                to="/search"
                onClick={() => handleTabClick("search")}
                aria-label="Search"
                title="Search"
                data-testid="button-nav-search"
                className={cn(
                  "p-2 rounded-full transition-all duration-300",
                  activeTab === "search" ? "nav-pill-active shadow-[0_2px_12px_rgba(200,245,71,0.3)]" : "text-[#6b6b6b] hover:text-white"
                )}
              >
                <Search className="w-5 h-5" />
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={toggleTheme}
                className={cn(
                  "p-2.5 rounded-full transition-all duration-300 press-effect hover:scale-110",
                  isDark ? "nav-pill-active shadow-[0_2px_12px_rgba(200,245,71,0.3)]" : "bg-[#2c2c2e]"
                )}
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

            <button 
              className="md:hidden p-2 rounded-full bg-white/[0.06] border border-white/[0.1]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 px-2 space-y-2 glass-card-premium rounded-2xl animate-in slide-in-from-top duration-300">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  activeTab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-white/5"
                )}
                onClick={() => handleTabClick(item.id)}
              >
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
            <Link
              to="/search"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === "search" ? "bg-primary text-primary-foreground" : "hover:bg-white/5"
              )}
              onClick={() => handleTabClick("search")}
            >
              <Search className="w-5 h-5" />
              <span className="font-medium">Search</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
