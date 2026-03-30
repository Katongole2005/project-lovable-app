import { useNavigate, useLocation } from "react-router-dom";
import { Film, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 10v9a1 1 0 001 1h3v-5a1 1 0 011-1h4a1 1 0 011 1v5h3a1 1 0 001-1v-9" />
  </svg>
);

const tabs = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "movies", label: "Movies", icon: Film },
  { id: "series", label: "Series", icon: Tv },
  { id: "profile", label: "Profile", icon: User },
];

const tabToPath: Record<string, string> = {
  home: "/",
  movies: "/movies",
  series: "/series",
  profile: "/profile",
};

const pathToTab: Record<string, string> = {
  "/": "home",
  "/movies": "movies",
  "/series": "series",
  "/profile": "profile",
};

export function BottomNav({ activeTab: activeTabProp, onTabChange }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = activeTabProp ?? pathToTab[location.pathname] ?? "home";

  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
      return;
    }

    navigate(tabToPath[tabId] || "/");
  };

  return (
    <nav className="fixed left-4 right-4 z-50 md:hidden bottom-4" data-testid="nav-bottom">
      <div className="relative w-full flex items-center justify-between gap-1 p-2 rounded-full bg-black/70 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="absolute top-0 left-8 right-8 h-[1px] nav-border-gradient" />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              data-testid={`button-nav-bottom-${tab.id}`}
              className={cn(
                "flex items-center gap-2 rounded-full transition-all duration-200",
                isActive
                  ? "flex-[2] pl-1 pr-4 py-1 bg-white/[0.05]"
                  : "flex-1 justify-center p-1"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ease-in-out",
                  isActive
                    ? "bg-[#c8f547] shadow-[0_0_20px_rgba(200,245,71,0.5),0_0_40px_rgba(200,245,71,0.15)]"
                    : "bg-[#2c2c2e] hover:bg-[#3c3c3e]"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    isActive ? "text-black" : "text-[#6b6b6b]"
                  )}
                />
              </div>

              {isActive && (
                <span className="text-sm font-semibold whitespace-nowrap text-white">
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
