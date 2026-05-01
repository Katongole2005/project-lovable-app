import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_ADMIN_EMAIL = "shelvinjoe11@gmail.com";
const USERS_PER_PAGE = 1000;

function buildMetadataName(metadata: Record<string, any> | null | undefined): string {
  const firstName = String(metadata?.first_name || "").trim();
  const lastName = String(metadata?.last_name || "").trim();
  return String(
    metadata?.full_name ||
    metadata?.name ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    ""
  ).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email?.toLowerCase();

    // Check admin role using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData && userEmail !== FALLBACK_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch users using admin API
    const allUsers: any[] = [];
    let page = 1;

    while (true) {
      const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({
        page,
        perPage: USERS_PER_PAGE,
      });

      if (usersError) {
        throw usersError;
      }

      const batch = usersData?.users || [];
      allUsers.push(...batch);

      if (batch.length < USERS_PER_PAGE) {
        break;
      }

      page += 1;
    }

    const users = allUsers.map((u: any) => ({
      id: u.id,
      email: u.email || "",
      metadata_name: buildMetadataName(u.user_metadata),
      avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    const userIds = users.map((u) => u.id);
    const { data: profiles, error: profilesError } = userIds.length
      ? await adminClient
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const profileByUserId = new Map((profiles || []).map((profile: any) => [profile.id, profile]));

    const { data: activeSessions, error: sessionsError } = userIds.length
      ? await adminClient
          .from("active_sessions")
          .select("user_id, session_id, updated_at")
          .in("user_id", userIds)
      : { data: [], error: null };

    if (sessionsError) throw sessionsError;

    const now = Date.now();
    const activeByUserId = new Map(
      (activeSessions || []).map((session: any) => {
        const lastActiveAt = session.updated_at || null;
        const isActive = lastActiveAt
          ? now - new Date(lastActiveAt).getTime() <= 5 * 60 * 1000
          : false;
        return [session.user_id, {
          session_id: session.session_id,
          last_active_at: lastActiveAt,
          is_active: isActive,
        }];
      })
    );

    const usersWithActivity = users
      .map((u) => {
        const activity = activeByUserId.get(u.id);
        const profile = profileByUserId.get(u.id);
        const displayName = String(profile?.display_name || u.metadata_name || "").trim();
        return {
          ...u,
          display_name: displayName || null,
          avatar_url: profile?.avatar_url || u.avatar_url || null,
          session_id: activity?.session_id || null,
          last_active_at: activity?.last_active_at || null,
          is_active: Boolean(activity?.is_active),
        };
      })
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        const aTime = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
        const bTime = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
        return bTime - aTime;
      });

    return new Response(JSON.stringify({ users: usersWithActivity }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
