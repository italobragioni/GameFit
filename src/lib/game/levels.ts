import type { LevelThreshold } from "@/lib/types/database";

export interface LevelInfo {
  level: number;
  title: string;
  currentLevelXp: number; // XP mínimo do nível atual
  nextLevelXp: number | null; // XP mínimo do próximo nível (null se máximo)
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  progress: number; // 0..1 dentro do nível atual
}

/**
 * Calcula informações de nível a partir do XP total e da tabela de níveis.
 * A tabela deve vir ordenada por level asc.
 */
export function getLevelInfo(totalXp: number, thresholds: LevelThreshold[]): LevelInfo {
  const sorted = [...thresholds].sort((a, b) => a.level - b.level);
  let current = sorted[0] ?? { level: 1, min_xp: 0, title: "Nível 1" };

  for (const t of sorted) {
    if (totalXp >= t.min_xp) current = t;
    else break;
  }

  const next = sorted.find((t) => t.level === current.level + 1) ?? null;
  const xpIntoLevel = totalXp - current.min_xp;
  const xpForNextLevel = next ? next.min_xp - current.min_xp : null;
  const progress = xpForNextLevel && xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 1;

  return {
    level: current.level,
    title: current.title,
    currentLevelXp: current.min_xp,
    nextLevelXp: next?.min_xp ?? null,
    xpIntoLevel,
    xpForNextLevel,
    progress,
  };
}

/** Emoji de fogo por faixa de sequência. */
export function streakLabel(days: number): string {
  return `🔥 ${days} ${days === 1 ? "dia" : "dias"}`;
}
