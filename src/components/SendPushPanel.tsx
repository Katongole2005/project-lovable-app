import { useState } from "react";
import { Send, Bell, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SendPushPanelProps {
  className?: string;
}

export function SendPushPanel({ className }: SendPushPanelProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: { title, body, url },
      });

      if (error) throw error;

      if (data.success) {
        setResult({ success: true, message: `Sent to ${data.sent} subscriber(s)` });
        setTitle("");
        setBody("");
      } else {
        setResult({ success: false, message: data.message || "Failed to send" });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "An error occurred" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn("rounded-2xl bg-card/60 backdrop-blur border border-border/30 p-4 space-y-4", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Send Push Notification</p>
          <p className="text-xs text-muted-foreground">Broadcast to all subscribers</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Requires VAPID keys configured in your backend secrets. Generate them at{" "}
          <span className="text-primary font-medium">vapidkeys.com</span>
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New movie available!"
            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Check out the latest content on MovieBay…"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Link (optional)</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/"
            className="w-full px-3 py-2.5 rounded-xl bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {result && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-xl text-xs",
            result.success
              ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400"
              : "bg-destructive/10 border border-destructive/20 text-destructive"
          )}
        >
          {result.success ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <Button
        onClick={handleSend}
        disabled={sending || !title.trim() || !body.trim()}
        className="w-full h-10 rounded-xl gap-2"
      >
        {sending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
        {sending ? "Sending…" : "Send Notification"}
      </Button>
    </div>
  );
}
