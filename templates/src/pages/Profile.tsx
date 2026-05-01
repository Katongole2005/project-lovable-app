import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "next-themes";
import { getRecentlyViewed, getWatchlist, getUserRatings, removeContinueWatching, clearAllStorageData } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useContinueWatching } from "@/hooks/useContinueWatching";
import { AlertTriangle } from "lucide-react";
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
  Trophy,
  Medal,
  Clock8,
  Download,
  Activity,
  Users,
  Gift,
  Gem,
  Share2,
  Award,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

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

const itemVariants = {
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
      ring: "border-amber-400 shadow-amber-500/30",
      badge: "from-amber-300 to-amber-500",
      icon: <Trophy className="w-4 h-4 text-white" />,
      label: "Champion",
    };
  }

  if (rank === 2) {
    return {
      ring: "border-slate-300 shadow-slate-300/20",
      badge: "from-slate-200 to-slate-400",
      icon: <Medal className="w-4 h-4 text-white" />,
      label: "Runner Up",
    };
  }

  return {
    ring: "border-orange-400 shadow-orange-500/20",
    badge: "from-orange-300 to-orange-500",
    icon: <Award className="w-4 h-4 text-white" />,
    label: "Top Three",
  };
};

const LeaderboardStat = ({
  icon,
  label,
  value,
  title,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  title?: string;
}) => (
  <div
    className="flex items-center justify-between gap-3 rounded-xl border border-cyan-400/10 bg-white/[0.07] px-3 py-2 backdrop-blur-sm"
    title={title}
  >
    <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold text-slate-200">
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
        "flex min-w-0 flex-col items-center gap-3",
        rank === 2 && "pt-8 md:pt-12",
        rank === 3 && "pt-8 md:pt-12"
      )}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.1 * rank, type: "spring", stiffness: 120, damping: 18 }}
    >
      <div className={cn("relative", isFirst ? "w-24 h-24 md:w-28 md:h-28" : "w-20 h-20 md:w-24 md:h-24")}>
        <div className={cn("absolute -inset-2 rounded-full bg-gradient-to-br opacity-20 blur-xl", rankStyle.badge)} />
        <Avatar className={cn("h-full w-full border-4 shadow-2xl", rankStyle.ring)}>
          <AvatarImage src={user.avatar_url} alt={name} />
          <AvatarFallback className="bg-slate-800 text-lg font-black text-cyan-100">{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className={cn(
          "absolute -right-2 -top-2 flex items-center justify-center rounded-full bg-gradient-to-br shadow-lg",
          rankStyle.badge,
          isFirst ? "h-9 w-9" : "h-8 w-8"
        )}>
          {rankStyle.icon}
        </div>
      </div>

      <div className="w-full min-w-0 text-center">
        <p className={cn("truncate font-black text-white", isFirst ? "text-base md:text-lg" : "text-sm md:text-base")}>{name}</p>
        <p className={cn(
          "bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text font-black text-transparent tabular-nums",
          isFirst ? "text-xl md:text-2xl" : "text-lg md:text-xl"
        )}>
          {points.toLocaleString()}
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{rankStyle.label}</p>
      </div>

      <div className="flex w-full flex-col gap-2 px-1">
        <LeaderboardStat
          icon={<Clock className="h-3.5 w-3.5 text-cyan-300" />}
          label="Watch"
          value={watchTime}
          title={`${rawWatchMinutes.toLocaleString()} minutes watched`}
        />
        <LeaderboardStat
          icon={<Download className="h-3.5 w-3.5 text-emerald-300" />}
          label="Downloads"
          value={downloads.toLocaleString()}
        />
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
      whileHover={{ scale: 1.015, y: -2 }}
      initial="hidden"
      animate="visible"
      className={cn(
        "group rounded-2xl border bg-gradient-to-br from-slate-800/70 to-slate-950/70 p-4 shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-300",
        isCurrentUser
          ? "border-emerald-300/50 shadow-emerald-500/10"
          : "border-cyan-500/10 hover:border-cyan-400/35 hover:shadow-cyan-500/10"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-gradient-to-br from-slate-700 to-slate-900",
          isCurrentUser ? "border-emerald-300/50" : "border-cyan-400/20 group-hover:border-cyan-300/40"
        )}>
          <span className="text-sm font-black tabular-nums text-cyan-300">{rank}</span>
        </div>

        <div className="relative shrink-0">
          <Avatar className="h-12 w-12 border-2 border-cyan-500/20 transition-all group-hover:border-cyan-300/40 md:h-14 md:w-14">
            <AvatarImage src={user.avatar_url} alt={name} />
            <AvatarFallback className="bg-slate-800 text-xs font-black text-cyan-100">{getInitials(name)}</AvatarFallback>
          </Avatar>
          {isCurrentUser && (
            <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-black text-white md:text-base">{name}</p>
            {isCurrentUser && (
              <span className="shrink-0 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-200">
                You
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-300">
            <span className="flex items-center gap-1" title={`${rawWatchMinutes.toLocaleString()} minutes watched`}>
              <Clock className="h-3 w-3 text-cyan-300" />
              {watchTime}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3 text-emerald-300" />
              {downloads.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-lg font-black text-transparent tabular-nums md:text-xl">
            {points.toLocaleString()}
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">points</p>
        </div>
      </div>
    </motion.div>
  );
};

const LeaderboardLoading = () => (
  <div className="rounded-[2rem] border border-cyan-500/10 bg-gradient-to-br from-slate-950 via-cyan-950/40 to-slate-950 px-6 py-20 shadow-2xl shadow-black/30">
    <div className="flex flex-col items-center justify-center gap-4 text-cyan-200/80">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.22em]">Loading the leaderboard</p>
    </div>
  </div>
);

const LeaderboardEmpty = () => (
  <div className="rounded-[2rem] border border-cyan-500/10 bg-gradient-to-br from-slate-950 via-cyan-950/40 to-slate-950 px-6 py-16 text-center shadow-2xl shadow-black/30">
    <Trophy className="mx-auto mb-4 h-10 w-10 text-cyan-300/70" />
    <p className="text-lg font-black text-white">No leaderboard data yet</p>
    <p className="mt-2 text-sm text-slate-400">Watch movies and collect points to appear here.</p>
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
    <div className="rounded-[2rem] border border-cyan-500/15 bg-gradient-to-br from-slate-950 via-cyan-950/60 to-slate-950 p-4 shadow-2xl shadow-black/35 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
        <div className="flex flex-col gap-5 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300/80">MovieBay rankings</p>
            <h3 className="mt-2 bg-gradient-to-r from-cyan-300 via-emerald-300 to-cyan-300 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl">
              Leaderboard
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-300">Compete with MovieBay fans by watch time, downloads, and points.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:justify-end">
            <div className="inline-grid grid-cols-2 rounded-xl border border-cyan-500/20 bg-slate-900/70 p-1 backdrop-blur-sm">
              {[
                { value: "all" as const, label: "All Time" },
                { value: "top" as const, label: "Top 20" },
              ].map(tab => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveLeaderboardTab(tab.value)}
                  className={cn(
                    "h-9 rounded-lg px-4 text-sm font-black transition-all",
                    activeLeaderboardTab === tab.value
                      ? "bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-lg shadow-cyan-500/20"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-3 rounded-xl border border-cyan-500/20 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
              <Clock8 className="h-5 w-5 text-cyan-300" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Season resets in</p>
                <p className="text-sm font-black tabular-nums text-white">{countdown}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-900/30 via-slate-900/70 to-emerald-900/30 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm md:p-8">
          <div className="grid grid-cols-3 gap-3 md:gap-6 lg:gap-8">
            {podium[1] && <PodiumItem user={podium[1]} rank={2} points={podium[1].activity_points} />}
            {podium[0] && <PodiumItem user={podium[0]} rank={1} points={podium[0].activity_points} />}
            {podium[2] && <PodiumItem user={podium[2]} rank={3} points={podium[2].activity_points} />}
          </div>
          <div className="mt-6 border-t border-cyan-500/20 pt-4 text-center">
            <p className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-xs font-black uppercase tracking-[0.22em] text-transparent">
              Showing {visibleData.length.toLocaleString()} ranked user{visibleData.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
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
    </div>
  );
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

  const handleClaimDaily = async () => {
    if (!user) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_daily_points", { user_id: user.id });
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
    const link = `${window.location.origin}/auth?ref=${code}`;
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

  const recentlyViewed = getRecentlyViewed();
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
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-primary/30 overflow-hidden relative">
      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} user={user} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
      <ClearDataDialog 
        open={clearDataOpen} 
        onOpenChange={setClearDataOpen} 
        onClear={() => {
          clearAllStorageData();
          setRefreshKey(k => k + 1);
          toast.success("All local data has been cleared.");
        }} 
      />

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
            {user ? (
              <button 
                onClick={handleSignOut}
                className="px-5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 transition-all text-sm font-bold"
              >
                Log Out
              </button>
            ) : (
              <button 
                onClick={() => navigate("/auth")}
                className="px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all text-sm font-bold shadow-glow"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* OPEN PROFILE LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          
          {/* LEFT: IDENTITY & INTEGRATED ACTIONS */}
          <div className="w-full lg:w-[380px] space-y-12 shrink-0">
            
            {/* Identity (Open Design) */}
            <div className="space-y-8">
              <div className="relative group/avatar inline-block">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-lg opacity-20 group-hover/avatar:opacity-40 transition duration-500" />
                <Avatar className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border border-white/10 relative z-10 bg-black/40 backdrop-blur-3xl">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-white/5 text-4xl font-black text-primary">{initials}</AvatarFallback>
                </Avatar>
                <button 
                  onClick={() => setEditProfileOpen(true)}
                  className="absolute -bottom-2 -right-2 z-20 w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">{displayName}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
                    LEVEL {profile?.level || 1}
                  </span>
                  <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">{memberSince}</span>
                  <span className="text-white/20 text-[9px] font-bold truncate max-w-[150px]">{userEmail}</span>
                </div>
              </div>

              {/* Progress (Integrated) */}
              {profile && (
                <div className="space-y-3">
                  <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-widest text-white/30">
                    <span>Rank Mastery</span>
                    <span className="text-white">{(profile.activity_points % 500)} / 500 XP</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (profile.activity_points % 500) / 5)}%` }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* QUICK ACTIONS (Integrated Grid) */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleClaimDaily}
                disabled={!canClaim || claiming}
                className={cn(
                  "p-5 rounded-2xl flex flex-col items-center gap-2 transition-all border",
                  canClaim 
                    ? "bg-primary border-primary text-white shadow-glow" 
                    : "bg-white/[0.02] border-white/5 text-white/20"
                )}
              >
                <Gift className={cn("w-6 h-6", canClaim ? "animate-bounce" : "opacity-20")} />
                <span className="text-[10px] font-black uppercase tracking-widest">{canClaim ? "Claim Daily" : "Claimed"}</span>
              </button>

              <button
                onClick={copyReferral}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center gap-2 hover:bg-white/[0.05] transition-all"
              >
                <Users className="w-6 h-6 text-white/40 group-hover:text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Invite</span>
              </button>
            </div>

            {/* SYSTEM SETTINGS (Integrated List) */}
            <div className="space-y-1">
               <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 px-2">Account Settings</h3>
               {settingsItems.map((item, idx) => (
                 <button 
                  key={idx}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] transition-all group"
                 >
                   <div className="flex items-center gap-4">
                     <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.color)}>
                       <item.icon className={cn("w-4 h-4", item.iconColor)} />
                     </div>
                     <div className="text-left">
                       <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{item.label}</p>
                       <p className="text-[10px] text-white/20 font-medium">{item.desc}</p>
                     </div>
                   </div>
                   <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
                 </button>
               ))}
            </div>
          </div>

          {/* RIGHT: MAIN CONTENT AREA (Fluid & Spacious) */}
          <div className="flex-1 w-full space-y-16">
            
            {/* STATS STRIP (No Boxes, Pure Typography) */}
            <div className="flex flex-wrap gap-x-12 gap-y-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white tracking-tighter leading-none">{stat.value}</span>
                    <stat.icon className="w-4 h-4 text-primary/40" />
                  </div>
                </div>
              ))}
            </div>

            {/* TABS NAVIGATION (Modern Underline Style) */}
            <div className="space-y-10">
              <div className="flex items-center gap-10 overflow-x-auto pb-4 border-b border-white/5 scrollbar-none">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 transition-all whitespace-nowrap relative pb-4",
                      activeTab === tab.id 
                        ? "text-white" 
                        : "text-white/20 hover:text-white/40"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                    {activeTab === tab.id && (
                      <motion.div 
                        layoutId="activeTabUnderline"
                        className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-primary"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* FLUID TAB CONTENT */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  {activeTab === "activity" && (
                    <div className="space-y-12">
                      {/* Recently Viewed Grid */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-white uppercase tracking-wider">Recently Viewed</h3>
                          <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All History</button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {recentlyViewed.slice(0, 10).map((item) => (
                            <motion.div
                              key={item.id}
                              whileHover={{ y: -5 }}
                              onClick={() => navigateToMovie(item.id, item.title, item.type)}
                              className="group cursor-pointer space-y-3"
                            >
                              <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/5 bg-white/5 relative">
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                                    <Play className="w-4 h-4 fill-current" />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-black text-white truncate">{item.title}</p>
                                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{item.type}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-12 border-t border-white/5">
                          <button 
                            onClick={() => navigate("/admin")} 
                            className="p-8 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all text-left group"
                          >
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                              <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <h4 className="text-xl font-black mb-2 uppercase tracking-tighter">Admin Dashboard</h4>
                            <p className="text-sm text-white/40 leading-relaxed font-medium">Global system management, movie uploads, and site analytics.</p>
                          </button>
                          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5">
                            <SendPushPanel />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "watchlist" && (
                    <div className="space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bookmark className="w-6 h-6 text-primary" />
                          <h3 className="text-xl font-black uppercase tracking-wider">Your Watchlist</h3>
                        </div>
                        <div className="flex gap-2">
                          {["all", "movie", "series"].map(f => (
                            <button 
                              key={f} 
                              onClick={() => setWatchlistFilter(f as any)} 
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                                watchlistFilter === f ? "bg-primary border-primary text-black" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                              )}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>

                      {filteredWatchlist.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {filteredWatchlist.map((item, idx) => (
                            <motion.div
                              key={item.id}
                              whileHover={{ y: -5 }}
                              onClick={() => navigateToMovie(item.id, item.title, item.type)}
                              className="group cursor-pointer space-y-3"
                            >
                              <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/5 bg-white/5 relative">
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              </div>
                              <p className="text-[11px] font-black text-white truncate px-1">{item.title}</p>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/10">
                          <Bookmark className="w-16 h-16 stroke-[1]" />
                          <p className="text-sm font-black uppercase tracking-widest">Empty Watchlist</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "leaderboard" && (
                    <LeaderboardSection />
                  )}

                  {activeTab === "settings" && (
                    <div className="max-w-2xl space-y-12">
                      <div className="space-y-6">
                        <h3 className="text-lg font-black text-white uppercase tracking-wider">Security & Preferences</h3>
                        <div className="grid grid-cols-1 gap-3">
                          {settingsItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button 
                                key={item.label} 
                                onClick={item.onClick}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", item.color)}>
                                    <Icon className={cn("w-5 h-5", item.iconColor)} />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-sm font-black text-white leading-none mb-1">{item.label}</p>
                                    <p className="text-[10px] text-white/30 font-medium">{item.desc}</p>
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
