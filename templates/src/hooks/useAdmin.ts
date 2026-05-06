import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin(options: { enabled?: boolean } = {}) {
  const { user } = useAuth();
  const enabled = options.enabled ?? true;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdmin = async () => {
      // Hardcoded check for the main admin email
      if (user.email === "shelvinjoe11@gmail.com") {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data && !error);
      setLoading(false);
    };

    checkAdmin();
  }, [enabled, user]);

  return { isAdmin, loading };
}
