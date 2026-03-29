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
          {/* Avatar preview and upload */}
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
              >
                {uploading ? (
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
          {/* Avatar preview and upload */}
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
              aria-label="Upload avatar"
            />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Click to update photo</p>
          </div>

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
              data-testid="input-new-password"
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
              data-testid="input-confirm-password"
              className="w-full px-3 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save-password" className="w-full h-11 rounded-xl gap-2">
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
                  data-testid={`button-quality-${q}`}
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
            <button
              onClick={() => setAutoplay(!autoplay)}
              data-testid="button-toggle-autoplay"
              role="switch"
              aria-checked={autoplay ? "true" : "false"}
              aria-label="Toggle autoplay"
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                autoplay ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-6 h-6 rounded-full bg-background shadow transition-transform",
                  autoplay ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
          <Button onClick={save} data-testid="button-save-preferences" className="w-full h-11 rounded-xl gap-2">
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
    let list = watchlistFilter === "all" 
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

  const handleClearHistory = useCallback(() => {
    localStorage.removeItem("recentMovies");
    setRefreshKey((k) => k + 1);
    toast.success("Watch history cleared");
  }, []);

  const totalWatched = recentlyViewed.length;
  const totalHours = Math.round(continueWatching.reduce((s, i) => s + (i.progress || 0), 0) / 3600);

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

  const headerOpacity = Math.min(scrollY / 200, 1);
  const heroParallax = reducedMotion ? 0 : scrollY * 0.3;

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-12" key={refreshKey}>
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} user={user} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />

      {/* === COLLAPSING HERO HEADER === */}
      <div ref={heroRef} className="relative overflow-hidden">
        {/* Parallax background */}
        <motion.div
          className="absolute inset-0"
          style={{ y: heroParallaxY }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: isDark
                ? "radial-gradient(ellipse 120% 80% at 50% 20%, hsl(210 100% 60% / 0.12), transparent 60%), radial-gradient(ellipse 100% 60% at 80% 30%, hsl(260 70% 55% / 0.08), transparent 50%), linear-gradient(180deg, hsl(230 18% 8%) 0%, hsl(230 18% 5%) 100%)"
                : "radial-gradient(ellipse 120% 80% at 50% 20%, hsl(210 60% 45% / 0.1), transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)",
            }}
          />
          {/* Animated mesh lines */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(0deg, transparent 24%, hsl(210 100% 60% / 0.15) 25%, hsl(210 100% 60% / 0.15) 26%, transparent 27%),
                linear-gradient(90deg, transparent 24%, hsl(210 100% 60% / 0.15) 25%, hsl(210 100% 60% / 0.15) 26%, transparent 27%)`,
              backgroundSize: "60px 60px",
            }}
          />
        </motion.div>

        {/* Floating orbs */}
        {!reducedMotion && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(210 100% 60% / 0.06), transparent 70%)" }}
            />
            <motion.div
              animate={{ x: [0, -30, 25, 0], y: [0, 25, -20, 0] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute top-20 -left-20 w-[250px] h-[250px] rounded-full"
              style={{ background: "radial-gradient(circle, hsl(260 70% 55% / 0.05), transparent 70%)" }}
            />
          </div>
        )}

        {/* Sticky nav bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-8 py-3"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
          }}
        >
          <motion.div
            className="absolute inset-0 border-b backdrop-blur-xl"
            style={{
              opacity: headerBgOpacity,
              backgroundColor: "hsl(var(--background) / 0.95)",
              borderColor: "hsl(var(--border) / 0.1)",
            }}
          />
          <motion.button
            onClick={() => navigate("/")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            data-testid="button-back"
            aria-label="Go back"
            className="relative z-10 p-2.5 rounded-2xl bg-card/60 backdrop-blur-lg border border-border/20 hover:bg-accent/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>

          <AnimatePresence>
            {showCollapsedName && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="relative z-10 flex items-center gap-2"
              >
                <Avatar className="w-7 h-7 border border-border/30">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold text-foreground font-display truncate">{displayName}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="ml-auto flex gap-2 relative z-10">
            <motion.button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              data-testid="button-theme-toggle"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2.5 rounded-2xl bg-card/60 backdrop-blur-lg border border-border/20 hover:bg-accent/50 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-foreground" /> : <Moon className="w-4 h-4 text-foreground" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Profile Hero Card */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="relative px-4 md:px-8 pt-4 pb-8"
        >
          <motion.div variants={itemVariants} className="max-w-3xl mx-auto">
            {/* Desktop: horizontal layout, Mobile: centered stack */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              {/* Avatar with animated ring */}
              <motion.div
                className="relative flex-shrink-0"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="relative">
                  {/* Animated ring */}
                  {!reducedMotion && (
                    <motion.div
                      className="absolute -inset-1.5 rounded-full"
                      style={{
                        background: "conic-gradient(from 0deg, hsl(210 100% 60%), hsl(260 70% 55%), hsl(180 70% 50%), hsl(210 100% 60%))",
                        padding: "2px",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <div className="w-full h-full rounded-full bg-background" />
                    </motion.div>
                  )}
                  <Avatar className="w-28 h-28 md:w-32 md:h-32 relative z-10 border-4 border-background shadow-2xl" data-testid="img-avatar">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-3xl md:text-4xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <motion.button
                    onClick={() => setEditProfileOpen(true)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    data-testid="button-edit-profile"
                    aria-label="Edit profile"
                    className="absolute -bottom-1 -right-1 z-20 w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 border-3 border-background"
                  >
                    <Edit3 className="w-4 h-4 text-primary-foreground" />
                  </motion.button>
                </div>
              </motion.div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left mt-1 md:mt-3">
                <motion.h2
                  variants={itemVariants}
                  className="text-2xl md:text-3xl font-bold text-foreground font-display tracking-tight"
                  data-testid="text-display-name"
                >
                  {displayName}
                </motion.h2>
                <motion.p variants={itemVariants} className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1.5 justify-center md:justify-start" data-testid="text-email">
                  <Mail className="w-3.5 h-3.5" />
                  {userEmail}
                </motion.p>
                <motion.div variants={itemVariants} className="flex items-center gap-2 mt-3 justify-center md:justify-start flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 text-primary">
                    <Crown className="w-3 h-3" />
                    Free Plan
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/20 text-amber-400">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-medium text-muted-foreground bg-muted/50 border border-border/30">
                    <Sparkles className="w-3 h-3" />
                    Since {memberSince}
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Stats strip */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-4 gap-2 md:gap-3 mt-8"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 200 }}
                  className={cn(
                    "relative flex flex-col items-center gap-1 py-4 px-2 rounded-2xl border border-border/20 overflow-hidden group cursor-default",
                    stat.bg
                  )}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(135deg, transparent 40%, hsl(var(--primary) / 0.03) 100%)` }}
                  />
                  <stat.icon className="w-5 h-5 text-muted-foreground mb-1" />
                  <motion.span
                    className="text-xl md:text-2xl font-bold text-foreground font-display"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 250 }}
                    data-testid={`text-stat-${stat.label.toLowerCase()}`}
                  >
                    {stat.value}
                  </motion.span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* === TABBED CONTENT AREA === */}
      <div className="max-w-3xl mx-auto px-4 md:px-8">
        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 border border-border/20 mb-6 sticky top-[60px] z-20 backdrop-blur-lg"
          style={{ top: "calc(env(safe-area-inset-top) + 52px)" }}
          role="tablist"
          aria-label="Profile sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id ? "true" : "false"}
              aria-controls={`tabpanel-${tab.id}`}
              className={cn(
                "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="profile-tab-indicator"
                  className="absolute inset-0 rounded-xl bg-card border border-border/30 shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "activity" && (
            <motion.div
              key="activity"
              role="tabpanel"
              id="tabpanel-activity"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {/* Guest CTA */}
              {!user && (
                <motion.div
                  variants={itemVariants}
                  className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 shadow-xl shadow-primary/5"
                >
                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center md:text-left">
                      <h3 className="text-xl font-bold font-display text-foreground mb-1">Unlock the Full Experience</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Sign up to sync your watchlist, ratings, and viewing progress across all your devices.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate("/auth")} 
                      className="md:ml-auto h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                    >
                      Join MovieBay
                    </Button>
                  </div>
                  {/* Decorative element */}
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                </motion.div>
              )}

              {/* Activity Summary */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { icon: Eye, value: totalWatched, label: "Viewed", color: "text-blue-400" },
                  { icon: Clock, value: continueWatching.length, label: "In Progress", color: "text-amber-400" },
                  { icon: Heart, value: ratings.length, label: "Rated", color: "text-red-400" },
                ].map((item) => (
                  <motion.div
                    key={item.label}
                    variants={itemVariants}
                    className="flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-card/60 border border-border/20 backdrop-blur"
                  >
                    <item.icon className={cn("w-5 h-5", item.color)} />
                    <span className="text-lg font-bold text-foreground" data-testid={`text-activity-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>{item.value}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* Continue Watching */}
              {continueWatching.length > 0 && (
                <ContentSection
                  icon={<Play className="w-4 h-4 text-primary" />}
                  title="Continue Watching"
                  count={`${continueWatching.length} titles`}
                >
                  <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 md:-mx-8 px-4 md:px-8 pb-2 snap-x snap-mandatory">
                    {continueWatching.slice(0, 8).map((item, i) => {
                      const pct = item.duration > 0 ? Math.round((item.progress / item.duration) * 100) : 0;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          variants={cardHover}
                          whileHover="hover"
                          onClick={() => navigateToMovie(item.contentId, item.title, item.type)}
                          data-testid={`card-continue-${item.id}`}
                          className="flex-shrink-0 w-[140px] md:w-[160px] snap-start rounded-2xl overflow-hidden bg-card/80 border border-border/20 group cursor-pointer"
                        >
                          <div className="aspect-[2/3] relative overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              loading="lazy"
                            />
                            <motion.button
                              onClick={(e) => handleRemoveContinueWatching(e, item.id)}
                              whileTap={{ scale: 0.85 }}
                              aria-label={`Remove ${item.title}`}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </motion.button>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                                <Play className="w-3 h-3 text-primary-foreground fill-primary-foreground ml-0.5" />
                              </div>
                              <span className="text-[11px] text-white/90 font-bold">{pct}%</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                              <motion.div
                                className="h-full bg-primary rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                          <div className="p-2.5">
                            <p className="text-[11px] font-semibold text-foreground truncate">{item.title}</p>
                            {item.seasonNumber && item.episodeNumber && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                S{item.seasonNumber} E{item.episodeNumber}
                              </p>
                            )}
                  <motion.div
                    className="absolute top-1 w-6 h-6 rounded-full bg-background shadow flex items-center justify-center"
                    animate={{ x: isDark ? 28 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    {isDark ? <Moon className="w-3 h-3 text-primary" /> : <Sun className="w-3 h-3 text-amber-500" />}
                  </motion.div>
                </button>
              </motion.div>

              {/* Admin Section */}
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Administration
                  </p>
                  <motion.button
                    onClick={() => navigate("/admin")}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    data-testid="button-admin-panel"
                    className="w-full flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:from-primary/15 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-foreground">Admin Panel</p>
                      <p className="text-[11px] text-muted-foreground">Manage site, users & content</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </motion.button>
                  <SendPushPanel />
                </motion.div>
              )}

              {/* Sign Out */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {user ? (
                  <motion.button
                    onClick={handleSignOut}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-sign-out"
                    className="w-full h-12 rounded-2xl border border-destructive/20 text-destructive hover:bg-destructive/10 transition-all flex items-center justify-center gap-2 font-semibold text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </motion.button>
                ) : (
                  <Button
                    onClick={() => navigate("/auth")}
                    data-testid="button-sign-in"
                    className="w-full h-12 rounded-2xl gap-2"
                  >
                    <User className="w-4 h-4" />
                    Sign In
                  </Button>
                )}
              </motion.div>

              <p className="text-center text-[10px] text-muted-foreground/40 pb-4">
                MovieBay v2.0
              </p>
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
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground font-display flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-3">
          {count && <span className="text-[11px] text-muted-foreground">{count}</span>}
          {action}
        </div>
      </div>
      {children}
    </motion.div>
  );
}
