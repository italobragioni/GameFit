import { Progress } from "@/components/ui/progress";
import { formatXP } from "@/lib/utils";
import type { LevelInfo } from "@/lib/game/levels";

export function LevelProgress({ info, totalXp }: { info: LevelInfo; totalXp: number }) {
  const nextXpAbsolute = info.nextLevelXp;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Nível {info.level}</p>
          <p className="text-xs text-muted-foreground">{info.title}</p>
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          {nextXpAbsolute
            ? `${formatXP(totalXp)} / ${formatXP(nextXpAbsolute)} XP`
            : `${formatXP(totalXp)} XP — nível máximo`}
        </p>
      </div>
      <Progress value={info.progress * 100} className="mt-3" />
      {info.xpForNextLevel && (
        <p className="mt-2 text-xs text-muted-foreground">
          Faltam {formatXP(Math.max(0, info.xpForNextLevel - info.xpIntoLevel))} XP para o próximo nível.
        </p>
      )}
    </div>
  );
}
