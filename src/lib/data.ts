import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  LevelThreshold,
  Streak,
  Mission,
  Achievement,
} from "@/lib/types/database";
import { todayUTC } from "@/lib/utils";

/** Usuário autenticado + profile. Retorna null se não logado. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
}

export async function getIsPremium(): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase.rpc("is_premium", { p_user: (await getUserId()) });
  return Boolean(data);
}

async function getUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getLevelThresholds(): Promise<LevelThreshold[]> {
  const supabase = createClient();
  const { data } = await supabase.from("level_thresholds").select("*").order("level");
  return (data as LevelThreshold[]) ?? [];
}

export async function getStreak(userId: string): Promise<Streak | null> {
  const supabase = createClient();
  const { data } = await supabase.from("streaks").select("*").eq("user_id", userId).single();
  return (data as Streak) ?? null;
}

export async function getAchievements(): Promise<Achievement[]> {
  const supabase = createClient();
  const { data } = await supabase.from("achievements").select("*").order("sort_order");
  return (data as Achievement[]) ?? [];
}

export interface DailyMission extends Mission {
  completed: boolean;
  locked: boolean; // premium exigido e usuário não é premium
}

/**
 * Seleciona as missões do dia priorizando as áreas de foco do usuário.
 * Contas grátis veem um número limitado de missões grátis + missões premium bloqueadas (teaser).
 */
export async function getDailyMissions(
  userId: string,
  focusAreas: string[],
  isPremium: boolean,
  intensity: string
): Promise<DailyMission[]> {
  const supabase = createClient();
  const today = todayUTC();

  const [{ data: missionsRaw }, { data: completed }] = await Promise.all([
    supabase.from("missions").select("*").eq("active", true).eq("recurrence", "daily").order("sort_order"),
    supabase.from("user_missions").select("mission_id").eq("user_id", userId).eq("day", today),
  ]);

  const missions = (missionsRaw as Mission[]) ?? [];
  const doneIds = new Set((completed ?? []).map((c: any) => c.mission_id));

  // Ordena: foco do usuário primeiro, depois demais.
  const focus = new Set(focusAreas);
  const scored = missions
    .map((m) => ({ m, score: focus.has(m.category) ? 0 : 1 }))
    .sort((a, b) => a.score - b.score || a.m.sort_order - b.m.sort_order)
    .map((x) => x.m);

  // Quantas missões mostrar por intensidade.
  const cap = intensity === "leve" ? 4 : intensity === "desafiadora" ? 8 : 6;

  if (isPremium) {
    return scored.slice(0, cap).map((m) => ({ ...m, completed: doneIds.has(m.id), locked: false }));
  }

  // Grátis: prioriza missões grátis (limite) + alguns teasers premium bloqueados.
  const free = scored.filter((m) => !m.is_premium).slice(0, 3);
  const premiumTeasers = scored.filter((m) => m.is_premium).slice(0, 3);
  return [
    ...free.map((m) => ({ ...m, completed: doneIds.has(m.id), locked: false })),
    ...premiumTeasers.map((m) => ({ ...m, completed: false, locked: true })),
  ];
}

/** Missões concluídas nos últimos N dias (para gráficos). */
export async function getMissionsLastDays(userId: string, days: number) {
  const supabase = createClient();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceStr = since.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("user_missions")
    .select("day")
    .eq("user_id", userId)
    .gte("day", sinceStr);

  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    counts[r.day] = (counts[r.day] ?? 0) + 1;
  });

  const result: { date: string; label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({
      date: key,
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      count: counts[key] ?? 0,
    });
  }
  return result;
}
