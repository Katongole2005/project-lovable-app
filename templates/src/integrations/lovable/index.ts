import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: opts?.redirect_uri || (typeof window !== "undefined" ? window.location : { origin: "", pathname: "", search: "", href: "" }).origin },
      });
      if (error) return { error };
      return { redirected: true };
    },
  },
};
