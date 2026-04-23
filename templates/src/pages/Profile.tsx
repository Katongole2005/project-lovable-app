import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "next-themes";
import { getRecentlyViewed, getWatchlist, getUserRatings, removeContinueWatching } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Zap,
  TrendingUp,
  Sparkles,
  Bell,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFirstName(user?.user_metadata?.first_name || "");
      setLastName(user?.user_metadata?.last_name || "");
      setAvatarUrl(user?.user_metadata?.avatar_url || "");
    }
  }, [open, user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          first_name: firstName.trim(), 
          last_name: lastName.trim(),
          avatar_url: avatarUrl
        },
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
      <DialogContent className="sm:max-w-md rounded-2xl border-white/[0.06] bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Profile</DialogTitle>
          <DialogDescription>Update your display name and photo</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="relative group">
              <Avatar className="w-20 h-20 border-2 border-border/50">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {firstName?.[0] || user?.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                aria-label="Upload avatar"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
              aria-label="Select avatar file"
            />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Click to update photo</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <Button onClick={handleSave} disabled={saving || uploading} className="w-full h-11 rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
      <DialogContent className="sm:max-w-md rounded-2xl border-white/[0.06] bg-card/95 backdrop-blur-xl">
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
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
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
      <DialogContent className="sm:max-w-md rounded-2xl border-white/[0.06] bg-card/95 backdrop-blur-xl">
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
                  className={cn(
                    "py-2.5 rounded-xl text-sm font-medium border transition-all",
                    quality === q
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-foreground border-border/50 hover:bg-accent"
                  )}
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
            {autoplay ? (
              <button
                onClick={() => setAutoplay(false)}
                role="switch"
                aria-checked="true"
                aria-label="Toggle autoplay"
                className="w-12 h-7 rounded-full transition-colors relative bg-primary"
              >
                <div className="absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-transform translate-x-5" />
              </button>
            ) : (
              <button
                onClick={() => setAutoplay(true)}
                role="switch"
                aria-checked="false"
                aria-label="Toggle autoplay"
                className="w-12 h-7 rounded-full transition-colors relative bg-muted"
              >
                <div className="absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-transform translate-x-0.5" />
              </button>
            )}
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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.03, y: -4, transition: { type: "spring", stiffness: 300, damping: 20 } },
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const reducedMotion = useReducedMotion();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [watchlistFilter, setWatchlistFilter] = useState<"all" | "movie" | "series">("all");
  const [watchlistSort, setWatchlistSort] = useState<"newest" | "oldest">("newest");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"activity" | "watchlist" | "settings">("activity");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const headerBgOpacity = useTransform(scrollY, [0, 200], [0, 0.95]);
  const heroParallaxY = useTransform(scrollY, (v) => reducedMotion ? 0 : -v * 0.3);
  const [showCollapsedName, setShowCollapsedName] = useState(false);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => {
      const should = v > 120;
      setShowCollapsedName((prev) => prev !== should ? should : prev);
    });
    return unsub;
  }, [scrollY]);

  const recentlyViewed = getRecentlyViewed();
  const continueWatching = useContinueWatching();
  const watchlist = getWatchlist();
  const filteredWatchlist = useMemo(() => {
    const list = watchlistFilter === "all" 
      ? [...watchlist] 
      : watchlist.filter(item => item.type === watchlistFilter);
    return list.sort((a, b) => {
      const dateA = new Date(a.addedAt || 0).getTime();
      const dateB = new Date(b.addedAt || 0).getTime();
      return watchlistSort === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [watchlist, watchlistFilter, watchlistSort]);
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

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "New";

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

  const totalWatched = recentlyViewed.length;

  const stats = [
    { icon: Film, label: "Movies", value: movieCount, color: "from-blue-500 to-blue-600", bg: "bg-blue-500/10" },
    { icon: Tv, label: "Series", value: seriesCount, color: "from-purple-500 to-purple-600", bg: "bg-purple-500/10" },
    { icon: Bookmark, label: "Saved", value: watchlist.length, color: "from-amber-500 to-orange-500", bg: "bg-amber-500/10" },
    { icon: Star, label: "Rating", value: avgRating, color: "from-yellow-400 to-yellow-500", bg: "bg-yellow-500/10" },
  ];

  const tabs = [
    { id: "activity" as const, label: "Activity", icon: TrendingUp },
    { id: "watchlist" as const, label: "Watchlist", icon: Bookmark },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const settingsItems = [
    {
      icon: User, label: "Account Details", desc: "Name, email, avatar",
      onClick: () => setEditProfileOpen(true),
      color: "bg-blue-500/10", iconColor: "text-blue-400",
    },
    {
      icon: Shield, label: "Privacy & Security", desc: "Change password",
      onClick: () => setChangePasswordOpen(true),
      color: "bg-green-500/10", iconColor: "text-green-400",
    },
    {
      icon: Settings, label: "Preferences", desc: "Quality, autoplay",
      onClick: () => setPreferencesOpen(true),
      color: "bg-purple-500/10", iconColor: "text-purple-400",
    },
    {
      icon: Bell, label: "Notifications", desc: "Push notification settings",
      onClick: () => {},
      color: "bg-orange-500/10", iconColor: "text-orange-400",
      customContent: <PushNotificationButton />,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12" key={refreshKey}>
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} user={user} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />

      {/* === HERO HEADER === */}
      <div ref={heroRef} className="relative overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroParallaxY }}>
          <div
            className={cn(
              "absolute inset-0",
              isDark ? "bg-profile-hero-dark" : "bg-profile-hero-light"
            )}
          />
        </motion.div>

        {/* Sticky nav */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-3"
        >
          <motion.div
            className="absolute inset-0 border-b backdrop-blur-xl"
            style={{ opacity: headerBgOpacity, backgroundColor: "hsl(var(--background) / 0.95)", borderColor: "hsl(var(--border) / 0.1)" }}
          />
          <button onClick={() => navigate("/")} className="relative z-10 p-2.5 rounded-2xl bg-card/60 backdrop-blur-lg border border-border/20 hover:bg-accent/50 transition-colors" aria-label="Go back">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <AnimatePresence>
            {showCollapsedName && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="relative z-10 flex items-center gap-2">
                <Avatar className="w-7 h-7 border border-border/30">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="ml-auto flex gap-2 relative z-10">
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className="p-2.5 rounded-2xl bg-card/60 backdrop-blur-lg border border-border/20 hover:bg-accent/50 transition-colors" aria-label="Toggle theme">
              {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
            </button>
          </div>
        </motion.div>

        {/* Hero Card */}
        <div className="relative px-4 md:px-8 pt-4 pb-8">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <div className="relative">
              <Avatar className="w-28 h-28 md:w-32 md:h-32 relative z-10 border-4 border-background shadow-2xl">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-3xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <button onClick={() => setEditProfileOpen(true)} className="absolute -bottom-1 -right-1 z-20 w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg border-3 border-background" aria-label="Edit profile image">
                <Edit3 className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-left mt-3">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{displayName}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5 justify-center md:justify-start">
                <Mail className="w-3.5 h-3.5" /> {userEmail}
              </p>
              <div className="flex items-center gap-2 mt-3 justify-center md:justify-start flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary">
                  <Crown className="w-3 h-3" /> Free Plan
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] text-muted-foreground bg-muted/50">
                  <Sparkles className="w-3 h-3" /> Since {memberSince}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto grid grid-cols-4 gap-2 md:gap-3 mt-8">
            {stats.map((stat) => (
              <div key={stat.label} className={cn("flex flex-col items-center gap-1 py-4 px-2 rounded-2xl border border-border/20", stat.bg)}>
                <stat.icon className="w-5 h-5 text-muted-foreground mb-1" />
                <span className="text-xl font-bold text-foreground">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === TABBED CONTENT === */}
      <div className="max-w-3xl mx-auto px-4 md:px-8 mt-6">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 border border-border/20 mb-6 backdrop-blur-lg" role="tablist">
          {activeTab === "activity" ? (
            <button
              onClick={() => setActiveTab("activity")}
              role="tab"
              aria-selected="true"
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all text-foreground"
            >
              <motion.div layoutId="profile-tab" className="absolute inset-0 rounded-xl bg-card border border-border/30 shadow-sm" />
              <span className="relative z-10 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> <span className="hidden sm:inline">Activity</span>
              </span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab("activity")}
              role="tab"
              aria-selected="false"
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground/70"
            >
              <span className="relative z-10 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> <span className="hidden sm:inline">Activity</span>
              </span>
            </button>
          )}

          {activeTab === "watchlist" ? (
            <button
              onClick={() => setActiveTab("watchlist")}
              role="tab"
              aria-selected="true"
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all text-foreground"
            >
              <motion.div layoutId="profile-tab" className="absolute inset-0 rounded-xl bg-card border border-border/30 shadow-sm" />
              <span className="relative z-10 flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> <span className="hidden sm:inline">Watchlist</span>
              </span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab("watchlist")}
              role="tab"
              aria-selected="false"
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground/70"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> <span className="hidden sm:inline">Watchlist</span>
              </span>
            </button>
          )}

          {activeTab === "settings" ? (
            <button
              onClick={() => setActiveTab("settings")}
              role="tab"
              aria-selected="true"
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all text-foreground"
            >
              <motion.div layoutId="profile-tab" className="absolute inset-0 rounded-xl bg-card border border-border/30 shadow-sm" />
              <span className="relative z-10 flex items-center gap-2">
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Settings</span>
              </span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab("settings")}
              role="tab"
              aria-selected="false"
              className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:text-foreground/70"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Settings</span>
              </span>
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "activity" && (
            <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {!user && (
                <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 flex flex-col items-center text-center gap-4">
                  <Sparkles className="w-10 h-10 text-primary" />
                  <h3 className="text-lg font-bold">Join the Community</h3>
                  <p className="text-sm text-muted-foreground">Sign in to track your watch history and sync across devices.</p>
                  <Button onClick={() => navigate("/auth")} className="rounded-xl px-8">Sign In</Button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Eye, val: totalWatched, lbl: "Viewed" },
                  { icon: Clock, val: continueWatching.length, lbl: "Progress" },
                  { icon: Heart, val: ratings.length, lbl: "Rated" },
                ].map(s => (
                  <div key={s.lbl} className="flex flex-col items-center gap-1 py-4 rounded-2xl bg-card/60 border border-border/20">
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{s.val}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{s.lbl}</span>
                  </div>
                ))}
              </div>

              {continueWatching.length > 0 && (
                <ContentSection icon={<Play className="w-4 h-4 text-primary" />} title="Continue Watching">
                  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                    {continueWatching.map(item => (
                      <div key={item.id} onClick={() => navigateToMovie(item.contentId, item.title, item.type)} className="flex-shrink-0 w-36 rounded-xl overflow-hidden bg-card border border-border/20 cursor-pointer group">
                        <div className="aspect-[2/3] relative">
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-white">
                             <span>S{item.seasonNumber} E{item.episodeNumber}</span>
                             <span>{Math.round((item.progress / (item.duration || 1)) * 100)}%</span>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-[10px] font-bold truncate">{item.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ContentSection>
              )}

              {isAdmin && (
                <div className="space-y-3">
                  <button onClick={() => navigate("/admin")} className="w-full p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-bold">Admin Panel</p>
                        <p className="text-[10px] text-muted-foreground">Manage everything</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </button>
                  <SendPushPanel />
                </div>
              )}

              {user ? (
                <Button variant="outline" onClick={handleSignOut} className="w-full h-12 rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/10">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")} className="w-full h-12 rounded-2xl">Sign In</Button>
              )}
            </motion.div>
          )}

          {activeTab === "watchlist" && (
            <motion.div key="watchlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  {["all", "movie", "series"].map(f => (
                    <button key={f} onClick={() => setWatchlistFilter(f as any)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", watchlistFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {filteredWatchlist.map(item => (
                  <div key={item.id} onClick={() => navigateToMovie(item.id, item.title, item.type)} className="aspect-[2/3] rounded-xl overflow-hidden border border-border/20 cursor-pointer group">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {settingsItems.map(item => (
                <button key={item.label} onClick={item.onClick} className="w-full p-4 rounded-2xl bg-card border border-border/20 flex items-center gap-4 hover:bg-accent transition-colors text-left">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.color)}>
                    <item.icon className={cn("w-5 h-5", item.iconColor)} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                  {item.customContent || <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ContentSection({
  icon,
  title,
  count,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          {icon} {title}
        </h3>
        <div className="flex items-center gap-3">
          {count && <span className="text-xs text-muted-foreground">{count}</span>}
          {action}
        </div>
      </div>
      {children}
    </div>
  );
}
