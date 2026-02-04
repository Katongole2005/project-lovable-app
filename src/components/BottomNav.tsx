import { Home, Film, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "movies", label: "Movies", icon: Film },
  { id: "series", label: "Series", icon: Tv },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 md:hidden"
      style={{
        bottom: "var(--bottom-nav-offset)",
        width: "min(92vw, 380px)",
      }}
    >
      {/* Dark pill container matching reference */}
      <div
        className="relative w-full flex items-center gap-2 p-2 rounded-full border border-border/30"
        style={{
          background: "hsl(var(--card) / 0.95)",
          boxShadow:
            "0 8px 32px -8px hsl(var(--background) / 0.8), inset 0 1px 0 hsl(var(--foreground) / 0.05)",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-full transition-all duration-300 ease-out",
                isActive
                  ? "flex-[1.8] bg-card/60 pl-1.5 pr-4 py-1.5"
                  : "flex-1 justify-center p-1.5"
              )}
            >
              {/* Icon circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300",
                  isActive ? "bg-primary" : "bg-muted/60"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    isActive ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
              </div>

              {/* Label - only shown when active */}
              {isActive && (
                <span className="text-sm font-medium text-foreground whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
