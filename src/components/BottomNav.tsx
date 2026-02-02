import { Home, Search, Film, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";
interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}
const tabs = [{
  id: "home",
  label: "Home",
  icon: Home
}, {
  id: "search",
  label: "Search",
  icon: Search
}, {
  id: "movies",
  label: "Movies",
  icon: Film
}, {
  id: "series",
  label: "Series",
  icon: Tv
}, {
  id: "profile",
  label: "Profile",
  icon: User
}];
export function BottomNav({
  activeTab,
  onTabChange
}: BottomNavProps) {
  return <>
    <style>{`
      @keyframes subtlePulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
    `}</style>
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 md:hidden"
      style={{
        bottom: "var(--bottom-nav-offset)",
        width: "min(92vw, 420px)",
      }}
    >
      {/* Glassmorphic floating pill container */}
      <div 
        className="relative w-full flex items-center justify-between gap-1 px-3 py-2 rounded-full backdrop-blur-3xl border border-purple-400/20"
        style={{
          background: 'linear-gradient(135deg, rgba(43, 10, 78, 0.95) 0%, rgba(74, 22, 116, 0.95) 55%, rgba(43, 10, 78, 0.95) 100%)',
          boxShadow: '0 12px 28px -8px rgba(34, 6, 56, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
        }}
      >
        {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return <button key={tab.id} onClick={() => onTabChange(tab.id)} className={cn("flex-1 min-w-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all duration-200 opacity-100", isActive ? "text-white" : "text-white/40 hover:text-white/60")}>
              <Icon className={cn("w-4 h-4 transition-all duration-200", isActive ? "opacity-100 animate-[subtlePulse_2.5s_ease-in-out_infinite]" : "opacity-50")} style={isActive ? { animation: 'subtlePulse 2.5s ease-in-out infinite' } : undefined} />
              <span className={cn("text-[9px] font-medium tracking-wide transition-all duration-200 opacity-100 truncate", isActive ? "opacity-90" : "opacity-40")}>
                {tab.label}
              </span>
            </button>;
      })}
      </div>
    </nav>
  </>;
}
