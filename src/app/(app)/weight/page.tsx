import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { PageHeader } from "@/components/game/page-header";
import { WeightForm } from "@/components/game/weight-form";
import { WeightChart } from "@/components/game/weight-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { WeightEntry } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function WeightPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const { data } = await supabase
    .from("weight_entries")
    .select("*")
    .eq("user_id", profile.id)
    .order("entry_date", { ascending: false })
    .limit(30);

  const entries = (data as WeightEntry[]) ?? [];
  const lastGoal = entries.find((e) => e.goal_kg != null)?.goal_kg ?? null;

  const chrono = [...entries].reverse();
  const current = chrono.length ? Number(chrono[chrono.length - 1].weight_kg) : null;
  const start = chrono.length ? Number(chrono[0].weight_kg) : null;
  const points = chrono.slice(-14).map((e) => ({
    label: new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    weight: Number(e.weight_kg),
  }));

  // Progresso rumo à meta (privado, sem julgamentos)
  let goalProgress: number | null = null;
  if (start != null && current != null && lastGoal != null && start !== lastGoal) {
    goalProgress = Math.max(0, Math.min(100, ((start - current) / (start - lastGoal)) * 100));
  }
  const lost = start != null && current != null ? +(start - current).toFixed(1) : null;

  return (
    <div className="px-4 pt-6">
      <PageHeader title="Meu peso" subtitle="Registro privado e opcional" />
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe sua evolução no seu ritmo. Este registro é só seu — sem rankings, sem comparações.
      </p>

      {points.length >= 2 && (
        <Card className="mt-4">
          <CardContent className="p-3">
            <WeightChart data={points} goal={lastGoal} />
          </CardContent>
        </Card>
      )}

      {goalProgress != null && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Rumo à sua meta</span>
              <span className="text-muted-foreground">{Math.round(goalProgress)}%</span>
            </div>
            <Progress value={goalProgress} className="mt-2" indicatorClassName="bg-success" />
            {lost != null && lost > 0 && (
              <p className="mt-2 text-xs text-success">
                Você já evoluiu {lost} kg desde o início. Continue com seus hábitos! 💪
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-4">
        <WeightForm lastGoal={lastGoal} />
      </div>

      <h2 className="mt-6 font-bold">Histórico</h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum registro ainda. Comece quando quiser.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between p-3.5">
                <span className="text-sm text-muted-foreground">
                  {new Date(e.entry_date + "T00:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-base font-bold">{Number(e.weight_kg).toFixed(1)} kg</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
