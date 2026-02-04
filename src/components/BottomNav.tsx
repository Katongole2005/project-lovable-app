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
          return (
            <button 
              key={tab.id} 
              onClick={() => onTabChange(tab.id)} 
              className={cn(
                "flex items-center gap-2 py-2 px-2 rounded-full transition-all duration-300",
                isActive 
                  ? "bg-card/30 flex-[2]" 
                  : "flex-1 justify-center"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                isActive 
                  ? "bg-primary" 
                  : "bg-card/50"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-all duration-300",
                  isActive 
                    ? "text-primary-foreground" 
                    : "text-muted-foreground"
                )} />
              </div>
              {isActive && (
                <span className="text-sm font-medium text-foreground pr-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  </>;
}
