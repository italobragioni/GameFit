"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Check, ClipboardCheck, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/game/feedback-provider";
import { StatRow } from "@/components/game/stat-row";
import { LevelProgress } from "@/components/game/level-progress";
import { WeightChart, type WeightPoint } from "@/components/game/weight-chart";
import { Logo } from "@/components/brand/logo";
import { Scale, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getLevelInfo } from "@/lib/game/levels";
import { greeting, cn } from "@/lib/utils";
import { DAILY_GOAL } from "@/lib/game/config";
import { track } from "@/lib/analytics";
import type { DailyMission } from "@/lib/data";
import type { LevelThreshold, Achievement, CompleteMissionResult } from "@/lib/types/database";

interface WeightSummary {
  current: number | null;
  start: number | null;
  goal: number | null;
  points: WeightPoint[];
}

interface Props {
  name: string;
  initialXp: number;
  initialLevel: number;
  initialStreak: number;
  thresholds: LevelThreshold[];
  missions: DailyMission[];
  achievements: Achievement[];
  hasCheckinToday: boolean;
  weight: WeightSummary;
}

export function DashboardClient({
  name,
  initialXp,
  initialStreak,
  thresholds,
  missions: initialMissions,
  achievements,
  hasCheckinToday,
  weight,
}: Props) {
  const router = useRouter();
  const { celebrate } = useFeedback();
  const [xp, setXp] = React.useState(initialXp);
  const [streak, setStreak] = React.useState(initialStreak);
  const [missions, setMissions] = React.useState(initialMissions);
  const [pending, setPending] = React.useState<string | null>(null);

  const levelInfo = getLevelInfo(xp, thresholds);
  const doneCount = missions.filter((m) => m.completed).length;
  const goalMet = doneCount >= DAILY_GOAL;

  async function handleComplete(mission: DailyMission) {
    if (mission.locked) {
      router.push("/premium?from=mission");
      return;
    }
    if (mission.completed || pending) return;

    setPending(mission.id);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("complete_mission", { p_mission_id: mission.id });
    setPending(null);

    const result = data as CompleteMissionResult | null;
    if (error || !result) return;

    if (!result.success) {
      if (result.reason === "premium_required") router.push("/premium?from=mission");
      return;
    }

    // Atualiza estado local
    setMissions((ms) => ms.map((m) => (m.id === mission.id ? { ...m, completed: true } : m)));
    if (result.total_xp != null) setXp(result.total_xp);
    if (result.current_streak != null) setStreak(result.current_streak);

    const levelTitle = thresholds.find((t) => t.level === result.level)?.title;
    celebrate(result, { levelTitle, achievements });

    void track("mission_completed", { mission_id: mission.id, xp: result.xp_gained });
    if (result.day_complete) void track("daily_goal_completed", {});
    if (result.leveled_up) void track("level_up", { level: result.level });
  }

  return (
    <div className="space-y-5 px-4 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl font-extrabold">{name} 👋</h1>
        </div>
        <Logo className="h-14" />
      </header>

      <StatRow streak={streak} xp={xp} level={levelInfo.level} />
      <LevelProgress info={levelInfo} totalXp={xp} />

      {/* Acompanhamento de peso */}
      <WeightCard weight={weight} />

      {/* Check-in do dia */}
      {!hasCheckinToday && (
        <Link href="/checkin" className="block">
          <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
            <ClipboardCheck className="h-6 w-6 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-bold">Check-in diário</p>
              <p className="text-xs text-muted-foreground">Como você está se sentindo hoje?</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      )}

      {/* Progresso do dia */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Missões de hoje</p>
          <Badge variant={goalMet ? "success" : "muted"}>
            {doneCount}/{Math.max(DAILY_GOAL, missions.filter((m) => !m.locked).length)} concluídas
          </Badge>
        </div>
        <Progress value={(doneCount / DAILY_GOAL) * 100} className="mt-3" indicatorClassName="bg-success" />
        {goalMet ? (
          <p className="mt-2 text-xs font-semibold text-success">Meta do dia batida! 🎉 Sua sequência está segura.</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Conclua {DAILY_GOAL} missões para manter sua sequência 🔥
          </p>
        )}
      </div>

      {/* Lista de missões */}
      <section className="space-y-2.5">
        {missions.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-sm transition-all",
              m.completed && "opacity-70"
            )}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">
              {m.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{m.title}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-xs font-bold text-success">+{m.xp} XP</span>
                {m.locked && <Badge variant="premium" className="px-1.5 py-0 text-[10px]">Premium</Badge>}
              </div>
            </div>
            {m.completed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
                <Check className="h-5 w-5 text-success" />
              </div>
            ) : m.locked ? (
              <Button size="sm" variant="outline" onClick={() => handleComplete(m)}>
                <Lock className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleComplete(m)} disabled={pending === m.id}>
                {pending === m.id ? "..." : "Concluir"}
              </Button>
            )}
          </div>
        ))}
      </section>

      {missions.some((m) => m.locked) && (
        <Link href="/premium?from=dashboard" className="block">
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
            <p className="text-sm font-bold text-primary">Desbloqueie todas as missões 🚀</p>
            <p className="text-xs text-muted-foreground">Premium por R$19/mês. Cancele quando quiser.</p>
          </div>
        </Link>
      )}
    </div>
  );
}

function WeightCard({ weight }: { weight: WeightSummary }) {
  if (weight.current == null) {
    return (
      <Link href="/weight" className="block">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <Scale className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-bold">Acompanhe seu peso</p>
            <p className="text-xs text-muted-foreground">Registre seu peso e veja sua evolução.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  const delta = weight.start != null ? +(weight.current - weight.start).toFixed(1) : null;
  const towardGoal = delta != null && delta < 0;

  return (
    <Link href="/weight" className="block">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <p className="text-sm font-bold">Seu peso</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-extrabold">{weight.current.toFixed(1)} kg</span>
            {delta != null && delta !== 0 && (
              <span
                className={cn(
                  "ml-2 inline-flex items-center gap-0.5 text-xs font-semibold",
                  towardGoal ? "text-success" : "text-muted-foreground"
                )}
              >
                {towardGoal && <TrendingDown className="h-3 w-3" />}
                {delta > 0 ? "+" : ""}
                {delta} kg
              </span>
            )}
          </div>
        </div>
        {weight.points.length >= 2 ? (
          <div className="mt-2">
            <WeightChart data={weight.points} goal={weight.goal} height={140} />
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Registre mais alguns dias para ver seu gráfico de evolução.
          </p>
        )}
        {weight.goal != null && (
          <p className="mt-1 text-xs text-muted-foreground">
            Meta: {weight.goal.toFixed(1)} kg · continue com seus hábitos 💪
          </p>
        )}
      </div>
    </Link>
  );
}
