import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getIsPremium, getLevelThresholds, getAchievements } from "@/lib/data";
import { PageHeader } from "@/components/game/page-header";
import { Paywall } from "@/components/game/paywall";
import { ChallengeClient, type ChallengeDayVM } from "@/components/game/challenge-client";

export const dynamic = "force-dynamic";

export default async function ChallengesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const isPremium = await getIsPremium();

  const supabase = createClient();
  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("slug", "jornada-30-dias")
    .maybeSingle();

  return (
    <div className="px-4 pt-6">
      <PageHeader title="Jornada de 30 Dias" subtitle="Desafios" />
      <p className="mt-1 text-sm text-muted-foreground">
        {challenge?.description ?? "Pequenos passos diários para uma rotina mais leve."}
      </p>

      {!challenge ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum desafio disponível no momento.</p>
      ) : !isPremium ? (
        <div className="mt-5">
          <Paywall context="challenge" />
        </div>
      ) : (
        <div className="mt-5">
          <ChallengeLoader challengeId={challenge.id} userId={profile.id} />
        </div>
      )}
    </div>
  );
}

async function ChallengeLoader({ challengeId, userId }: { challengeId: string; userId: string }) {
  const supabase = createClient();
  const [{ data: daysRaw }, { data: missionsRaw }, { data: progress }, { data: uc }, thresholds, achievements] =
    await Promise.all([
      supabase.from("challenge_days").select("*").eq("challenge_id", challengeId).order("day_number"),
      supabase
        .from("challenge_missions")
        .select("id, title, icon, xp, challenge_day_id, sort_order")
        .order("sort_order"),
      supabase.from("user_challenge_progress").select("challenge_day_id").eq("user_id", userId),
      supabase
        .from("user_challenges")
        .select("current_day")
        .eq("user_id", userId)
        .eq("challenge_id", challengeId)
        .maybeSingle(),
      getLevelThresholds(),
      getAchievements(),
    ]);

  const days = daysRaw ?? [];
  const dayIds = new Set(days.map((d: any) => d.id));
  const missionsByDay = new Map<string, any[]>();
  (missionsRaw ?? []).forEach((m: any) => {
    if (!dayIds.has(m.challenge_day_id)) return;
    const arr = missionsByDay.get(m.challenge_day_id) ?? [];
    arr.push(m);
    missionsByDay.set(m.challenge_day_id, arr);
  });

  const vm: ChallengeDayVM[] = days.map((d: any) => ({
    id: d.id,
    day_number: d.day_number,
    title: d.title,
    description: d.description,
    missions: missionsByDay.get(d.id) ?? [],
  }));

  const completedIds = (progress ?? []).map((p: any) => p.challenge_day_id);

  return (
    <ChallengeClient
      days={vm}
      initialCompletedIds={completedIds}
      initialCurrentDay={uc?.current_day ?? 1}
      thresholds={thresholds}
      achievements={achievements}
    />
  );
}
