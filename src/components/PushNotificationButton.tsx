import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

interface PushNotificationButtonProps {
  variant?: "default" | "profile";
}

export function PushNotificationButton({ variant = "default" }: PushNotificationButtonProps) {
  const { status, subscribe, unsubscribe } = usePushNotifications();

  if (status === "unsupported") return null;

  if (variant === "profile") {
    return (
      <button
        onClick={status === "subscribed" ? unsubscribe : subscribe}
        disabled={status === "loading"}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card/60 backdrop-blur border border-border/30 hover:bg-accent/50 transition-colors disabled:opacity-60"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background:
              status === "subscribed"
                ? "hsl(var(--primary) / 0.15)"
                : status === "denied"
                ? "hsl(var(--destructive) / 0.15)"
                : "hsl(var(--muted))",
          }}
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : status === "subscribed" ? (
            <BellRing className="w-4 h-4 text-primary" />
          ) : status === "denied" ? (
            <BellOff className="w-4 h-4 text-destructive" />
          ) : (
            <Bell className="w-4 h-4 text-foreground" />
          )}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-foreground">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
            {status === "subscribed"
              ? "Tap to unsubscribe"
              : status === "denied"
              ? "Blocked in browser settings"
              : status === "loading"
              ? "Setting up…"
              : "Get notified about new content"}
          </p>
        </div>
      </button>
    );
  }

  return (
    <Button
      size="sm"
      variant={status === "subscribed" ? "outline" : "default"}
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      disabled={status === "loading" || status === "denied"}
      className={cn("gap-2 rounded-full", status === "denied" && "opacity-60 cursor-not-allowed")}
    >
      {status === "loading" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : status === "subscribed" ? (
        <BellRing className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {status === "subscribed"
        ? "Subscribed"
        : status === "denied"
        ? "Blocked"
        : status === "loading"
        ? "Subscribing…"
        : "Get Notified"}
    </Button>
  );
}
