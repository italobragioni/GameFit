import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { PageHeader } from "@/components/game/page-header";
import { WeightForm } from "@/components/game/weight-form";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <div className="px-4 pt-6">
      <PageHeader title="Meu peso" subtitle="Registro privado e opcional" />
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe sua evolução no seu ritmo. Este registro é só seu — sem rankings, sem comparações.
      </p>

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
