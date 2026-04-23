import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface VJChipsProps {
  activeVJ: string | null;
  onVJChange: (vj: string | null) => void;
  vjs?: { id: string; label: string }[];
}

export function VJChips({ activeVJ, onVJChange, vjs = [] }: VJChipsProps) {
  if (!vjs || vjs.length === 0) return null;

  return (
    <div className="relative -mx-4 md:mx-0 overflow-hidden">
      <div
        className="flex gap-2 md:gap-3 overflow-x-auto hide-scrollbar py-2 px-4 md:px-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [touch-action:pan-x] [overscroll-behavior-x:contain]"
      >
        {vjs.map((vj) => {
          const isActive = activeVJ === vj.id;

          return (
            <button
              key={vj.id}
              onClick={() => onVJChange(isActive ? null : vj.id)}
              data-testid={`button-vj-${vj.id}`}
              className={cn(
                "category-chip flex-shrink-0 whitespace-nowrap font-medium tracking-normal transition-all duration-300 snap-start px-4 py-2 rounded-full",
                isActive ? "text-white shadow-[0_10px_26px_rgba(255,91,46,0.2),0_0_22px_rgba(255,138,61,0.14)] bg-[linear-gradient(135deg,#ff8a3d_0%,#ff5b2e_52%,#ff4d6d_100%)]" : "text-white/60 hover:text-white/90 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12]"
              )}
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
