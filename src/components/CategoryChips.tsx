import { Flame, Sword, Heart, Clapperboard, Ghost, Star, Film, Compass, Shield, Sparkles, Rocket, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CategoryChipsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "action", label: "Action", icon: Sword },
  { id: "adventure", label: "Adventure", icon: Compass },
  { id: "crime", label: "Crime", icon: Shield },
  { id: "drama", label: "Drama", icon: Film },
  { id: "fantasy", label: "Fantasy", icon: Sparkles },
  { id: "horror", label: "Horror", icon: Ghost },
  { id: "romance", label: "Romance", icon: Heart },
  { id: "sci-fi", label: "Sci-Fi", icon: Rocket },
  { id: "thriller", label: "Thriller", icon: Crosshair },
  { id: "animation", label: "Animation", icon: Clapperboard },
  { id: "special", label: "Special", icon: Star },
];

export function CategoryChips({ activeCategory, onCategoryChange }: CategoryChipsProps) {
  return (
    <div className="relative -mx-4 md:mx-0 overflow-hidden">
      <div className="flex gap-2 md:gap-3 py-2 px-4 md:px-0 snap-x snap-mandatory category-chip-wrapper">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              data-testid={`button-category-${category.id}`}
              className={cn(
                "relative category-chip flex-shrink-0 whitespace-nowrap font-medium tracking-normal transition-all duration-200 snap-start press-effect overflow-hidden rounded-full px-4 py-2",
                isActive
                  ? "text-black shadow-[0_2px_16px_rgba(200,245,71,0.35)]"
                  : "text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="category-pill"
                  className="absolute inset-0 rounded-full"
                  style={{ background: "#c8f547" }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                <Icon
                  className={cn(
                    "w-4 h-4 transition-transform duration-300",
                    isActive && "animate-subtle-bounce"
                  )}
                />
                <span className="text-sm">{category.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
