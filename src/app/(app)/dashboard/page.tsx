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

  const [thresholds, streak, missions, achievements, checkin, weightRows] = await Promise.all([
    getLevelThresholds(),
    getStreak(profile.id),
    getDailyMissions(profile.id, profile.focus_areas, isPremium, profile.intensity),
    getAchievements(),
    supabase.from("daily_checkins").select("id").eq("user_id", profile.id).eq("day", todayUTC()).maybeSingle(),
    supabase
      .from("weight_entries")
      .select("weight_kg, goal_kg, entry_date")
      .eq("user_id", profile.id)
      .order("entry_date", { ascending: true })
      .limit(30),
  ]);

  const wEntries = (weightRows.data ?? []) as { weight_kg: number; goal_kg: number | null; entry_date: string }[];
  const weight = {
    current: wEntries.length ? Number(wEntries[wEntries.length - 1].weight_kg) : null,
    start: wEntries.length ? Number(wEntries[0].weight_kg) : null,
    goal: [...wEntries].reverse().find((e) => e.goal_kg != null)?.goal_kg ?? null,
    points: wEntries.slice(-10).map((e) => ({
      label: new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      weight: Number(e.weight_kg),
    })),
  };

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
      weight={weight}
    />
  );
}
