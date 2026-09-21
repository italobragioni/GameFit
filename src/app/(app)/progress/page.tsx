import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProfile,
  getStreak,
  getIsPremium,
  getMissionsLastDays,
} from "@/lib/data";
import { PageHeader } from "@/components/game/page-header";
import { Paywall } from "@/components/game/paywall";
import { WeeklyChart } from "@/components/game/progress-charts";
import { Card, CardContent } from "@/components/ui/card";
import { formatXP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const isPremium = await getIsPremium();

  const [streak, { count: missionCount }, { data: distinctDays }, { count: medals }, weekly] =
    await Promise.all([
      getStreak(profile.id),
      supabase.from("user_missions").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      supabase.from("user_missions").select("day").eq("user_id", profile.id),
      supabase.from("user_achievements").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      getMissionsLastDays(profile.id, 7),
    ]);

  const activeDays = new Set((distinctDays ?? []).map((r: any) => r.day)).size;
  const monthly = await getMissionsLastDays(profile.id, 30);
  const monthActiveDays = monthly.filter((d) => d.count > 0).length;

  const stats = [
    { label: "XP total", value: formatXP(profile.total_xp) },
    { label: "Nível atual", value: String(profile.level) },
    { label: "Sequência atual", value: `${streak?.current_streak ?? 0} dias` },
    { label: "Melhor sequência", value: `${streak?.best_streak ?? 0} dias` },
    { label: "Missões concluídas", value: String(missionCount ?? 0) },
    { label: "Dias ativos", value: String(activeDays) },
    { label: "Medalhas", value: String(medals ?? 0) },
    { label: "Consistência (30d)", value: `${monthActiveDays}/30` },
  ];

  return (
    <div className="px-4 pt-6">
      <PageHeader title="Meu Progresso" subtitle="Sua evolução" />

      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-extrabold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-6 font-bold">Missões concluídas nos últimos 7 dias</h2>
      <Card className="mt-3">
        <CardContent className="p-3">
          <WeeklyChart data={weekly} />
        </CardContent>
      </Card>

      <h2 className="mt-6 font-bold">Consistência mensal</h2>
      {isPremium ? (
        <Card className="mt-3">
          <CardContent className="p-4">
            <WeeklyChart data={monthly.map((d, i) => ({ label: String(i + 1), count: d.count }))} />
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Você esteve ativo em {monthActiveDays} dos últimos 30 dias.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3">
          <Paywall context="progress" />
        </div>
      )}

      <p className="mt-6 pb-2 text-center text-xs text-muted-foreground">
        Estes dados mostram sua evolução pessoal e não substituem orientação profissional de saúde.
      </p>
    </div>
  );
}
