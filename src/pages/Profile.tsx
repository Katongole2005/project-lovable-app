import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "next-themes";
import { getRecentlyViewed, getContinueWatching, getWatchlist, getUserRatings, removeContinueWatching } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { SendPushPanel } from "@/components/SendPushPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
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
  Heart,
  Star,
  Play,
  Bookmark,
  Edit3,
  Crown,
  Lock,
  X,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";

// ─── Edit Profile Dialog ──────────────────────────────────────────────
function EditProfileDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: any;
}) {
  const [firstName, setFirstName] = useState(user?.user_metadata?.first_name || "");
  const [lastName, setLastName] = useState(user?.user_metadata?.last_name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(user?.user_metadata?.first_name || "");
      setLastName(user?.user_metadata?.last_name || "");
    }
  }, [open, user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      });
      if (error) throw error;
      toast.success("Profile updated!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Profile</DialogTitle>
          <DialogDescription>Update your display name</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Change Password Dialog ───────────────────────────────────────────
function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setPassword(""); setConfirm(""); }
  }, [open]);

  const handleSave = async () => {
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Change Password</DialogTitle>
          <DialogDescription>Enter a new password for your account</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full h-11 rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {saving ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preferences Dialog ───────────────────────────────────────────────
function PreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [quality, setQuality] = useState(() => localStorage.getItem("pref_quality") || "auto");
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem("pref_autoplay") !== "false");

  const save = () => {
    localStorage.setItem("pref_quality", quality);
    localStorage.setItem("pref_autoplay", String(autoplay));
    toast.success("Preferences saved!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Preferences</DialogTitle>
          <DialogDescription>Customize your viewing experience</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Streaming Quality</label>
            <div className="grid grid-cols-3 gap-2">
              {["auto", "720p", "1080p"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    quality === q
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-foreground border-border/50 hover:bg-accent"
                  }`}
                >
                  {q === "auto" ? "Auto" : q}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Autoplay Next</p>
              <p className="text-[11px] text-muted-foreground">Auto-play next episode</p>
            </div>
            <button
              onClick={() => setAutoplay(!autoplay)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                autoplay ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-transform ${
                  autoplay ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <Button onClick={save} className="w-full h-11 rounded-xl gap-2">
            <Check className="w-4 h-4" />
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [entranceReady, setEntranceReady] = useState(false);

  // Dialog states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  // Force re-render for localStorage data
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setEntranceReady(true));
  }, []);

  const recentlyViewed = getRecentlyViewed();
  const continueWatching = getContinueWatching();
  const watchlist = getWatchlist();
  const ratings = getUserRatings();

  const movieCount = recentlyViewed.filter((m) => m.type === "movie").length;
  const seriesCount = recentlyViewed.filter((m) => m.type === "series").length;
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : "–";

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

  const navigateToMovie = useCallback((id: string, title: string, type: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    navigate(`/${type === "series" ? "series" : "movie"}/${slug}-${id}`);
  }, [navigate]);

  const handleRemoveContinueWatching = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeContinueWatching(id);
    setRefreshKey((k) => k + 1);
    toast.success("Removed from continue watching");
  }, []);

  const handleClearHistory = useCallback(() => {
    localStorage.removeItem("recentMovies");
    setRefreshKey((k) => k + 1);
    toast.success("Watch history cleared");
  }, []);

  const stagger = (index: number) => ({
    opacity: entranceReady ? 1 : 0,
    transform: entranceReady ? "translateY(0)" : "translateY(16px)",
    transition: `all 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.06}s`,
  });

  const stats = [
    { icon: Film, label: "Movies", value: movieCount, gradient: "from-blue-500/20 to-blue-600/5" },
    { icon: Tv, label: "Series", value: seriesCount, gradient: "from-purple-500/20 to-purple-600/5" },
    { icon: Bookmark, label: "Watchlist", value: watchlist.length, gradient: "from-amber-500/20 to-amber-600/5" },
    { icon: Star, label: "Avg Rating", value: avgRating, gradient: "from-yellow-500/20 to-yellow-600/5" },
  ];

  const quickStats = [
    { icon: Eye, value: recentlyViewed.length, label: "Viewed" },
    { icon: Clock, value: continueWatching.length, label: "In Progress" },
    { icon: Heart, value: ratings.length, label: "Rated" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" key={refreshKey}>
      {/* Dialogs */}
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} user={user} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />

      {/* Hero Header with gradient */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "linear-gradient(180deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--background)) 100%)"
              : "linear-gradient(180deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--background)) 100%)",
          }}
        />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-secondary/10 blur-3xl" />

        {/* Nav bar */}
        <div
          className="relative flex items-center gap-3 px-4 py-3"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", ...stagger(0) }}
        >
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-full bg-card/60 backdrop-blur border border-border/30 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground font-display">Profile</h1>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2 rounded-full bg-card/60 backdrop-blur border border-border/30 hover:bg-accent transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative px-4 pt-2 pb-8" style={stagger(1)}>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background shadow-2xl ring-2 ring-primary/20">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => user ? setEditProfileOpen(true) : navigate("/auth")}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background active:scale-90 transition-transform"
              >
                <Edit3 className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-foreground font-display mt-4">{displayName}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {userEmail}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary" className="text-xs gap-1">
                <Crown className="w-3 h-3" />
                Free Plan
              </Badge>
              {isAdmin && (
                <Badge className="text-xs gap-1 bg-primary/20 text-primary border-primary/30">
                  <Shield className="w-3 h-3" />
                  Admin
                </Badge>
              )}
            </div>

            {/* Quick stats row */}
            <div className="flex items-center gap-6 mt-5">
              {quickStats.map((s) => (
                <div key={s.label} className="flex flex-col items-center">
                  <span className="text-lg font-bold text-foreground">{s.value}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3" style={stagger(2)}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`relative overflow-hidden flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} border border-border/20 backdrop-blur`}
            >
              <div className="w-11 h-11 rounded-xl bg-background/60 flex items-center justify-center border border-border/30">
                <stat.icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div className="space-y-3" style={stagger(3)}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                Continue Watching
              </h3>
              <span className="text-xs text-muted-foreground">{continueWatching.length} titles</span>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
              {continueWatching.slice(0, 6).map((item) => {
                const pct = item.duration > 0 ? Math.round((item.progress / item.duration) * 100) : 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => navigateToMovie(item.id, item.title, item.type)}
                    className="flex-shrink-0 w-32 rounded-2xl overflow-hidden bg-card/80 border border-border/30 group active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="aspect-[2/3] relative overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Remove button */}
                      <button
                        onClick={(e) => handleRemoveContinueWatching(e, item.id)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Play className="w-3 h-3 text-primary-foreground fill-primary-foreground" />
                          </div>
                          <span className="text-[10px] text-white font-medium">{pct}%</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-foreground p-2.5 truncate">
                      {item.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Watchlist Preview */}
        {watchlist.length > 0 && (
          <div className="space-y-3" style={stagger(4)}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-500" />
                My Watchlist
              </h3>
              <span className="text-xs text-muted-foreground">{watchlist.length} saved</span>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
              {watchlist.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigateToMovie(item.id, item.title, item.type)}
                  className="flex-shrink-0 w-28 rounded-2xl overflow-hidden bg-card/80 border border-border/30 active:scale-95 transition-transform cursor-pointer"
                >
                  <div className="aspect-[2/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <p className="text-[10px] font-medium text-foreground p-2 truncate">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="space-y-3" style={stagger(5)}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recently Viewed
              </h3>
              <button
                onClick={handleClearHistory}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
              {recentlyViewed.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigateToMovie(item.id, item.title, item.type)}
                  className="flex-shrink-0 w-24 rounded-xl overflow-hidden bg-card/80 border border-border/30 active:scale-95 transition-transform cursor-pointer"
                >
                  <div className="aspect-[2/3] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
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

        {/* Settings Section */}
        <div style={stagger(6)}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Settings
          </p>
          <div className="rounded-2xl bg-card/60 backdrop-blur border border-border/30 overflow-hidden divide-y divide-border/20">
            {/* Account Details */}
            <button
              onClick={() => user ? setEditProfileOpen(true) : navigate("/auth")}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 active:bg-accent/70 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/80 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Account Details</p>
                <p className="text-[11px] text-muted-foreground">Name, email, avatar</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Privacy & Security */}
            <button
              onClick={() => user ? setChangePasswordOpen(true) : navigate("/auth")}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 active:bg-accent/70 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/80 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Privacy & Security</p>
                <p className="text-[11px] text-muted-foreground">Change password</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>

            {/* Preferences */}
            <button
              onClick={() => setPreferencesOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-accent/50 active:bg-accent/70 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/80 flex items-center justify-center flex-shrink-0">
                <Settings className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Preferences</p>
                <p className="text-[11px] text-muted-foreground">Quality, autoplay</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin && (
          <div className="space-y-3" style={stagger(7)}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Administration
            </p>
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/15 active:bg-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Admin Panel</p>
                <p className="text-[11px] text-muted-foreground">Manage site, users & content</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary" />
            </button>
            <SendPushPanel />
          </div>
        )}

        {/* Sign Out / Sign In */}
        <div style={stagger(8)}>
          {user ? (
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full h-12 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/auth")}
              className="w-full h-12 rounded-2xl gap-2"
            >
              <User className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 pb-4" style={stagger(9)}>
          MovieBay v2.0 • Made with ♥
        </p>
      </div>
    </div>
  );
}
