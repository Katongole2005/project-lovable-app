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
  Radio,
  Mail,
  Send,
  Eye,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "settings" | "users" | "notifications" | "analytics";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  last_active_at: string | null;
  is_active: boolean;
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Never active";

  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 0) return "Active now";

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Active now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getUserInitials(user: UserRow) {
  const source = user.display_name || user.email || "U";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

type MarketingTarget = "inactive" | "all" | "specific";

function formatMarketingProvider(provider?: string | null) {
  if (!provider) return "email provider";
  if (provider === "brevo") return "Brevo";
  if (provider === "resend") return "Resend";
  if (provider === "smtp") return "SMTP";
  return provider;
}

const SUPABASE_FUNCTIONS_URL = (
  import.meta.env.VITE_SUPABASE_URL ||
  "https://qiwwokfqunzgnbmfvgxo.supabase.co"
).replace(/\/+$/, "");

const SUPABASE_FUNCTIONS_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_CLc5N9WUBLOAw5kFT_f-mQ_UzmUl_bV";

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
  const [marketingTarget, setMarketingTarget] = useState<MarketingTarget>("inactive");
  const [inactiveDays, setInactiveDays] = useState(30);
  const [sendLimit, setSendLimit] = useState(50);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [specificUserSearch, setSpecificUserSearch] = useState("");
  const [emailSubject, setEmailSubject] = useState("{{name}}, new Luganda translated movies are waiting");
  const [emailMessage, setEmailMessage] = useState("Hi {{name}},\n\nWe have added fresh Luganda translated movies for you. Come back and continue watching your favorites today.");
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignPreview, setCampaignPreview] = useState<any>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeTab === "notifications" && marketingTarget === "specific" && users.length === 0 && !usersLoading) {
      fetchUsers();
    }
  }, [activeTab, marketingTarget, users.length, usersLoading]);

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

  const runMarketingCampaign = async (dryRun: boolean) => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Add an email subject and message first");
      return;
    }
    if (marketingTarget === "specific" && selectedUserIds.length === 0) {
      toast.error("Select at least one user first");
      return;
    }
    const campaignLimit = marketingTarget === "specific" ? selectedUserIds.length : sendLimit;
    if (!dryRun && !campaignPreview?.dryRun) {
      toast.info("Preview the audience first, then send the email.");
      return;
    }
    if (!dryRun && campaignPreview?.providerReady === false) {
      const message = "No email provider is configured. Add BREVO_API_KEY or RESEND_API_KEY in Supabase secrets before sending.";
      setCampaignError(message);
      toast.error(message);
      return;
    }
    if (!dryRun && campaignPreview?.provider === "smtp" && campaignLimit > (campaignPreview?.providerLimit || 10)) {
      const message = "SMTP is only safe for 10 test emails. Add BREVO_API_KEY or RESEND_API_KEY before sending 120 users.";
      setCampaignError(message);
      toast.error(message);
      return;
    }

    setCampaignLoading(true);
    try {
      setCampaignPreview(null);
      setCampaignError(null);
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;
      if (!accessToken) {
        throw new Error("Your admin session expired. Sign in again and retry.");
      }

      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/functions/v1/admin-marketing-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "apikey": SUPABASE_FUNCTIONS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
          target: marketingTarget,
          selectedUserIds: marketingTarget === "specific" ? selectedUserIds : [],
          inactiveDays,
          limit: Math.max(1, campaignLimit),
          dryRun,
          ctaLabel: "Watch on MovieBay",
          ctaUrl: "https://www.s-u.in",
          previewText: emailMessage.trim().slice(0, 120),
        }),
      });

      const responseText = await response.text();
      let data: any = null;
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const backendMessage =
          data?.error ||
          data?.message ||
          responseText ||
          `Marketing email failed with HTTP ${response.status}`;
        throw new Error(backendMessage);
      }

      setCampaignPreview(data);
      if (dryRun && data && data.providerReady === false) {
        toast.error("Audience preview worked, but no email provider is configured. Add BREVO_API_KEY or RESEND_API_KEY in Supabase secrets.");
        return;
      }
      if (dryRun && data?.provider === "smtp" && campaignLimit > (data?.providerLimit || 10)) {
        toast.error("SMTP is only safe for 10 test emails. Add BREVO_API_KEY or RESEND_API_KEY before sending 120 users.");
        return;
      }
      if (!dryRun && data?.queued) {
        toast.success(`Email campaign queued for up to ${data?.requestedLimit || data?.attempted || 0} users`);
      } else if (!dryRun && (data?.failed || 0) > 0) {
        toast.warning(`${formatMarketingProvider(data?.provider)} accepted ${data?.providerAccepted ?? data?.sent ?? 0}, failed ${data?.failed || 0}`);
      } else {
        toast.success(dryRun ? `Preview ready: ${data?.willSend || 0} users` : `${formatMarketingProvider(data?.provider)} accepted ${data?.providerAccepted ?? data?.sent ?? 0} emails`);
      }
    } catch (err: any) {
      const message = err.message || "Unknown error";
      setCampaignError(message);
      toast.error("Marketing email failed: " + message);
    } finally {
      setCampaignLoading(false);
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

  const activeUsersCount = users.filter((u) => u.is_active).length;
  const selectedUserIdSet = new Set(selectedUserIds);
  const selectedSpecificUsers = users.filter((u) => selectedUserIdSet.has(u.id));
  const specificSearchQuery = specificUserSearch.trim().toLowerCase();
  const filteredSpecificUsers = (specificSearchQuery
    ? users.filter((u) => {
        const haystack = `${u.display_name || ""} ${u.email || ""}`.toLowerCase();
        return haystack.includes(specificSearchQuery);
      })
    : users
  ).slice(0, 12);

  const toggleSpecificUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

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
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <StatCard label="Active Now" value={String(activeUsersCount)} icon={Radio} />
                  <StatCard label="Registered" value={String(users.length)} icon={Users} />
                </div>
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold",
                        u.is_active ? "bg-emerald-500/10" : "bg-primary/10"
                      )}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className={cn(u.is_active ? "text-emerald-500" : "text-primary")}>{getUserInitials(u)}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{u.display_name || u.email || "No name"}</p>
                          {u.is_active && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          )}
                        </div>
                        {u.display_name && (
                          <p className="text-xs text-muted-foreground">{u.email || "No email"}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(u.created_at).toLocaleDateString()}
                          {` · Last active ${formatRelativeTime(u.last_active_at || u.last_sign_in_at)}`}
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
          <div className="grid gap-6 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Marketing Email
              </h2>
              <div className="rounded-xl bg-card border border-border/30 p-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Audience</span>
                    <select
                      value={marketingTarget}
                      onChange={(e) => setMarketingTarget(e.target.value as MarketingTarget)}
                      className="w-full h-10 rounded-lg bg-background border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="inactive">Inactive users</option>
                      <option value="all">All users</option>
                      <option value="specific">Specific users</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {marketingTarget === "specific" ? "Inactive days" : "Inactive days"}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={inactiveDays}
                      onChange={(e) => setInactiveDays(Number(e.target.value) || 30)}
                      disabled={marketingTarget !== "inactive"}
                      className="w-full h-10 rounded-lg bg-background border border-border/50 px-3 text-sm text-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {marketingTarget === "specific" ? "Selected" : "Max send"}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={marketingTarget === "specific" ? selectedUserIds.length : sendLimit}
                      onChange={(e) => setSendLimit(Math.min(1000, Math.max(1, Number(e.target.value) || 50)))}
                      disabled={marketingTarget === "specific"}
                      className="w-full h-10 rounded-lg bg-background border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                </div>

                {marketingTarget === "specific" && (
                  <div className="rounded-lg border border-border/40 bg-background/70 p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">Choose users</p>
                        <p className="text-xs text-muted-foreground">
                          Selected {selectedUserIds.length}. Only these users will receive the email.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchUsers}
                        disabled={usersLoading}
                        className="h-8"
                      >
                        {usersLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
                      </Button>
                    </div>

                    <input
                      value={specificUserSearch}
                      onChange={(e) => setSpecificUserSearch(e.target.value)}
                      placeholder="Search by name or email"
                      className="w-full h-10 rounded-lg bg-card border border-border/50 px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />

                    {selectedSpecificUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedSpecificUsers.slice(0, 8).map((selectedUser) => (
                          <button
                            key={selectedUser.id}
                            type="button"
                            onClick={() => toggleSpecificUser(selectedUser.id)}
                            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-foreground hover:bg-primary/15"
                          >
                            {(selectedUser.display_name || selectedUser.email || "Selected user")} x
                          </button>
                        ))}
                        {selectedSpecificUsers.length > 8 && (
                          <span className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                            +{selectedSpecificUsers.length - 8} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="max-h-72 overflow-y-auto rounded-lg border border-border/30">
                      {usersLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading users
                        </div>
                      ) : filteredSpecificUsers.length > 0 ? (
                        filteredSpecificUsers.map((specificUser) => {
                          const checked = selectedUserIdSet.has(specificUser.id);
                          return (
                            <button
                              key={specificUser.id}
                              type="button"
                              onClick={() => toggleSpecificUser(specificUser.id)}
                              className={cn(
                                "flex w-full items-center gap-3 border-b border-border/20 px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/40",
                                checked && "bg-primary/10"
                              )}
                            >
                              <span className={cn(
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold",
                                checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-transparent"
                              )}>
                                <Check className="h-3 w-3" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {specificUser.display_name || specificUser.email || "No name"}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {specificUser.email || "No email"} · {formatRelativeTime(specificUser.last_active_at || specificUser.last_sign_in_at)}
                                </span>
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
                      )}
                    </div>
                  </div>
                )}

                <label className="space-y-1.5 block">
                  <span className="text-xs font-medium text-muted-foreground">Subject</span>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full h-10 rounded-lg bg-background border border-border/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-xs font-medium text-muted-foreground">Message</span>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={7}
                    className="w-full rounded-lg bg-background border border-border/50 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                  <span className="block text-[11px] text-muted-foreground">
                    Use {"{{name}}"} or {"{{first_name}}"} to insert each user's saved name.
                  </span>
                </label>

                <div className="rounded-lg border border-border/40 bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">Writing guide</p>
                  <p className="mt-1">
                    Use <span className="font-mono text-foreground">{"{{name}}"}</span> for the full saved name, like
                    {" "}<span className="font-mono text-foreground">Hi {"{{name}},"}</span>
                  </p>
                  <p>
                    Use <span className="font-mono text-foreground">{"{{first_name}}"}</span> for only the first name, like
                    {" "}<span className="font-mono text-foreground">Hello {"{{first_name}},"}</span>
                  </p>
                  <p>
                    These work in both the subject and message. If a user has no saved name, MovieBay uses the email name before @.
                  </p>
                </div>

                {campaignPreview && (
                  <div className="rounded-lg bg-background border border-border/40 p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {campaignPreview.dryRun ? "Preview" : "Last send"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Matched {campaignPreview.totalMatched ?? 0} users. {campaignPreview.dryRun
                        ? `Will send to ${campaignPreview.willSend ?? 0}.`
                        : campaignPreview.queued
                          ? `Queued up to ${campaignPreview.requestedLimit ?? campaignPreview.attempted ?? 0} emails.`
                          : `${formatMarketingProvider(campaignPreview.provider)} accepted ${campaignPreview.providerAccepted ?? campaignPreview.sent ?? 0}, failed ${campaignPreview.failed ?? 0}.`}
                      {campaignPreview.provider && ` Provider: ${campaignPreview.provider}.`}
                      {campaignPreview.fromEmail && ` From: ${campaignPreview.fromEmail}.`}
                      {campaignPreview.scanLimited && " Audience scan was limited for speed."}
                      {campaignPreview.version && ` Function: ${campaignPreview.version}.`}
                    </p>
                    {!campaignPreview.dryRun && (campaignPreview.providerMessageIds?.length || 0) > 0 && (
                      <p className="mt-2 break-words text-[11px] leading-relaxed text-muted-foreground">
                        Brevo message IDs: {campaignPreview.providerMessageIds.slice(0, 3).join(", ")}
                        {campaignPreview.providerMessageIds.length > 3 ? " ..." : ""}
                      </p>
                    )}
                    {!campaignPreview.dryRun && campaignPreview.provider === "brevo" && (
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        Check Brevo Transactional logs for delivered, bounced, blocked, or delayed status.
                      </p>
                    )}
                  </div>
                )}

                {campaignError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-[11px] font-bold text-destructive">
                        !
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-destructive">Marketing email failed</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/80">
                          {campaignError}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCampaignError(null)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-background/70 hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => runMarketingCampaign(true)} disabled={campaignLoading} className="gap-2">
                    {campaignLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Preview Audience
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => runMarketingCampaign(false)}
                    disabled={campaignLoading}
                    className="gap-2"
                    title={!campaignPreview?.dryRun ? "Preview the audience before sending" : undefined}
                  >
                    {campaignLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Send Email
                  </Button>
                </div>
              </div>
            </div>

            <div className="max-w-lg">
              <SendPushPanel />
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-4 pb-8">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Quick Stats
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Total Users" value={String(users.length || "â€“")} icon={Users} />
              <StatCard label="Active Now" value={String(activeUsersCount)} icon={Radio} />
              <StatCard label="Download" value={settings.download_enabled ? "ON" : "OFF"} icon={Download} />
              <StatCard label="Maintenance" value={settings.maintenance_mode ? "ON" : "OFF"} icon={Wrench} />
              <StatCard label="Registration" value={settings.registration_enabled ? "ON" : "OFF"} icon={UserPlus} />
            </div>
            <p className="text-xs text-muted-foreground">More analytics coming soon â€” user activity, popular content, etc.</p>
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
