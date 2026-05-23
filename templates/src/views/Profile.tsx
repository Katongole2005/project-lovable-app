"use client";
import { lazy, Suspense, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { useNavigate } from "@/lib/router-polyfill";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "next-themes";
import { getRecentlyViewed, getWatchlist, getUserRatings, clearAllStorageData } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Lock,
  X,
  Check,
  Loader2,
  Trash2,
  TrendingUp,
  Bell,
  Camera,
  Trophy,
  Medal,
  Clock8,
  Download,
  Activity,
  Users,
  Gift,
  Award,
} from "lucide-react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { cn } from "@/lib/utils";

const SendPushPanel = lazy(() =>
  import("@/components/SendPushPanel").then((module) => ({ default: module.SendPushPanel }))
);

const preloadHomePage = () => {
  void import("./ClientHome");
};

function ClearDataDialog({
  open,
  onOpenChange,
  onClear
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onClear: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-white/[0.06] bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-bold">Clear All Data?</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            This will permanently delete your **Continue Watching** history, **Watchlist**, and **Search History**. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button 
            variant="destructive" 
            onClick={() => { onClear(); onOpenChange(false); }}
            className="w-full h-12 rounded-xl font-bold"
          >
            Yes, Clear Everything
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-xl font-bold border border-white/5"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

const itemVariants: any = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const formatWatchTime = (value: unknown) => {
  const totalMinutes = Math.max(0, Math.floor(Number(value) || 0));
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

const getDisplayName = (user: any) =>
  user?.display_name || user?.full_name || user?.username || "MovieBay Fan";

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MB";
  return parts.slice(0, 2).map(part => part[0]).join("").toUpperCase();
};

const getNumber = (value: unknown) => Math.max(0, Number(value) || 0);

const getRankStyle = (rank: number) => {
  if (rank === 1) {
    return {
      ring: "border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)]",
      badge: "from-amber-300 to-amber-500",
      icon: <Trophy className="w-5 h-5 text-amber-950" />,
      label: "Champion",
    };
  }
  if (rank === 2) {
    return {
      ring: "border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)]",
      badge: "from-slate-200 to-slate-400",
      icon: <Medal className="w-4 h-4 text-slate-900" />,
      label: "Runner Up",
    };
  }
  return {
    ring: "border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.2)]",
    badge: "from-orange-300 to-orange-500",
    icon: <Award className="w-4 h-4 text-orange-950" />,
    label: "Top Three",
  };
};

const LeaderboardStat = ({ icon, label, value, title }: { icon: ReactNode, label: string, value: string, title?: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 backdrop-blur-sm" title={title}>
    <span className="flex min-w-0 items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-widest">
      {icon}
      <span className="truncate">{label}</span>
    </span>
    <span className="shrink-0 text-xs font-black tabular-nums text-white">{value}</span>
  </div>
);

const PodiumItem = ({ user, rank, points }: { user: any, rank: number, points: number }) => {
  const isFirst = rank === 1;
  const name = getDisplayName(user);
  const rankStyle = getRankStyle(rank);
  const watchTime = formatWatchTime(user.watch_time);
  const rawWatchMinutes = Math.floor(getNumber(user.watch_time));
  const downloads = Math.floor(getNumber(user.downloads));

  return (
    <motion.div
      className={cn(
        "flex min-w-0 flex-col items-center gap-4 relative",
        rank === 2 && "pt-8 md:pt-16",
        rank === 3 && "pt-8 md:pt-16"
      )}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * rank, type: "spring", stiffness: 100 }}
    >
      <div className={cn("relative", isFirst ? "w-28 h-28 md:w-36 md:h-36" : "w-20 h-20 md:w-28 md:h-28")}>
        <div className={cn("absolute -inset-4 rounded-full bg-gradient-to-br opacity-20 blur-2xl", rankStyle.badge)} />
        <Avatar className={cn("h-full w-full border-4 relative z-10", rankStyle.ring)}>
          <AvatarImage src={user.avatar_url} alt={name} className="object-cover" />
          <AvatarFallback className="bg-slate-900 text-2xl font-black text-white">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -right-2 -top-2 z-20 flex items-center justify-center rounded-full bg-gradient-to-br shadow-xl border-2 border-black",
          rankStyle.badge,
          isFirst ? "h-12 w-12" : "h-10 w-10"
        )}>
          {rankStyle.icon}
        </div>
      </div>

      <div className="w-full min-w-0 text-center space-y-1">
        <p className={cn("truncate font-black text-white", isFirst ? "text-lg md:text-xl" : "text-sm md:text-base")}>{name}</p>
        <p className={cn(
          "bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text font-black text-transparent tabular-nums drop-shadow-sm",
          isFirst ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
        )}>
          {points.toLocaleString()}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{rankStyle.label}</p>
      </div>

      <div className="flex w-full flex-col gap-2 px-2 mt-2">
        <LeaderboardStat icon={<Clock className="h-3 w-3 text-indigo-400" />} label="Watch" value={watchTime} title={`${rawWatchMinutes.toLocaleString()} minutes watched`} />
        <LeaderboardStat icon={<Download className="h-3 w-3 text-fuchsia-400" />} label="Dls" value={downloads.toLocaleString()} />
      </div>
    </motion.div>
  );
};

const LeaderboardCard = ({ user, rank, points, isCurrentUser }: { user: any, rank: number, points: number, isCurrentUser: boolean }) => {
  const name = getDisplayName(user);
  const watchTime = formatWatchTime(user.watch_time);
  const rawWatchMinutes = Math.floor(getNumber(user.watch_time));
  const downloads = Math.floor(getNumber(user.downloads));

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      initial="hidden"
      animate="visible"
      className={cn(
        "group rounded-2xl border bg-black/40 p-4 shadow-xl backdrop-blur-xl transition-all duration-300",
        isCurrentUser
          ? "border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] bg-indigo-500/10"
          : "border-white/5 hover:border-white/20 hover:bg-white/[0.02]"
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-black/50 shadow-inner",
          isCurrentUser ? "border-indigo-500/50" : "border-white/10 group-hover:border-white/30"
        )}>
          <span className={cn("text-sm font-black tabular-nums", isCurrentUser ? "text-indigo-400" : "text-white/50 group-hover:text-white")}>{rank}</span>
        </div>

        <div className="relative shrink-0">
          <Avatar className="h-12 w-12 border border-white/10 transition-all md:h-14 md:w-14">
            <AvatarImage src={user.avatar_url} alt={name} className="object-cover" />
            <AvatarFallback className="bg-slate-800 text-xs font-black text-indigo-200">{getInitials(name)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-black text-white md:text-base">{name}</p>
            {isCurrentUser && (
              <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-300">
                You
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <span className="flex items-center gap-1" title={`${rawWatchMinutes.toLocaleString()} minutes watched`}>
              <Clock className="h-3 w-3 text-indigo-400" />
              {watchTime}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3 text-fuchsia-400" />
              {downloads.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-xl font-black text-transparent tabular-nums md:text-2xl drop-shadow-sm">
            {points.toLocaleString()}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-white/30">points</p>
        </div>
      </div>
    </motion.div>
  );
};

const LeaderboardLoading = () => (
  <div className="rounded-[2rem] border border-white/5 bg-black/40 px-6 py-24 shadow-2xl backdrop-blur-xl">
    <div className="flex flex-col items-center justify-center gap-4 text-white/40">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      <p className="text-xs font-black uppercase tracking-[0.2em]">Loading the leaderboard</p>
    </div>
  </div>
);

const LeaderboardEmpty = () => (
  <div className="rounded-[2rem] border border-white/5 bg-black/40 px-6 py-24 text-center shadow-2xl backdrop-blur-xl">
    <Trophy className="mx-auto mb-4 h-12 w-12 text-white/20" />
    <p className="text-lg font-black text-white">No leaderboard data yet</p>
    <p className="mt-2 text-sm text-white/40">Watch movies and collect points to appear here.</p>
  </div>
);

const LeaderboardSection = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("");
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"all" | "top">("all");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data: leaderboardData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('activity_points', { ascending: false })
        .order('watch_time', { ascending: false })
        .limit(100);
      
      if (!error && leaderboardData) setData(leaderboardData);
      setLoading(false);
    };

    fetchLeaderboard();

    const updateCountdown = () => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const diff = Math.max(0, nextMonth.getTime() - now.getTime());
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${d}D ${h}H ${m}M ${s}S`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) return <LeaderboardLoading />;
  if (data.length === 0) return <LeaderboardEmpty />;

  const rankedData = data.map((entry) => ({
    ...entry,
    activity_points: Math.floor(getNumber(entry.activity_points)),
  }));
  const visibleData = activeLeaderboardTab === "top" ? rankedData.slice(0, 20) : rankedData;
  const podium = visibleData.slice(0, 3);
  const list = visibleData.slice(3);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">MovieBay rankings</p>
          <h3 className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-3xl font-black tracking-tight text-transparent">
            Leaderboard
          </h3>
          <p className="mt-2 text-xs font-bold text-white/50 uppercase tracking-widest">Compete with fans by watch time & downloads.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
            {[
              { value: "all" as const, label: "All Time" },
              { value: "top" as const, label: "Top 20" },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveLeaderboardTab(tab.value)}
                className={cn(
                  "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeLeaderboardTab === tab.value
                    ? "bg-indigo-500 text-white shadow-lg"
                    : "text-white/40 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-black/40 border border-white/5 backdrop-blur-sm">
            <Clock8 className="w-4 h-4 text-indigo-400" />
            <div className="text-left">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Resets in</p>
              <p className="text-xs font-black tabular-nums text-white">{countdown}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/5 bg-gradient-to-b from-white/[0.05] to-black/20 p-6 md:p-10 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="grid grid-cols-3 gap-4 md:gap-8 lg:gap-12 relative z-10">
          {podium[1] && <PodiumItem user={podium[1]} rank={2} points={podium[1].activity_points} />}
          {podium[0] && <PodiumItem user={podium[0]} rank={1} points={podium[0].activity_points} />}
          {podium[2] && <PodiumItem user={podium[2]} rank={3} points={podium[2].activity_points} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {list.map((item, idx) => (
          <LeaderboardCard 
            key={item.id} 
            user={item} 
            rank={idx + 4} 
            points={item.activity_points} 
            isCurrentUser={user?.id === item.id}
          />
        ))}
      </div>
    </div>
  );
};

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [shouldCheckAdmin, setShouldCheckAdmin] = useState(false);
  const { isAdmin } = useAdmin({ enabled: shouldCheckAdmin });

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "watchlist" | "leaderboard" | "settings">("activity");
  const [watchlistFilter, setWatchlistFilter] = useState<"all" | "movie" | "series">("all");
  const [watchlistSort, setWatchlistSort] = useState<"newest" | "oldest">("newest");
  const [refreshKey, setRefreshKey] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [showCollapsedName, setShowCollapsedName] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const [localProfileData, setLocalProfileData] = useState(() => ({
    recentlyViewed: getRecentlyViewed(),
    watchlist: getWatchlist(),
    ratings: getUserRatings(),
  }));

  useEffect(() => {
    const timer = window.setTimeout(() => setShouldCheckAdmin(true), 350);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(preloadHomePage, 100);
    return () => window.clearTimeout(timer);
  }, []);

  const handleClaimDaily = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_daily_points" as any, { user_id: user.id });
      if (error) throw error;
      const result = data as any;
      if (result.success) {
        toast.success(result.message);
        setRefreshKey(k => k + 1);
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClaiming(false);
    }
  };

  const copyReferral = () => {
    const code = profile?.referral_code || user?.id.slice(0, 8);
    const link = `${(typeof window !== "undefined" ? window.location : { origin: "", pathname: "", search: "", href: "" }).origin}/auth?ref=${code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  };

  const nextClaimTime = profile?.last_claimed_at 
    ? new Date(new Date(profile.last_claimed_at).getTime() + 24 * 60 * 60 * 1000)
    : null;
  const canClaim = !nextClaimTime || nextClaimTime < new Date();

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
    
    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, 
        (payload) => setProfile(payload.new))
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [user, refreshKey]);

  useEffect(() => {
    const unsub = scrollY.on("change", (v) => {
      const should = v > 120;
      setShowCollapsedName((prev) => prev !== should ? should : prev);
    });
    return unsub;
  }, [scrollY]);

  const { recentlyViewed, watchlist, ratings } = localProfileData;
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

  const stats = [
    { icon: Film, label: "Movies", value: movieCount },
    { icon: Tv, label: "Series", value: seriesCount },
    { icon: Bookmark, label: "Saved", value: watchlist.length },
    { icon: Star, label: "Rating", value: avgRating },
  ];

  const tabs = [
    { id: "activity" as const, label: "Activity", icon: TrendingUp },
    { id: "watchlist" as const, label: "Watchlist", icon: Bookmark },
    { id: "leaderboard" as const, label: "Leaderboard", icon: Trophy },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  const settingsItems = [
    {
      icon: User, label: "Account Details", desc: "Name, email, avatar",
      onClick: () => user ? setEditProfileOpen(true) : navigate("/auth"),
      color: "bg-blue-500/10", iconColor: "text-blue-400",
    },
    {
      icon: Shield, label: "Privacy & Security", desc: "Change password",
      onClick: () => user ? setChangePasswordOpen(true) : navigate("/auth"),
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
    },
    {
      icon: Trash2, label: "Storage & Data", desc: "Clear history and watchlist",
      onClick: () => setClearDataOpen(true),
      color: "bg-red-500/10", iconColor: "text-red-400",
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
    <div className="min-h-screen bg-[#050508] text-white selection:bg-indigo-500/30 overflow-hidden relative font-sans">
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} user={user} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
      <ClearDataDialog 
        open={clearDataOpen} 
        onOpenChange={setClearDataOpen} 
        onClear={() => {
          clearAllStorageData();
          setLocalProfileData({ recentlyViewed: [], watchlist: [], ratings: [] });
          setRefreshKey(k => k + 1);
          toast.success("All local data has been cleared.");
        }} 
      />

      {/* Lightweight Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
          className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600 via-indigo-900/20 to-transparent" 
        />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] opacity-[0.08] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600 via-cyan-900/20 to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-12">
        
        {/* Navigation Header */}
        <header className="flex items-center justify-between mb-8 md:mb-12">
          <button 
            onPointerDown={preloadHomePage}
            onTouchStart={preloadHomePage}
            onMouseEnter={preloadHomePage}
            onClick={() => navigate("/")} 
            className="group flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] backdrop-blur-md transition-all shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-wider">Back to Movies</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTheme(isDark ? "light" : "dark")} 
              className="p-3 rounded-full bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.08] backdrop-blur-md transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user ? (
              <button 
                onClick={handleSignOut}
                className="px-6 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all text-xs font-bold uppercase tracking-wider backdrop-blur-md"
              >
                Log Out
              </button>
            ) : (
              <button 
                onClick={() => navigate("/auth")}
                className="px-6 py-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white transition-all text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* BENTO BOX GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* LEFT: HERO & STATS (Cols 1-4) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Identity Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="relative p-8 rounded-[2rem] border border-white/[0.08] bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="absolute -inset-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-500" />
                  <Avatar className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-white/20 relative z-10 shadow-2xl">
                    <AvatarImage src={user?.user_metadata?.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-slate-900 text-4xl font-black text-indigo-400">{initials}</AvatarFallback>
                  </Avatar>
                  <button 
                    onClick={() => setEditProfileOpen(true)}
                    className="absolute bottom-0 right-0 z-20 w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:bg-indigo-400 hover:scale-110 transition-all border-2 border-black"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-3xl font-black text-white tracking-tight mb-2">{displayName}</h2>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">
                    Lvl {profile?.level || 1}
                  </span>
                  <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{memberSince}</span>
                </div>
                <p className="text-sm font-medium text-white/40 mb-6 truncate w-full max-w-[200px]">{userEmail}</p>

                {/* Progress Bar */}
                {profile && (
                  <div className="w-full space-y-2 mt-2">
                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-white/40">
                      <span>XP Progress</span>
                      <span className="text-indigo-300">{(profile.activity_points % 500)} / 500</span>
                    </div>
                    <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (profile.activity_points % 500) / 5)}%` }}
                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Stats Bento Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Watch Time", value: formatWatchTime(profile?.watch_time || 0), icon: Clock, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
                { label: "Downloads", value: Math.floor(getNumber(profile?.downloads)).toLocaleString(), icon: Download, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                { label: "Total Points", value: Math.floor(getNumber(profile?.activity_points)).toLocaleString(), icon: Trophy, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", colSpan: 2 },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 + (i * 0.05) }}
                  className={cn(
                    "p-5 rounded-3xl border bg-black/40 backdrop-blur-xl flex flex-col items-start gap-3 hover:-translate-y-1 transition-transform",
                    stat.border, stat.colSpan === 2 ? "col-span-2 flex-row items-center justify-between" : ""
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", stat.bg)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className={cn("font-black tracking-tight", stat.colSpan === 2 ? "text-3xl" : "text-2xl")}>{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleClaimDaily}
                disabled={!canClaim || claiming}
                className={cn(
                  "p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border backdrop-blur-xl",
                  canClaim 
                    ? "bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border-indigo-500/40 text-white hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
                    : "bg-black/20 border-white/5 text-white/20"
                )}
              >
                <Gift className={cn("w-5 h-5", canClaim ? "text-fuchsia-400 animate-pulse" : "opacity-30")} />
                <span className="text-[10px] font-black uppercase tracking-widest">{canClaim ? "Daily Claim" : "Claimed"}</span>
              </button>

              <button
                onClick={copyReferral}
                className="p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/[0.05] hover:border-white/20 transition-all group"
              >
                <Users className="w-5 h-5 text-white/40 group-hover:text-cyan-400 transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">Invite</span>
              </button>
            </div>
          </div>

          {/* RIGHT: TABS & CONTENT (Cols 5-12) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Pill Segmented Navigation */}
            <div className="relative p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 grid grid-cols-2 md:flex md:overflow-x-auto scrollbar-none shadow-2xl gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative w-full md:flex-1 md:min-w-[100px] flex items-center justify-center gap-2 px-3 py-3 md:px-4 rounded-xl transition-all outline-none",
                      isActive ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl"
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
                      <tab.icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isActive ? "text-indigo-400" : "")} />
                      <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">{tab.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT AREA */}
            <div className="flex-1 bg-black/20 backdrop-blur-xl border border-white/[0.05] rounded-[2rem] p-6 md:p-8 min-h-[500px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {/* ACTIVITY TAB */}
                  {activeTab === "activity" && (
                    <div className="space-y-12">
                      {/* Recently Viewed */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-white/60 uppercase tracking-[0.2em]">Recently Viewed</h3>
                          <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">View All</button>
                        </div>
                        {recentlyViewed.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {recentlyViewed.slice(0, 5).map((item, i) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                onClick={() => navigateToMovie(item.id, item.title, item.type)}
                                className="group cursor-pointer space-y-3 relative"
                              >
                                <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative shadow-xl">
                                  <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/90 backdrop-blur-sm flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                                      <Play className="w-5 h-5 fill-current ml-1" />
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-1 px-1">
                                  <p className="text-[11px] font-black text-white truncate leading-tight">{item.title}</p>
                                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{item.type}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 text-white/20">
                            <Clock className="w-8 h-8" />
                            <p className="text-xs font-black uppercase tracking-widest">No watch history yet</p>
                          </div>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/[0.05]">
                          <button 
                            onClick={() => navigate("/admin")} 
                            className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 hover:bg-indigo-500/10 transition-all text-left group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                              <Shield className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h4 className="text-sm font-black mb-1 uppercase tracking-widest text-indigo-100">Admin Dashboard</h4>
                            <p className="text-xs text-indigo-200/50 leading-relaxed font-medium">Manage movies, series, and global site settings.</p>
                          </button>
                          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
                            <Suspense fallback={null}>
                              <SendPushPanel />
                            </Suspense>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WATCHLIST TAB */}
                  {activeTab === "watchlist" && (
                    <div className="space-y-8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/20 p-2 rounded-2xl border border-white/[0.05]">
                        <div className="flex items-center gap-3 px-3">
                          <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                            <Bookmark className="w-4 h-4 text-pink-400" />
                          </div>
                          <h3 className="text-sm font-black uppercase tracking-widest">My List</h3>
                        </div>
                        <div className="flex gap-1 bg-black/40 p-1 rounded-xl">
                          {["all", "movie", "series"].map(f => (
                            <button 
                              key={f} 
                              onClick={() => setWatchlistFilter(f as any)} 
                              className={cn(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                watchlistFilter === f ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredWatchlist.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {filteredWatchlist.map((item, i) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                              whileHover={{ y: -5, scale: 1.02 }}
                              onClick={() => navigateToMovie(item.id, item.title, item.type)}
                              className="group cursor-pointer space-y-3 relative"
                            >
                              <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative shadow-xl">
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3">
                                  <span className="text-[9px] font-black text-white/80 uppercase tracking-widest bg-black/40 px-2 py-1 rounded-md backdrop-blur-md">{item.type}</span>
                                </div>
                              </div>
                              <p className="text-[11px] font-black text-white truncate px-1">{item.title}</p>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-24 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 text-white/20">
                          <Bookmark className="w-12 h-12 stroke-[1.5]" />
                          <p className="text-xs font-black uppercase tracking-widest">Watchlist is empty</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LEADERBOARD TAB */}
                  {activeTab === "leaderboard" && (
                    <LeaderboardSection />
                  )}

                  {/* SETTINGS TAB */}
                  {activeTab === "settings" && (
                    <div className="max-w-3xl space-y-10">
                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-white/50 uppercase tracking-[0.2em] ml-2">Account Management</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {settingsItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button 
                                key={item.label} 
                                onClick={item.onClick}
                                className="w-full flex items-center justify-between p-5 rounded-2xl bg-black/40 border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 hover:shadow-xl transition-all group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", item.color)}>
                                    <Icon className={cn("w-5 h-5", item.iconColor)} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-black text-white/90 group-hover:text-white transition-colors">{item.label}</p>
                                    <p className="text-[10px] text-white/40 font-medium mt-0.5">{item.desc}</p>
                                  </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
