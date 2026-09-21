import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getAchievements } from "@/lib/data";
import { PageHeader } from "@/components/game/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AchievementsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = createClient();
  const [achievements, { data: unlockedRows }] = await Promise.all([
    getAchievements(),
    supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", profile.id),
  ]);

  const unlocked = new Map((unlockedRows ?? []).map((r: any) => [r.achievement_id, r.unlocked_at]));
  const unlockedCount = unlocked.size;

  return (
    <div className="px-4 pt-6">
      <PageHeader title="Conquistas" subtitle="Suas medalhas" />
      <p className="mt-1 text-sm text-muted-foreground">
        {unlockedCount} de {achievements.length} desbloqueadas
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {achievements.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          return (
            <div
              key={a.id}
              className={cn(
                "flex flex-col items-center rounded-2xl border p-4 text-center transition-all",
                isUnlocked ? "border-primary/30 bg-card shadow-sm" : "border-border bg-muted/40"
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full text-3xl",
                  isUnlocked ? "bg-primary/10" : "bg-muted grayscale"
                )}
              >
                {isUnlocked ? a.icon : "🔒"}
              </div>
              <p className={cn("mt-2 text-sm font-bold", !isUnlocked && "text-muted-foreground")}>
                {a.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
              {isUnlocked && (
                <Badge variant="success" className="mt-2">
                  Conquistada
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
