import { useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function createSessionId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId(): string {
  const key = "moviebay_active_session_id";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = createSessionId();
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export function useActiveSessionHeartbeat(user: User | null) {
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    sessionIdRef.current ||= getSessionId();
    let stopped = false;

    const ping = async () => {
      if (stopped || document.visibilityState === "hidden") return;

      const { error } = await supabase
        .from("active_sessions")
        .upsert(
          {
            user_id: user.id,
            session_id: sessionIdRef.current!,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (error) {
        console.warn("Failed to update active session:", error.message);
      }
    };

    void ping();
    const interval = window.setInterval(ping, 60000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void ping();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user]);
}
