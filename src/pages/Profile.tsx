import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "next-themes";
import { getRecentlyViewed, getContinueWatching } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { SendPushPanel } from "@/components/SendPushPanel";
import {
  ArrowLeft,
  LogOut,
  Moon,
  Sun,
  Film,
  Tv,
  Clock,
  Eye,
  ChevronRight,
  User,
  Mail,
  Shield,
  Settings,
} from "lucide-react";
import logoLight from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const recentlyViewed = getRecentlyViewed();
  const continueWatching = getContinueWatching();

  const movieCount = recentlyViewed.filter((m) => m.type === "movie").length;
  const seriesCount = recentlyViewed.filter((m) => m.type === "series").length;

  const userEmail = user?.email || "guest@moviebay.com";
  const firstName = user?.user_metadata?.first_name || "";
  const lastName = user?.user_metadata?.last_name || "";
  const displayName = firstName ? `${firstName} ${lastName}`.trim() : "Guest User";
  const initials = firstName
    ? `${firstName[0]}${lastName?.[0] || ""}`.toUpperCase()
    : "G";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const stats = [
    { icon: Film, label: "Movies", value: movieCount, color: "hsl(var(--primary))" },
    { icon: Tv, label: "Series", value: seriesCount, color: "hsl(var(--secondary))" },
    { icon: Clock, label: "Watching", value: continueWatching.length, color: "hsl(45, 93%, 50%)" },
    { icon: Eye, label: "Total", value: recentlyViewed.length, color: "hsl(142, 71%, 45%)" },
  ];

  const menuItems = [
    { icon: User, label: "Account Details", subtitle: "Manage your profile info" },
    { icon: Shield, label: "Privacy & Security", subtitle: "Password, sessions" },
    { icon: Settings, label: "Preferences", subtitle: "Notifications, language" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/30"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground font-display">Profile</h1>
        <div className="ml-auto">
          <img
            src={isDark ? logoLight : logoDark}
            alt="MovieBay"
            className="h-6"
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="relative overflow-hidden rounded-2xl bg-card/70 backdrop-blur-xl border border-border/40 p-6">
          {/* Decorative gradient */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -20%, hsl(var(--primary) / 0.4), transparent 70%)",
            }}
          />
          <div className="relative flex items-center gap-4">
            <Avatar className="w-20 h-20 border-2 border-primary/30 shadow-lg">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground font-display truncate">
                {displayName}
              </h2>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {userEmail}
              </p>
              <Badge variant="secondary" className="mt-2 text-xs">
                Free Plan
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/30"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: `${stat.color}20` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <span className="text-lg font-bold text-foreground">{stat.value}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Continue Watching Preview */}
        {continueWatching.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground font-display">
              Continue Watching
            </h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4">
              {continueWatching.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-28 rounded-xl overflow-hidden bg-card/60 border border-border/30 group"
                >
                  <div className="aspect-[2/3] relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover card-image-zoom"
                    />
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.round((item.progress / item.duration) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[11px] font-medium text-foreground p-2 truncate">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground font-display">
              Recently Viewed
            </h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4">
              {recentlyViewed.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-24 rounded-xl overflow-hidden bg-card/60 border border-border/30"
                >
                  <div className="aspect-[2/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover card-image-zoom"
                    />
                  </div>
                  <p className="text-[10px] font-medium text-foreground p-1.5 truncate">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="rounded-2xl bg-card/60 backdrop-blur border border-border/30 overflow-hidden divide-y divide-border/30">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Push Notifications */}
        <PushNotificationButton variant="profile" />

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card/60 backdrop-blur border border-border/30 hover:bg-accent/50 transition-colors"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: isDark ? "#4ade80" : "#2c2c2e" }}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-black" />
            ) : (
              <Moon className="w-4 h-4 text-[#6b6b6b]" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">Appearance</p>
            <p className="text-xs text-muted-foreground">
              {isDark ? "Dark mode" : "Light mode"}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Admin Panel Link */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Admin Panel</p>
              <p className="text-xs text-muted-foreground">Manage site settings, users & more</p>
            </div>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        )}

        {/* Send Push Notification Panel (admin) */}
        {isAdmin && <SendPushPanel />}

        {/* Sign Out / Sign In */}
        {user ? (
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-12 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        ) : (
          <Button
            onClick={() => navigate("/auth")}
            className="w-full h-12 rounded-full"
          >
            <User className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        )}
      </div>
    </div>
  );
}
