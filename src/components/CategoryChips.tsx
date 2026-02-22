import { Flame, Sword, Heart, Clapperboard, Ghost, Star, Film, Compass, Shield, Sparkles, Rocket, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div 
        className="flex gap-2 md:gap-3 overflow-x-auto hide-scrollbar py-2 px-4 md:px-0 snap-x snap-mandatory"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x',
          overscrollBehaviorX: 'contain',
        }}
      >
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "category-chip flex-shrink-0 whitespace-nowrap font-medium tracking-normal transition-all duration-300 snap-start press-effect",
                isActive ? "text-black animate-scale-bounce" : "active"
              )}
              style={isActive ? { background: "#4ade80" } : undefined}
            >
              <Icon className={cn("w-4 h-4 transition-transform duration-300", isActive && "animate-subtle-bounce")} />
              <span className="text-sm">{category.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
