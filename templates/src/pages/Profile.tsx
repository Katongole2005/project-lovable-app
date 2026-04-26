import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useTheme } from "next-themes";
import { getRecentlyViewed, getWatchlist, getUserRatings, removeContinueWatching, clearAllStorageData } from "@/lib/storage";
import { getLeaderboard, incrementUserStat } from "@/lib/stats";
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

function LeaderboardSection() {
  const { user } = useAuth();
  const [metric, setMetric] = useState<"downloads" | "watchTime" | "activity">("watchTime");
  const [period, setPeriod] = useState<"weekly" | "allTime">("allTime");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const dbMetric = metric === "watchTime" ? "watch_time" : metric === "downloads" ? "downloads" : "activity_points";
      const data = await getLeaderboard(dbMetric, period as any);
      
      // If no data (table might not be ready yet), show empty or keep loading
      setUsers(data);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [metric, period]);

  const top1 = users[0];
  const top2 = users[1];
  const top3 = users[2];
  const theRest = users.slice(3);

  if (loading && users.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm font-bold animate-pulse">Loading Legends...</p>
      </div>
    );
  }

  // Handle case where leaderboard is empty
  if (users.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-700">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-white/20" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">The Ladder is Empty</h3>
          <p className="text-sm text-white/40">Be the first to claim a spot on the leaderboard!</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl border-white/10">
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12">
      {/* HEADER SECTION - Cinematic Vibe */}
      <div className="relative overflow-hidden p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-primary/20 via-black/40 to-secondary/10 border border-white/10">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/5 blur-[100px] -rotate-12 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[30%] h-full bg-secondary/5 blur-[80px] rotate-12 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
              <Sparkles className="w-3 h-3" /> Hall of Fame
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight">
              THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_auto] animate-gradient-x">LEGENDS</span><br />
              LADDER
            </h2>
            <p className="text-white/40 text-sm max-w-xs font-medium">Competition breeds excellence. Only the top 50 users earn a spot in the MovieBay archives.</p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/5 shadow-2xl">
              {(["watchTime", "downloads", "activity"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider whitespace-nowrap",
                    metric === m 
                      ? "bg-primary text-white shadow-[0_0_20px_rgba(255,138,61,0.4)]" 
                      : "text-white/30 hover:text-white/60 hover:bg-white/5"
                  )}
                >
                  {m === "watchTime" ? "Watcher" : m === "downloads" ? "Hoarder" : "Active"}
                </button>
              ))}
            </div>
            
            <div className="flex justify-end gap-2">
              {(["weekly", "allTime"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase border transition-all",
                    period === p ? "border-white/20 bg-white/10 text-white" : "border-white/5 text-white/20 hover:text-white/40"
                  )}
                >
                  {p === "weekly" ? "Weekly" : "Overall"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* THE PODIUM - 3D Cinematic Style */}
      <div className="relative pt-20 pb-10">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent z-10" />
        
        <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-4 md:gap-0 max-w-4xl mx-auto relative z-20">
          
          {/* SILVER - Rank 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 w-full md:w-auto order-2 md:order-1"
          >
            <div className="flex flex-col items-center group">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-slate-400 to-slate-600 p-1 rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-[0_0_30px_rgba(148,163,184,0.2)]">
                  <div className="w-full h-full rounded-[1.8rem] bg-[#0a0a0f] p-1.5">
                    <img src={top2.avatar} alt="" className="w-full h-full rounded-[1.4rem] bg-slate-400/10" />
                  </div>
                </div>
                <div className="absolute -top-4 -right-2 w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center border-4 border-[#0a0a0f] shadow-xl">
                  <span className="text-black font-black italic text-sm">2</span>
                </div>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-white font-black text-lg tracking-tight truncate max-w-[140px]">{top2.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-400/10 text-slate-400 font-black uppercase">Silver Tier</span>
                </div>
              </div>
              <div className="w-full h-32 md:h-48 bg-gradient-to-b from-slate-400/20 to-transparent rounded-t-[2.5rem] border-x border-t border-slate-400/20 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <span className="text-slate-400/50 text-[10px] font-black uppercase mb-1">Total Impact</span>
                  <span className="text-xl font-black text-white">
                    {metric === "watchTime" ? `${(top2.watchTime / 60).toFixed(0)}h` : top2[metric].toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* GOLD - Rank 1 (The King) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="flex-1 w-full md:w-auto order-1 md:order-2 z-30"
          >
            <div className="flex flex-col items-center">
              <div className="relative mb-10">
                <div className="absolute -inset-8 bg-primary/20 blur-[60px] animate-pulse" />
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br from-primary via-secondary to-primary p-1.5 shadow-[0_0_60px_rgba(255,138,61,0.4)] animate-float">
                    <div className="w-full h-full rounded-[2.2rem] bg-[#0a0a0f] p-2">
                      <img src={top1.avatar} alt="" className="w-full h-full rounded-[1.8rem] bg-primary/10" />
                    </div>
                  </div>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                    <Crown className="w-12 h-12 text-primary drop-shadow-[0_0_15px_rgba(255,138,61,0.8)] animate-bounce" />
                  </div>
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center border-8 border-[#0a0a0f] shadow-2xl">
                    <span className="text-white font-black italic text-xl">1</span>
                  </div>
                </div>
              </div>
              <div className="text-center mb-8 relative">
                <div className="absolute -inset-x-20 -top-4 bottom-0 bg-primary/5 blur-3xl rounded-full" />
                <h3 className="text-white font-black text-2xl md:text-3xl tracking-tighter mb-1 relative z-10">{top1.name}</h3>
                <div className="flex items-center justify-center gap-2 relative z-10">
                  <span className="flex items-center gap-1.5 text-[10px] px-3 py-1 rounded-full bg-primary/20 text-primary font-black uppercase border border-primary/30">
                    <Award className="w-3 h-3" /> Overlord
                  </span>
                </div>
              </div>
              <div className="w-full h-44 md:h-64 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent rounded-t-[3rem] border-x border-t border-primary/30 relative overflow-hidden backdrop-blur-md shadow-[0_-20px_40px_rgba(255,138,61,0.1)]">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-primary/5">
                   <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                      <Zap className="w-6 h-6 text-primary" />
                   </div>
                  <span className="text-primary/60 text-[11px] font-black uppercase mb-1 tracking-widest">Master Score</span>
                  <span className="text-4xl font-black text-white drop-shadow-glow">
                    {metric === "watchTime" ? `${(top1.watchTime / 60).toFixed(0)}h` : top1[metric].toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* BRONZE - Rank 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 w-full md:w-auto order-3 md:order-3"
          >
            <div className="flex flex-col items-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.8rem] bg-gradient-to-br from-amber-600 to-amber-900 p-1 -rotate-6 group-hover:rotate-0 transition-transform duration-500 shadow-[0_0_30px_rgba(146,64,14,0.2)]">
                  <div className="w-full h-full rounded-[1.6rem] bg-[#0a0a0f] p-1.5">
                    <img src={top3.avatar} alt="" className="w-full h-full rounded-[1.2rem] bg-amber-900/10" />
                  </div>
                </div>
                <div className="absolute -top-4 -right-2 w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center border-4 border-[#0a0a0f] shadow-xl">
                  <span className="text-white font-black italic text-sm">3</span>
                </div>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-white font-black text-lg tracking-tight truncate max-w-[120px]">{top3?.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-900/10 text-amber-600 font-black uppercase">Bronze Tier</span>
                </div>
              </div>
              <div className="w-full h-20 md:h-32 bg-gradient-to-b from-amber-900/20 to-transparent rounded-t-[2.2rem] border-x border-t border-amber-900/20 relative overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <span className="text-amber-700/50 text-[10px] font-black uppercase mb-1">Impact</span>
                  <span className="text-xl font-black text-white">
                    {metric === "watchTime" ? `${((top3?.watchTime || 0) / 60).toFixed(0)}h` : (top3?.downloads || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* THE LIST - Advanced Glassmorphism */}
      <div className="grid grid-cols-1 gap-3 max-w-5xl mx-auto relative z-20">
        {theRest.map((u, idx) => (
          <motion.div 
            key={u.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + (idx % 10) * 0.05 }}
            className={cn(
              "group flex items-center justify-between p-1 pl-6 pr-6 md:pr-10 rounded-2xl border transition-all duration-500 hover:scale-[1.02]",
              u.isYou 
                ? "bg-primary/20 border-primary/40 shadow-[0_0_30px_rgba(255,138,61,0.15)] ring-1 ring-primary/30" 
                : "bg-white/[0.03] border-white/5 hover:bg-white/[0.08] hover:border-white/10"
            )}
          >
            <div className="flex items-center gap-4 md:gap-8 py-3">
              <div className={cn(
                "w-10 text-center font-black italic text-xl md:text-2xl",
                u.rank <= 10 ? "text-white/80" : "text-white/10 group-hover:text-white/20 transition-colors"
              )}>
                {u.rank}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 md:w-14 md:h-14 rounded-xl p-0.5 transition-transform group-hover:rotate-6",
                    u.isYou ? "bg-primary/40" : "bg-white/10"
                  )}>
                    <div className="w-full h-full rounded-[10px] bg-[#0a0a0f] overflow-hidden">
                      <img src={u.avatar} alt="" className="w-full h-full object-cover opacity-80" />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-black/80 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/60">
                    {u.level}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm md:text-base font-black text-white flex items-center gap-2">
                    {u.name}
                    {u.isYou && <Sparkles className="w-4 h-4 text-primary animate-pulse" />}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-20 md:w-32 h-1 rounded-full bg-white/5 overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-primary/40 to-primary" style={{ width: `${Math.random() * 60 + 30}%` }} />
                    </div>
                    <span className="text-[8px] md:text-[9px] text-white/30 font-black uppercase tracking-widest">Mastery</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {metric === "watchTime" && <Clock8 className="w-3.5 h-3.5 text-secondary/60" />}
                {metric === "downloads" && <Download className="w-3.5 h-3.5 text-blue-400/60" />}
                {metric === "activity" && <Activity className="w-3.5 h-3.5 text-primary/60" />}
                <span className="text-base md:text-xl font-black text-white tracking-tight">
                  {metric === "watchTime" ? `${((u.watchTime || 0) / 60).toFixed(0)}h` : (u[metric] || 0).toLocaleString()}
                </span>
              </div>
              <span className={cn(
                "text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                u.id === user?.id ? "text-primary/60" : "text-white/20 group-hover:text-white/40 transition-colors"
              )}>
                {metric === "watchTime" ? "Watcher Rating" : metric === "downloads" ? "Hoard Score" : "Activity Flow"}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
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
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "watchlist" | "leaderboard" | "settings">("activity");
  const [watchlistFilter, setWatchlistFilter] = useState<"all" | "movie" | "series">("all");
  const [watchlistSort, setWatchlistSort] = useState<"newest" | "oldest">("newest");
  const [refreshKey, setRefreshKey] = useState(0);
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
      customContent: <PushNotificationButton />,
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
                    {user ? (
                      <button 
                        onClick={() => setEditProfileOpen(true)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate("/auth")}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <Lock className="w-6 h-6 text-white" />
                      </button>
                    )}
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

          {/* RIGHT COLUMN: Tabbed Content (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tabs Header */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden",
                    activeTab === tab.id 
                      ? "text-white bg-primary shadow-glow" 
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "animate-pulse" : "")} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content Rendering */}
            <AnimatePresence mode="wait">
              {activeTab === "activity" && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Recently Viewed Grid */}
                  <div className="p-8 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-center gap-3 mb-8">
                      <Clock className="w-6 h-6 text-secondary" />
                      <h3 className="text-xl font-bold">Recent History</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {recentlyViewed.length > 0 ? (
                        recentlyViewed.slice(0, 10).map((item, idx) => (
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
                                <span className="text-xs text-white/60 font-medium">Recently</span>
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
                </motion.div>
              )}

              {activeTab === "watchlist" && (
                <motion.div
                  key="watchlist"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-8 rounded-lg bg-white/[0.03] border border-white/5"
                >
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
                      {filteredWatchlist.map((item, idx) => (
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
                </motion.div>
              )}

              {activeTab === "leaderboard" && (
                <motion.div
                  key="leaderboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <LeaderboardSection />
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
