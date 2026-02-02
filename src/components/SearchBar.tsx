import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, TrendingUp, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchSuggestions } from "@/lib/api";
import { getRecentSearches } from "@/lib/storage";
import type { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onMovieSelect: (movie: Movie) => void;
  popularSearches?: string[];
  className?: string;
}

export function SearchBar({ onSearch, onMovieSelect, popularSearches = [], className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const recentSearches = getRecentSearches();

  const fetchSuggestionsDebounced = useCallback((searchQuery: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(searchQuery);
      setSuggestions(results.slice(0, 8));
    }, 300);
  }, []);

  useEffect(() => {
    fetchSuggestionsDebounced(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestionsDebounced]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = suggestions.length > 0 ? suggestions : [];
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (items.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (items.length || 1)) % (items.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        onMovieSelect(suggestions[selectedIndex]);
        setIsOpen(false);
        setQuery("");
      } else if (query.trim()) {
        onSearch(query.trim());
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setIsOpen(false);
    }
  };

  const handleChipClick = (term: string) => {
    setQuery(term);
    onSearch(term);
    setIsOpen(false);
  };

  const showDropdown = isOpen && (query.length > 0 || recentSearches.length > 0 || popularSearches.length > 0);

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-xl", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search movies, series..."
            className="w-full pl-12 pr-20 py-3 h-12 rounded-full bg-card/80 backdrop-blur-xl border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="absolute right-16 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Search
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/50 shadow-elevated overflow-hidden z-50 animate-scale-in">
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((movie, index) => (
                <button
                  key={movie.mobifliks_id}
                  type="button"
                  onClick={() => {
                    onMovieSelect(movie);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                    selectedIndex === index ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  <img
                    src={getImageUrl(movie.image_url)}
                    alt={movie.title}
                    className="w-10 h-14 rounded object-cover bg-muted"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{movie.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[movie.year, movie.language, movie.type === "series" ? "Series" : "Movie"]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent & Popular */}
          {suggestions.length === 0 && (
            <div className="p-3 space-y-3">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" />
                    <span>Recent</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 5).map((term) => (
                      <button
                        key={term}
                        onClick={() => handleChipClick(term)}
                        className="px-3 py-1.5 rounded-full bg-muted/30 text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {popularSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <TrendingUp className="w-3 h-3" />
                    <span>Trending</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.slice(0, 5).map((term) => (
                      <button
                        key={term}
                        onClick={() => handleChipClick(term)}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-sm text-primary hover:bg-primary/20 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
