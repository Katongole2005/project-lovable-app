import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

/**
 * Generates a unique session ID for this browser tab/device.
 * Stored in sessionStorage so each tab gets its own ID.
 */
function getOrCreateSessionId(): string {
  const KEY = "app_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
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
