import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { SendPushPanel } from "@/components/SendPushPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Shield,
  Settings,
  Users,
  Bell,
  BarChart3,
  ChevronLeft,
  Loader2,
  Download,
  Wrench,
  UserPlus,
  Tv,
  Play,
  Trophy,
  Megaphone,
  Crown,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "settings" | "users" | "notifications" | "analytics";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { settings, loading: settingsLoading, updateSetting } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (settings.site_announcement) {
      setAnnouncement(settings.site_announcement);
    }
  }, [settings.site_announcement]);

  // Fetch users via edge function (since we can't query auth.users directly)
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users");
      if (error) throw error;
      setUsers(data?.users || []);
    } catch (err: any) {
      toast.error("Failed to load users: " + (err.message || "Unknown error"));
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users" && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab]);

  const handleToggle = async (key: keyof typeof settings, value: boolean) => {
    try {
      await updateSetting(key, value);
      toast.success(`${key.replace(/_/g, " ")} ${value ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update setting");
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    try {
      await updateSetting("site_announcement", announcement);
      toast.success("Announcement updated");
    } catch {
      toast.error("Failed to save announcement");
    } finally {
      setSavingAnnouncement(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "users", label: "Users", icon: Users },
    { id: "notifications", label: "Push", icon: Bell },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  const settingsToggles = [
    { key: "download_enabled" as const, label: "Download Button", description: "Show/hide download buttons across the app", icon: Download },
    { key: "maintenance_mode" as const, label: "Maintenance Mode", description: "Show maintenance page to all visitors", icon: Wrench },
    { key: "registration_enabled" as const, label: "Registration", description: "Allow new user signups", icon: UserPlus },
    { key: "hero_carousel_enabled" as const, label: "Hero Carousel", description: "Show the hero carousel on home page", icon: Tv },
    { key: "continue_watching_enabled" as const, label: "Continue Watching", description: "Show continue watching section", icon: Play },
    { key: "top10_enabled" as const, label: "Top 10 Section", description: "Show the Top 10 ranked section", icon: Trophy },
    { key: "push_notifications_enabled" as const, label: "Push Notifications", description: "Allow push notification subscriptions", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Site Management</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Nav */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6 pb-8">
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Feature Toggles
              </h2>
              <div className="space-y-2">
                {settingsToggles.map((toggle) => {
                  const Icon = toggle.icon;
                  const isOn = settings[toggle.key] as boolean;
                  return (
                    <div
                      key={toggle.key}
                      className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center",
                          isOn ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Icon className={cn("w-4 h-4", isOn ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{toggle.label}</p>
                          <p className="text-xs text-muted-foreground">{toggle.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isOn}
                        onCheckedChange={(val) => handleToggle(toggle.key, val)}
                        disabled={settingsLoading}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Announcement */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                Site Announcement
              </h2>
              <div className="p-4 rounded-xl bg-card border border-border/30 space-y-3">
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  placeholder="Enter a site-wide announcement (leave empty to hide)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
                />
                <Button
                  onClick={handleSaveAnnouncement}
                  disabled={savingAnnouncement}
                  className="gap-2"
                  size="sm"
                >
                  {savingAnnouncement && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Announcement
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4 pb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Registered Users ({users.length})
              </h2>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={usersLoading}>
                {usersLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
              </Button>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.email || "No email"}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                          {u.last_sign_in_at && ` · Last seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">No users found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="max-w-lg pb-8">
            <SendPushPanel />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4 pb-8">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Quick Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Users" value={String(users.length || "–")} icon={Users} />
              <StatCard label="Download" value={settings.download_enabled ? "ON" : "OFF"} icon={Download} />
              <StatCard label="Maintenance" value={settings.maintenance_mode ? "ON" : "OFF"} icon={Wrench} />
              <StatCard label="Registration" value={settings.registration_enabled ? "ON" : "OFF"} icon={UserPlus} />
            </div>
            <p className="text-xs text-muted-foreground">More analytics coming soon — user activity, popular content, etc.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/30 text-center space-y-2">
      <Icon className="w-5 h-5 text-primary mx-auto" />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
