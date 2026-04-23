import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

function createFallbackSessionId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join("-");
  }

  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Generates a unique session ID for this browser tab/device.
 * Stored in sessionStorage so each tab gets its own ID.
 */
function getOrCreateSessionId(): string {
  const KEY = "app_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = createFallbackSessionId();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

/**
 * Enforces single-session per user.
 * When a user logs in, their session ID is upserted into `active_sessions`.
 * A realtime subscription listens for changes — if another device updates
 * the session ID, this device signs out automatically.
 */
export function useSingleSession(user: User | null) {
  const { toast } = useToast();
  const sessionIdRef = useRef(getOrCreateSessionId());
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user) {
      registeredRef.current = false;
      return;
    }

    const sessionId = sessionIdRef.current;

    // Register this session
    const register = async () => {
      if (registeredRef.current) return;
      registeredRef.current = true;

      await supabase
        .from("active_sessions")
        .upsert(
          { user_id: user.id, session_id: sessionId, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    };

    register();

    // Listen for changes via realtime
    const channel = supabase
      .channel(`session-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "active_sessions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newSessionId = (payload.new as { session_id: string }).session_id;
          if (newSessionId !== sessionId) {
            // Another device took over — sign out
            toast({
              title: "Signed out",
              description: "Your account was logged in on another device.",
              variant: "destructive",
            });
            supabase.auth.signOut();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);
}
