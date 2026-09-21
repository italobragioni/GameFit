import { Flame, Star, Trophy } from "lucide-react";
import { formatXP } from "@/lib/utils";

export function StatRow({ streak, xp, level }: { streak: number; xp: number; level: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat icon={<Flame className="h-5 w-5 text-orange-500" />} value={String(streak)} label={streak === 1 ? "dia" : "dias"} sub="sequência" />
      <Stat icon={<Star className="h-5 w-5 text-amber-500" />} value={formatXP(xp)} label="XP" sub="experiência" />
      <Stat icon={<Trophy className="h-5 w-5 text-emerald-600" />} value={String(level)} label="nível" sub="atual" />
    </div>
  );
}

function Stat({ icon, value, label, sub }: { icon: React.ReactNode; value: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border bg-card p-3 text-center shadow-sm">
      <div className="flex justify-center">{icon}</div>
      <div className="mt-1 text-xl font-extrabold leading-tight">{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
