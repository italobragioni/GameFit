"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/game/feedback-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { LevelThreshold, Achievement, CompleteMissionResult } from "@/lib/types/database";

export interface ChallengeDayVM {
  id: string;
  day_number: number;
  title: string;
  description: string;
  missions: { id: string; title: string; icon: string; xp: number }[];
}

interface Props {
  days: ChallengeDayVM[];
  initialCompletedIds: string[];
  initialCurrentDay: number;
  thresholds: LevelThreshold[];
  achievements: Achievement[];
}

export function ChallengeClient({
  days,
  initialCompletedIds,
  initialCurrentDay,
  thresholds,
  achievements,
}: Props) {
  const router = useRouter();
  const { celebrate } = useFeedback();
  const [completed, setCompleted] = React.useState<Set<string>>(new Set(initialCompletedIds));
  const [currentDay, setCurrentDay] = React.useState(initialCurrentDay);
  const [openDay, setOpenDay] = React.useState<number | null>(initialCurrentDay);
  const [pending, setPending] = React.useState<string | null>(null);

  const total = days.length;
  const doneCount = completed.size;

  async function completeDay(day: ChallengeDayVM) {
    if (pending) return;
    setPending(day.id);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("complete_challenge_day", {
      p_challenge_day_id: day.id,
    });
    setPending(null);
    const result = data as CompleteMissionResult | null;
    if (error || !result) return;
    if (!result.success) {
      if (result.reason === "premium_required") router.push("/premium?from=challenge");
      return;
    }
    setCompleted((s) => new Set(s).add(day.id));
    if (day.day_number >= currentDay) {
      const next = Math.min(day.day_number + 1, total);
      setCurrentDay(next);
      setOpenDay(next);
    }
    const levelTitle = thresholds.find((t) => t.level === result.level)?.title;
    celebrate(result, { levelTitle, achievements });
    void track("challenge_day_completed", { day: day.day_number, xp: result.xp_gained });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Progresso da jornada</span>
          <span>
            {doneCount}/{total} dias
          </span>
        </div>
        <Progress value={(doneCount / total) * 100} className="mt-3" indicatorClassName="bg-accent" />
      </div>

      <div className="space-y-2.5">
        {days.map((day) => {
          const isDone = completed.has(day.id);
          const isCurrent = day.day_number === currentDay && !isDone;
          const isLocked = day.day_number > currentDay;
          const isOpen = openDay === day.day_number;

          return (
            <div key={day.id} className={cn("rounded-2xl border bg-card shadow-sm", isLocked && "opacity-60")}>
              <button
                type="button"
                onClick={() => !isLocked && setOpenDay(isOpen ? null : day.day_number)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
                disabled={isLocked}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    isDone
                      ? "bg-success/15 text-success"
                      : isCurrent
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : isLocked ? <Lock className="h-4 w-4" /> : day.day_number}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{day.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{day.description}</p>
                </div>
                {!isLocked && (
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                )}
              </button>

              {isOpen && !isLocked && (
                <div className="border-t px-3.5 pb-3.5 pt-3">
                  <ul className="space-y-2">
                    {day.missions.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{m.icon}</span>
                        <span className="flex-1">{m.title}</span>
                        <span className="text-xs font-bold text-success">+{m.xp}</span>
                      </li>
                    ))}
                  </ul>
                  {isDone ? (
                    <p className="mt-3 text-center text-sm font-semibold text-success">Dia concluído 🎉</p>
                  ) : (
                    <Button className="mt-3 w-full" onClick={() => completeDay(day)} disabled={pending === day.id}>
                      {pending === day.id ? "..." : "Concluir dia"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
