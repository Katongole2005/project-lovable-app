import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

const PodiumItem = ({ user, rank, points }: { user: any, rank: number, points: number }) => {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  
  const colors = isFirst ? "from-yellow-400 to-yellow-600" : isSecond ? "from-slate-300 to-slate-500" : "from-orange-400 to-orange-600";
  const h = isFirst ? 240 : isSecond ? 180 : 140;
  const order = isFirst ? "order-2" : isSecond ? "order-1" : "order-3";

  const watchTime = formatWatchTime(user.watch_time);
  const downloads = user.downloads || 0;

  return (
    <div className={cn("flex flex-col items-center justify-end flex-1 max-w-[120px] md:max-w-[180px] gap-3 md:gap-5", order)}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 * rank, type: "spring" }}
        className="relative group mb-2"
      >
        <div className={cn("absolute -inset-1 rounded-full blur-md opacity-30 group-hover:opacity-60 transition duration-500 bg-gradient-to-r", colors)} />
        <Avatar className={cn(
          "w-16 h-16 md:w-24 md:h-24 border-4 relative z-10 transition-transform duration-500 group-hover:scale-110", 
          isFirst ? "border-yellow-500" : isSecond ? "border-slate-400" : "border-orange-500"
        )}>
          <AvatarImage src={user.avatar_url} />
          <AvatarFallback className="bg-white/5 text-xl md:text-2xl font-black text-white">{user.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {isFirst && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <Crown className="w-10 h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] fill-yellow-500/20" />
            </motion.div>
          </div>
        )}
      </motion.div>

      <div className="text-center space-y-1 mb-2 px-1">
        <p className="text-[10px] md:text-sm font-black text-white truncate w-full">{user.display_name}</p>
        <p className={cn("text-[10px] md:text-xs font-black uppercase tracking-widest", isFirst ? "text-yellow-500" : "text-white/40")}>{points.toLocaleString()} PTS</p>
      </div>

      <motion.div 
        initial={{ height: 0 }}
        animate={{ height: h }}
        className={cn(
          "w-full rounded-t-3xl relative overflow-hidden flex flex-col items-center justify-start pt-6 gap-4 border-t border-x border-white/10", 
          isFirst ? "bg-white/[0.08]" : "bg-white/[0.04]"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <span className="text-4xl md:text-6xl font-black text-white/5 select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 italic">#{rank}</span>
        
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">Watch Time</span>
            <div className="flex items-center gap-1" title={`${Math.max(0, Math.floor(Number(user.watch_time) || 0)).toLocaleString()} minutes watched`}>
              <Clock className="w-3 h-3 text-primary/40" />
              <span className="text-xs md:text-sm font-black text-white tabular-nums">{watchTime}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">Downloads</span>
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3 text-primary/40" />
              <span className="text-xs md:text-sm font-black text-white">{downloads}</span>
            </div>
          </div>
        </div>

        {isFirst && (
          <>
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500/0 via-yellow-500 to-yellow-500/0 shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-500 rotate-45 rounded-sm shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
          </>
        )}
      </motion.div>
    </div>
  );
};

const LeaderboardCard = ({ user, rank, points, isCurrentUser }: { user: any, rank: number, points: number, isCurrentUser: boolean }) => {
  const watchTime = formatWatchTime(user.watch_time);
  const downloads = user.downloads || 0;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.03, y: -4 }}
      initial="hidden"
      animate="visible"
      className={cn(
        "group flex items-center justify-between p-4 rounded-xl border transition-all",
        isCurrentUser 
          ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]" 
          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
      )}
    >
      <div className="flex items-center gap-4">
        <span className={cn(
          "w-8 text-sm font-black italic",
          rank <= 3 ? "text-primary" : "text-white/20"
        )}>#{rank}</span>
        
        <div className="relative">
          <Avatar className="w-10 h-10 border border-white/10">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="bg-white/5 text-xs font-black">{user.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {isCurrentUser && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-[#0a0a0f]" />
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{user.display_name}</span>
          <div className="flex items-center gap-3 mt-1">
             <div className="flex items-center gap-1 text-[9px] font-black text-white/30 uppercase tracking-widest" title={`${Math.max(0, Math.floor(Number(user.watch_time) || 0)).toLocaleString()} minutes watched`}>
               <Clock className="w-2.5 h-2.5" />
               <span className="tabular-nums">{watchTime}</span>
             </div>
             <div className="flex items-center gap-1 text-[9px] font-black text-white/30 uppercase tracking-widest border-l border-white/5 pl-3">
               <Download className="w-2.5 h-2.5" />
               <span>{downloads}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="text-right">
        <p className="text-sm font-black text-white tracking-tight">{points.toLocaleString()} PTS</p>
        <div className="flex items-center gap-1 justify-end mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
          <span className="text-[8px] text-white/20 font-black uppercase tracking-widest">Mastery</span>
        </div>
      </div>
    </motion.div>
  );
};

const LeaderboardSection = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [countdown, setCountdown] = useState("");

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

    const timer = setInterval(() => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const diff = nextMonth.getTime() - now.getTime();
      
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown(`${d}D ${h}H ${m}M ${s}S`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/10">
      <Loader2 className="w-10 h-10 animate-spin" />
      <p className="text-xs font-black uppercase tracking-[0.2em]">Synchronizing Legends...</p>
    </div>
  );

  const podium = data.slice(0, 3);
  const list = data.slice(3);

  return (
    <div className="space-y-16">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-white/5">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Legendary Ranking</h3>
          <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Showing Top 100 Collectors of the Season</p>
        </div>
        <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
          <Clock8 className="w-5 h-5 text-primary" />
          <div className="flex flex-col">
            <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">Season Reset In</span>
            <span className="text-sm font-black text-white tabular-nums tracking-wider">{countdown}</span>
          </div>
        </div>
      </div>

      {/* Podium */}
      <div className="flex justify-center items-end gap-2 md:gap-8 px-2 pb-12">
        {podium[1] && <PodiumItem user={podium[1]} rank={2} points={podium[1].activity_points} />}
        {podium[0] && <PodiumItem user={podium[0]} rank={1} points={podium[0].activity_points} />}
        {podium[2] && <PodiumItem user={podium[2]} rank={3} points={podium[2].activity_points} />}
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
