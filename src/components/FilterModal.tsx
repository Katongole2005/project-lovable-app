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
      {/* Backdrop with blur - deep blur for liquid glass effect */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Modal content - liquid glass container */}
      <div
        className={cn(
          "absolute inset-x-3 top-6 bottom-6 overflow-hidden transition-all duration-500 ease-out rounded-3xl",
          "bg-gradient-to-br from-white/10 via-white/5 to-transparent",
          "backdrop-blur-2xl",
          "border border-white/20",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]",
          isAnimating
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-8 opacity-0 scale-95"
        )}
      >
        {/* Liquid glass shimmer overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {/* Top highlight reflection */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          {/* Left edge reflection */}
          <div className="absolute top-0 left-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          
          {/* Animated liquid blobs */}
          <div 
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#4ade80]/15 blur-3xl"
            style={{
              animation: "liquidFloat 8s ease-in-out infinite"
            }}
          />
          <div 
            className="absolute top-1/3 -left-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl"
            style={{
              animation: "liquidFloat 10s ease-in-out infinite reverse"
            }}
          />
          <div 
            className="absolute -bottom-20 right-1/4 w-52 h-52 rounded-full bg-[#4ade80]/10 blur-3xl"
            style={{
              animation: "liquidFloat 12s ease-in-out infinite",
              animationDelay: "2s"
            }}
          />
          
          {/* Glass noise texture overlay */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }}
          />
        </div>

        {/* Header - glass panel */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/10">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
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
                : "text-white/50"
            )}
          >
            Clear all
          </button>
        </div>

        {/* Scrollable content */}
        <div className="relative h-[calc(100%-140px)] overflow-y-auto px-5 py-6 space-y-8">
          {/* Categories Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white/90">
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
                      "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 transform",
                      "hover:scale-105 active:scale-95",
                      isActive
                        ? "text-black border-transparent shadow-lg shadow-[#4ade80]/40"
                        : "bg-white/10 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:bg-white/15 hover:border-white/30"
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
            <h3 className="text-base font-semibold text-white/90">
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
                      "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 transform",
                      "hover:scale-105 active:scale-95",
                      isActive
                        ? "text-black border-transparent shadow-lg shadow-[#4ade80]/40"
                        : "bg-white/10 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:bg-white/15 hover:border-white/30"
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
            <h3 className="text-base font-semibold text-white/90">
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
                      "px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 transform",
                      "hover:scale-105 active:scale-95",
                      isActive
                        ? "text-black border-transparent shadow-lg shadow-[#4ade80]/40"
                        : "bg-white/10 backdrop-blur-md border border-white/20 text-white/80 hover:text-white hover:bg-white/15 hover:border-white/30"
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

        {/* Fixed Apply Button - glass effect */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/30 via-black/10 to-transparent backdrop-blur-sm">
          <button
            onClick={handleApply}
            className={cn(
              "w-full py-4 rounded-2xl text-base font-semibold transition-all duration-300 transform",
              "hover:scale-[1.02] active:scale-[0.98]",
              hasActiveFilters
                ? "text-black shadow-xl shadow-[#4ade80]/40"
                : "bg-white/10 backdrop-blur-md border border-white/20 text-white/60"
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

      {/* Custom animation keyframes */}
      <style>{`
        @keyframes liquidFloat {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(10px, -15px) scale(1.05);
          }
          50% {
            transform: translate(-5px, 10px) scale(0.95);
          }
          75% {
            transform: translate(-15px, -5px) scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
