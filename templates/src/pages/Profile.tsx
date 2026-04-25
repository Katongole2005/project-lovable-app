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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-primary/30 overflow-hidden relative">
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} user={user} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />

      {/* Cinematic Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-12">
        
        {/* Navigation Header */}
        <header className="flex items-center justify-between mb-10">
          <button 
            onClick={() => navigate("/")} 
            className="group flex items-center gap-3 px-5 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold tracking-tight">Back to Movies</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(isDark ? "light" : "dark")} 
              className="p-3 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] transition-all"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleSignOut}
              className="px-5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-all text-sm font-bold"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Identity & Stats (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Identity Card */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <div className="relative p-8 rounded-lg bg-black/40 backdrop-blur-3xl border border-white/10 overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                </div>
                
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-white/20 relative group/avatar">
                    <Avatar className="w-full h-full rounded-none">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary/20 text-primary text-4xl font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <button 
                      onClick={() => setEditProfileOpen(true)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-1">{displayName}</h2>
                <p className="text-white/40 text-sm mb-6 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> {userEmail}
                </p>

                <div className="space-y-4">
                  <div className="flex justify-between items-end text-xs mb-1">
                    <span className="text-white/60 font-bold uppercase tracking-wider">Level 12 Buff</span>
                    <span className="text-primary font-bold">780 / 1000 XP</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '78%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Bento Cards */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, idx) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="p-5 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group"
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", stat.bg)}>
                    <stat.icon className="w-5 h-5 text-white/80" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Settings Bento Card */}
            <div className="p-6 rounded-lg bg-white/[0.03] border border-white/5">
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-6">Security & Preferences</h3>
              <div className="space-y-3">
                {settingsItems.map(item => (
                  <button 
                    key={item.label} 
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.color)}>
                        <item.icon className={cn("w-4 h-4", item.iconColor)} />
                      </div>
                      <span className="text-sm font-medium text-white/80">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Activity & Content (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Watchlist Section */}
            <div className="p-8 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Bookmark className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold">Your Watchlist</h3>
                </div>
                <div className="flex gap-2">
                  {["all", "movie", "series"].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setWatchlistFilter(f as any)} 
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold transition-all border",
                        watchlistFilter === f ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                      )}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {filteredWatchlist.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredWatchlist.slice(0, 8).map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * idx }}
                      onClick={() => navigateToMovie(item.id, item.title, item.type)}
                      className="aspect-[2/3] rounded-lg overflow-hidden border border-white/10 cursor-pointer group relative"
                    >
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider line-clamp-1">{item.title}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
                  <Bookmark className="w-16 h-16 stroke-[1]" />
                  <p className="text-sm font-medium">Your watchlist is empty</p>
                </div>
              )}
            </div>

            {/* Recently Viewed Grid */}
            <div className="p-8 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <Clock className="w-6 h-6 text-secondary" />
                <h3 className="text-xl font-bold">Recent History</h3>
              </div>
              
              <div className="space-y-4">
                {recentlyViewed.length > 0 ? (
                  recentlyViewed.slice(0, 5).map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * idx }}
                      onClick={() => navigateToMovie(item.id, item.title, item.type)}
                      className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer group"
                    >
                      <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.title}</h4>
                        <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1 font-bold">{item.type} • {item.year || '2024'}</p>
                      </div>
                      <div className="flex items-center gap-4 pr-2">
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] text-white/30 font-bold uppercase">Seen</span>
                           <span className="text-xs text-white/60 font-medium">Just now</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-primary transition-colors" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                   <p className="text-center py-10 text-white/20 text-sm">No activity recorded yet.</p>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => navigate("/admin")} 
                  className="p-8 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h4 className="text-xl font-bold mb-2">Admin Dashboard</h4>
                  <p className="text-sm text-white/40 leading-relaxed">Global system management, movie uploads, and site analytics.</p>
                </button>
                <div className="p-8 rounded-lg bg-white/[0.03] border border-white/5">
                  <SendPushPanel />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
