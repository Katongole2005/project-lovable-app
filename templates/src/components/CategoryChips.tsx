"use client";
import {
  Flame, Sword, Heart, Clapperboard, Ghost, Star, Film, Compass,
  Shield, Sparkles, Rocket, Crosshair, CalendarClock, Tv, Skull,
  Target, Eye, Globe, Hourglass, ShieldAlert, Zap, BookOpen, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryChipsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const categories = [
  { id: "trending", label: "Latest Added", icon: Flame },
  { id: "new-week", label: "New This Week", icon: CalendarClock },
  { id: "action-movies", label: "Action Movies", icon: Sword },
  { id: "scifi-movies", label: "Sci-Fi Movies", icon: Rocket },
  { id: "crime-thrillers", label: "Crime Thrillers", icon: Shield },
  { id: "action-series", label: "Action Series", icon: Tv },
  { id: "revenge-stories", label: "Revenge Stories", icon: Flame },
  { id: "spy-thrillers", label: "Spy Thrillers", icon: Target },
  { id: "psychological-thrillers", label: "Psychological Thrillers", icon: Eye },
  { id: "scifi-series", label: "Sci-Fi Series", icon: Tv },
  { id: "space-adventures", label: "Space Adventures", icon: Globe },
  { id: "time-travel", label: "Time Travel", icon: Hourglass },
  { id: "dystopian-worlds", label: "Dystopian Worlds", icon: ShieldAlert },
  { id: "cyberpunk", label: "Cyberpunk", icon: Zap },
  { id: "romantic-movies", label: "Romantic Movies", icon: Heart },
  { id: "romantic-series", label: "Romantic Series", icon: Tv },
  { id: "erotic-thrillers", label: "Erotic Thrillers", icon: Sparkles },
  { id: "korean-dramas", label: "Korean Dramas", icon: Film },
  { id: "teen-romance", label: "Teen Romance", icon: Heart },
  { id: "teen-drama", label: "Teen Drama", icon: Film },
  { id: "historical-drama", label: "Historical Drama", icon: BookOpen },
  { id: "war-series", label: "War Series", icon: Tv },
  { id: "war-movies", label: "War Movies", icon: Sword },
  { id: "detective-stories", label: "Detective Stories", icon: Search },
  { id: "survival-horror", label: "Survival Horror", icon: Skull },
  { id: "horror-series", label: "Horror Series", icon: Tv },
  { id: "horror-movies", label: "Horror Movies", icon: Ghost },
];

export function CategoryChips({ activeCategory, onCategoryChange }: CategoryChipsProps) {
  return (
    <div className="relative -mx-4 md:mx-0 overflow-hidden">
      <div className="flex gap-2 md:gap-3 py-2 px-4 md:px-0 snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              data-testid={`button-category-${category.id}`}
              className={cn(
                "relative category-chip flex-shrink-0 whitespace-nowrap font-medium tracking-normal transition-all duration-200 snap-start press-effect overflow-hidden rounded-lg px-4 py-2",
                isActive
                  ? "bg-[linear-gradient(135deg,#ff8a3d_0%,#ff5b2e_52%,#ff4d6d_100%)] text-white shadow-[0_10px_26px_rgba(255,91,46,0.2),0_0_22px_rgba(255,138,61,0.14)] border-transparent"
                  : "text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]"
              )}
            >
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
