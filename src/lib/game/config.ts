import type { MissionCategory } from "@/lib/types/database";

export const DAILY_GOAL = 3; // missões concluídas para o dia contar na sequência
export const FREE_DAILY_MISSION_LIMIT = 3; // missões visíveis para conta grátis
export const PREMIUM_PRICE_LABEL = "R$19";
export const PREMIUM_PRICE_MONTHLY = 19;

export const CATEGORY_META: Record<
  MissionCategory,
  { label: string; icon: string; color: string; textColor: string }
> = {
  hidratacao: { label: "Hidratação", icon: "💧", color: "bg-sky-100", textColor: "text-sky-700" },
  alimentacao: { label: "Alimentação", icon: "🥗", color: "bg-emerald-100", textColor: "text-emerald-700" },
  movimento: { label: "Movimento", icon: "🚶", color: "bg-orange-100", textColor: "text-orange-700" },
  sono: { label: "Sono", icon: "😴", color: "bg-indigo-100", textColor: "text-indigo-700" },
  organizacao: { label: "Organização", icon: "🗓️", color: "bg-amber-100", textColor: "text-amber-700" },
  mindfulness: { label: "Mindfulness", icon: "🧘", color: "bg-violet-100", textColor: "text-violet-700" },
  outros: { label: "Outros", icon: "✨", color: "bg-slate-100", textColor: "text-slate-700" },
};

export const FOCUS_OPTIONS: { value: MissionCategory; label: string; icon: string }[] = [
  { value: "alimentacao", label: "Alimentação", icon: "🥗" },
  { value: "hidratacao", label: "Hidratação", icon: "💧" },
  { value: "movimento", label: "Movimento", icon: "🚶" },
  { value: "sono", label: "Sono", icon: "😴" },
  { value: "organizacao", label: "Organização", icon: "🗓️" },
  { value: "mindfulness", label: "Consistência", icon: "🔥" },
];

export const INTENSITY_OPTIONS = [
  { value: "leve", label: "Leve", description: "Poucas missões por dia, sem pressão." },
  { value: "moderada", label: "Moderada", description: "Um equilíbrio saudável de missões." },
  { value: "desafiadora", label: "Desafiadora", description: "Quero o máximo de missões." },
] as const;

export const MOOD_OPTIONS = [
  { value: 5, emoji: "😁", label: "Muito bem" },
  { value: 4, emoji: "🙂", label: "Bem" },
  { value: 3, emoji: "😐", label: "Normal" },
  { value: 2, emoji: "😕", label: "Difícil" },
  { value: 1, emoji: "😫", label: "Muito difícil" },
];

export const NUTRITION_OPTIONS = [
  { value: 4, label: "Muito boa" },
  { value: 3, label: "Boa" },
  { value: 2, label: "Razoável" },
  { value: 1, label: "Difícil" },
];

export const MOVEMENT_OPTIONS = [
  { value: 2, label: "Sim" },
  { value: 1, label: "Um pouco" },
  { value: 0, label: "Não" },
];

/** Frases positivas de feedback ao concluir missão. */
export const POSITIVE_FEEDBACK = [
  "Mandou bem!",
  "Você está evoluindo!",
  "Mais um passo dado!",
  "Continue assim!",
  "Que consistência!",
  "Orgulho de você!",
];

export function randomFeedback(): string {
  return POSITIVE_FEEDBACK[Math.floor(Math.random() * POSITIVE_FEEDBACK.length)];
}
