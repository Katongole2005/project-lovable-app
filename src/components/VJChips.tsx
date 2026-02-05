import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface VJChipsProps {
  activeVJ: string | null;
  onVJChange: (vj: string | null) => void;
}

// Top 5 VJs with most movies based on the catalog
const topVJs = [
  { id: "Emmy", label: "VJ Emmy" },
  { id: "IceP", label: "VJ IceP" },
  { id: "Tom", label: "VJ Tom" },
  { id: "Fredy", label: "VJ Fredy" },
];

export function VJChips({ activeVJ, onVJChange }: VJChipsProps) {
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
        {topVJs.map((vj) => {
          const isActive = activeVJ === vj.id;
          
          return (
            <button
              key={vj.id}
              onClick={() => onVJChange(isActive ? null : vj.id)}
              className={cn(
                "category-chip flex-shrink-0 whitespace-nowrap font-medium tracking-normal transition-all duration-300 snap-start",
                isActive ? "text-black" : ""
              )}
              style={isActive ? { background: "#4ade80" } : undefined}
            >
              <User className="w-4 h-4" />
              <span className="text-sm">{vj.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
