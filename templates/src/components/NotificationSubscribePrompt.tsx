import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, Check, Clock, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";

const PROMPT_DELAY_MS = 1800;
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const DISMISS_MS = 10 * 24 * 60 * 60 * 1000;
const HIDDEN_PATHS = ["/auth", "/admin", "/privacy", "/terms"];

function storageKey(userId: string) {
  return `moviebay_push_prompt_until_${userId}`;
}

function isSnoozed(userId: string) {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return false;
  const until = Number(raw);
  return Number.isFinite(until) && until > Date.now();
}

function snooze(userId: string, ms: number) {
  localStorage.setItem(storageKey(userId), String(Date.now() + ms));
}

export function NotificationSubscribePrompt() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const { status, subscribe } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const shouldHideForPath = useMemo(
    () => HIDDEN_PATHS.some((path) => pathname.toLowerCase().startsWith(path)),
    [pathname]
  );

  useEffect(() => {
    setVisible(false);

    if (loading || !user || shouldHideForPath || hasInteracted) return;
    if (status !== "idle") return;
    if (isSnoozed(user.id)) return;

    const timeoutId = window.setTimeout(() => setVisible(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [hasInteracted, loading, shouldHideForPath, status, user]);

  if (!user || status !== "idle") return null;

  const handleSubscribe = async () => {
    setHasInteracted(true);
    await subscribe();
    setVisible(false);
  };

  const handleLater = () => {
    snooze(user.id, SNOOZE_MS);
    setHasInteracted(true);
    setVisible(false);
  };

  const handleDismiss = () => {
    snooze(user.id, DISMISS_MS);
    setHasInteracted(true);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 left-4 right-4 z-[70] mx-auto max-w-[420px] md:left-auto md:right-6 md:mx-0"
          role="dialog"
          aria-live="polite"
          aria-label="Enable movie notifications"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#09090b]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
            <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-3 top-3 rounded-full p-2 text-white/35 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Dismiss notifications prompt"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-4 pr-12">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  <BellRing className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold tracking-tight text-white">New movie alerts</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    Get a quiet alert when fresh Luganda translated movies are added.
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-[11px] font-medium text-white/45">
                <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.035] px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  New releases
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.035] px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  No spam
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubscribe} className="h-10 flex-1 rounded-xl gap-2 font-bold">
                  <Bell className="h-4 w-4" />
                  Enable
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleLater}
                  className="h-10 rounded-xl px-4 text-white/55 hover:bg-white/5 hover:text-white"
                >
                  Later
                </Button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
