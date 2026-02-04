import { useState, useEffect } from "react";
import { ChevronLeft, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  categories: { id: string; label: string }[];
  vjs: { id: string; label: string }[];
  years: number[];
  initialFilters?: FilterState;
}

export interface FilterState {
  category: string | null;
  vj: string | null;
  year: number | null;
}

export function FilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  categories,
  vjs,
  years,
  initialFilters,
}: FilterModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialFilters?.category || null
  );
  const [selectedVJ, setSelectedVJ] = useState<string | null>(
    initialFilters?.vj || null
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(
    initialFilters?.year || null
  );
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset to initial filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialFilters?.category || null);
      setSelectedVJ(initialFilters?.vj || null);
      setSelectedYear(initialFilters?.year || null);
      setIsAnimating(true);
    }
  }, [isOpen, initialFilters]);

  const handleClearAll = () => {
    setSelectedCategory(null);
    setSelectedVJ(null);
    setSelectedYear(null);
  };

  const handleApply = () => {
    onApplyFilters({
      category: selectedCategory,
      vj: selectedVJ,
      year: selectedYear,
    });
    onClose();
  };

  const hasActiveFilters = selectedCategory || selectedVJ || selectedYear;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop with blur */}
      <div
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={cn(
          "absolute inset-0 bg-background overflow-hidden transition-all duration-500 ease-out",
          isAnimating
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        {/* Decorative gradient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[#4ade80]/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-4 border-b border-border/30">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-lg font-semibold font-display">Filters</span>
          </button>
          <button
            onClick={handleClearAll}
            className={cn(
              "text-sm font-medium transition-all duration-300",
              hasActiveFilters
                ? "text-[#4ade80] hover:text-[#4ade80]/80"
                : "text-muted-foreground"
            )}
          >
            Clear all
          </button>
        </div>

        {/* Scrollable content */}
        <div className="relative h-[calc(100%-140px)] overflow-y-auto px-4 py-6 space-y-8">
          {/* Categories Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Categories
              </h3>
              <Sparkles className="w-4 h-4 text-[#4ade80] animate-pulse" />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category, index) => {
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() =>
                      setSelectedCategory(isActive ? null : category.id)
                    }
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-300 transform",
                      "hover:scale-105 active:scale-95",
                      isActive
                        ? "text-black border-transparent shadow-lg shadow-[#4ade80]/30"
                        : "bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                    style={{
                      background: isActive ? "#4ade80" : undefined,
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* VJs Section */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Video Jockeys (VJs)
            </h3>
            <div className="flex flex-wrap gap-2">
              {vjs.map((vj, index) => {
                const isActive = selectedVJ === vj.id;
                return (
                  <button
                    key={vj.id}
                    onClick={() => setSelectedVJ(isActive ? null : vj.id)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-300 transform",
                      "hover:scale-105 active:scale-95",
                      isActive
                        ? "text-black border-transparent shadow-lg shadow-[#4ade80]/30"
                        : "bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                    style={{
                      background: isActive ? "#4ade80" : undefined,
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    {vj.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Year Section */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Release Year
            </h3>
            <div className="flex flex-wrap gap-2">
              {years.map((year, index) => {
                const isActive = selectedYear === year;
                return (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(isActive ? null : year)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-300 transform",
                      "hover:scale-105 active:scale-95",
                      isActive
                        ? "text-black border-transparent shadow-lg shadow-[#4ade80]/30"
                        : "bg-card/60 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                    style={{
                      background: isActive ? "#4ade80" : undefined,
                      animationDelay: `${index * 30}ms`,
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Fixed Apply Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <button
            onClick={handleApply}
            className={cn(
              "w-full py-4 rounded-2xl text-base font-semibold transition-all duration-300 transform",
              "hover:scale-[1.02] active:scale-[0.98]",
              hasActiveFilters
                ? "text-black shadow-xl shadow-[#4ade80]/40"
                : "bg-muted text-muted-foreground"
            )}
            style={{
              background: hasActiveFilters
                ? "linear-gradient(135deg, #4ade80 0%, #22c55e 100%)"
                : undefined,
            }}
          >
            Apply Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-black/20 rounded-full">
                {[selectedCategory, selectedVJ, selectedYear].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
