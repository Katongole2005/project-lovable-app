import { Film, Tv, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Custom Home icon matching the reference design
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

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed left-1/2 -translate-x-1/2 z-50 md:hidden"
      style={{
        bottom: "var(--bottom-nav-offset)",
        width: "min(92vw, 380px)",
      }}
    >
      {/* Dark pill container - exact colors from reference */}
      <div
        className="relative w-full flex items-center gap-1.5 p-2 rounded-full"
        style={{
          background: "#1c1c1e",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
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
                "flex items-center gap-2 rounded-full transition-all duration-300 ease-out",
                isActive
                  ? "flex-[2] pl-1 pr-4 py-1"
                  : "flex-1 justify-center p-1"
              )}
              style={
                isActive
                  ? { background: "rgba(255, 255, 255, 0.06)" }
                  : undefined
              }
            >
              {/* Icon circle */}
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300"
                style={{
                  background: isActive ? "#4ade80" : "#2c2c2e",
                }}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors duration-300",
                    isActive ? "text-black" : "text-[#6b6b6b]"
                  )}
                />
              </div>

              {/* Label - only shown when active */}
              {isActive && (
                <span
                  className="text-sm font-medium whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200"
                  style={{ color: "#ffffff" }}
                >
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
