import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  getLevelThresholds,
  getStreak,
  getDailyMissions,
  getAchievements,
  getIsPremium,
} from "@/lib/data";
import { DashboardClient } from "@/components/game/dashboard-client";
import { todayUTC } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const isPremium = await getIsPremium();

  const [thresholds, streak, missions, achievements, checkin] = await Promise.all([
    getLevelThresholds(),
    getStreak(profile.id),
    getDailyMissions(profile.id, profile.focus_areas, isPremium, profile.intensity),
    getAchievements(),
    supabase.from("daily_checkins").select("id").eq("user_id", profile.id).eq("day", todayUTC()).maybeSingle(),
  ]);

  return (
    <DashboardClient
      name={profile.full_name ?? "por aqui"}
      initialXp={profile.total_xp}
      initialLevel={profile.level}
      initialStreak={streak?.current_streak ?? 0}
      thresholds={thresholds}
      missions={missions}
      achievements={achievements}
      hasCheckinToday={Boolean(checkin.data)}
    />
  );
}
