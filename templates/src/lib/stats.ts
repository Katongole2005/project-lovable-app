import { supabase } from "@/integrations/supabase/client";

export type UserStatMetric = 'watch_time' | 'downloads' | 'activity_points';

/**
 * Increments a specific user statistic in the database.
 * If the user is not logged in, it does nothing.
 */
export async function incrementUserStat(userId: string | undefined, metric: UserStatMetric, amount: number = 1) {
  if (!userId) return;

  try {
    // Try using the RPC first for atomic updates
    const { error: rpcError } = await supabase.rpc('increment_user_stat', {
      user_id: userId,
      metric_name: metric,
      increment_by: amount
    });

    if (rpcError) {
      console.warn("RPC increment failed, falling back to upsert:", rpcError);
      
      // Fallback: Direct upsert (less safe for concurrent updates but works without RPC)
      const { data: profile } = await supabase
        .from('profiles')
        .select(metric)
        .eq('id', userId)
        .single();

      const currentVal = profile?.[metric] || 0;
      
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          [metric]: currentVal + amount,
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;
    }
  } catch (err) {
    console.error(`Failed to update ${metric}:`, err);
  }
}

/**
 * Fetches the top 50 users for a specific metric.
 */
export async function getLeaderboard(metric: UserStatMetric, period: 'weekly' | 'allTime' = 'allTime') {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, watch_time, downloads, activity_points, level')
    .order(metric, { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }

  return data.map((user, index) => ({
    id: user.id,
    name: user.display_name || 'Anonymous',
    avatar: user.avatar_url || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.id}`,
    watchTime: user.watch_time || 0,
    downloads: user.downloads || 0,
    activity: user.activity_points || 0,
    level: user.level || 1,
    rank: index + 1
  }));
}
