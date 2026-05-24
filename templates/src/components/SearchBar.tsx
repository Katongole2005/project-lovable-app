"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchSuggestions } from "@/lib/api";
import type { Movie } from "@/types/movie";
import { getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onMovieSelect: (movie: Movie) => void;
  popularSearches?: string[];
  recentSearches?: string[];
  onRemoveRecentSearch?: (term: string) => void;
  onClearRecentSearches?: () => void;
  className?: string;
  initialQuery?: string;
  isLoadingResults?: boolean;
}

export function SearchBar({ 
  onSearch, 
  onMovieSelect, 
  className, 
  initialQuery = "",
  isLoadingResults = false
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const fetchSuggestionsDebounced = useCallback((searchQuery: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(searchQuery);
      setSuggestions(results.slice(0, 6));
    }, 250);
  }, []);

  useEffect(() => {
    fetchSuggestionsDebounced(query);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestionsDebounced]);

  useEffect(() => {
    // Focus the search input on mount to improve UX
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  const showDropdown = isOpen && query.trim().length >= 2 && suggestions.length > 0;

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-xl", className)}>
      <form onSubmit={handleSubmit} className="relative z-20">
        <div className="relative group">
          {/* Animated gradient rim light border */}
          <div className="absolute -inset-[1px] rounded-full bg-gradient-to-r from-primary/30 via-violet-500/25 to-secondary/30 opacity-60 group-focus-within:opacity-100 group-hover:opacity-80 blur-[2px] transition-all duration-500 pointer-events-none" />
          
          <Search className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-300 pointer-events-none",
            query ? "text-primary scale-110" : "group-focus-within:text-primary group-focus-within:scale-105"
          )} />
          
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
            placeholder="Search movies, TV shows, actors..."
            className="w-full pl-12 pr-24 py-3.5 h-13 rounded-full bg-black/40 backdrop-blur-2xl border-white/[0.08] focus:border-primary/40 focus:ring-0 text-foreground placeholder:text-muted-foreground/60 focus:shadow-[0_0_30px_hsl(var(--primary)/0.2)] text-base transition-all duration-500 relative z-10"
            data-testid="input-search"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-20">
            {/* Loading / Clear controls */}
            {isLoadingResults ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin mr-1" />
            ) : query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground active:scale-90 transition-all duration-200 mr-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}

            <button
              type="submit"
              className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs font-bold hover:opacity-95 active:scale-95 transition-all duration-300 hover:shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
              data-testid="button-search"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Autocomplete Dropdown overlay */}
      {showDropdown && (
        <div className="absolute top-[calc(100%_+_8px)] left-0 right-0 rounded-2xl bg-black/80 backdrop-blur-3xl border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden z-50 animate-scale-in">
          <div className="p-2 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase border-b border-white/[0.04] mb-1">
              Suggestions
            </div>
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
                  "w-full flex items-center gap-3.5 p-2 rounded-xl transition-all duration-300 text-left relative overflow-hidden group/item",
                  selectedIndex === index 
                    ? "bg-white/10 border-l-4 border-l-primary pl-4 shadow-sm" 
                    : "hover:bg-white/5 pl-3 border-l-4 border-l-transparent"
                )}
              >
                <div className="relative w-9 h-13 rounded-lg overflow-hidden shrink-0 bg-neutral-900 shadow-md">
                  <img
                    src={getImageUrl(movie.image_url)}
                    alt={movie.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  {movie.logo_url ? (
                    <img
                      src={movie.logo_url}
                      alt={movie.title}
                      className="h-4.5 w-auto max-w-[85%] object-contain object-left mb-0.5 filter brightness-100 group-hover/item:scale-102 transition-transform"
                    />
                  ) : (
                    <p className="font-semibold text-sm text-white truncate leading-tight group-hover/item:text-primary transition-colors">{movie.title}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                    {[
                      movie.year,
                      movie.language,
                      movie.type === "series" ? "Series" : "Movie",
                      movie.vj_name ? `VJ ${movie.vj_name}` : null
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
