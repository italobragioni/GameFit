"use client";

import * as React from "react";
import { Confetti } from "./confetti";
import { Button } from "@/components/ui/button";
import type { CompleteMissionResult, Achievement } from "@/lib/types/database";
import { randomFeedback } from "@/lib/game/config";

interface Toast {
  id: number;
  message: string;
  emoji?: string;
  variant?: "default" | "success" | "error";
}

interface LevelUp {
  level: number;
  title?: string;
}

interface FeedbackContextValue {
  toast: (message: string, opts?: { emoji?: string; variant?: Toast["variant"] }) => void;
  floatXp: (amount: number) => void;
  levelUp: (info: LevelUp) => void;
  /** Processa o retorno de complete_mission e dispara todas as animações. */
  celebrate: (
    result: CompleteMissionResult,
    ctx?: { levelTitle?: string; achievements?: Achievement[] }
  ) => void;
}

const FeedbackContext = React.createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = React.useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback deve ser usado dentro de <FeedbackProvider>");
  return ctx;
}

let counter = 0;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [xpFloats, setXpFloats] = React.useState<{ id: number; amount: number }[]>([]);
  const [levelUpInfo, setLevelUpInfo] = React.useState<LevelUp | null>(null);

  const toast = React.useCallback<FeedbackContextValue["toast"]>((message, opts) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, emoji: opts?.emoji, variant: opts?.variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const floatXp = React.useCallback((amount: number) => {
    const id = ++counter;
    setXpFloats((f) => [...f, { id, amount }]);
    setTimeout(() => setXpFloats((f) => f.filter((x) => x.id !== id)), 1300);
  }, []);

  const levelUp = React.useCallback((info: LevelUp) => setLevelUpInfo(info), []);

  const celebrate = React.useCallback<FeedbackContextValue["celebrate"]>(
    (result, ctx) => {
      if (!result.success) return;
      if (result.xp_gained) {
        floatXp(result.xp_gained);
        toast(`+${result.xp_gained} XP 🎉`, { variant: "success" });
      }
      setTimeout(() => {
        if (result.day_complete) toast("DIA COMPLETO 🎉", { variant: "success" });
      }, 400);
      if (result.unlocked_achievements && result.unlocked_achievements.length > 0) {
        result.unlocked_achievements.forEach((code, i) => {
          const ach = ctx?.achievements?.find((a) => a.code === code);
          setTimeout(
            () => toast(`Conquista desbloqueada: ${ach?.title ?? code}`, { emoji: ach?.icon ?? "🏅" }),
            700 + i * 600
          );
        });
      }
      if (result.leveled_up && result.level) {
        setTimeout(() => levelUp({ level: result.level!, title: ctx?.levelTitle }), 900);
      }
    },
    [floatXp, toast, levelUp]
  );

  const value = React.useMemo(
    () => ({ toast, floatXp, levelUp, celebrate }),
    [toast, floatXp, levelUp, celebrate]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* +XP flutuante (centralizado) */}
      <div className="pointer-events-none fixed inset-x-0 top-1/3 z-[60] flex flex-col items-center gap-2">
        {xpFloats.map((f) => (
          <span
            key={f.id}
            className="animate-float-up rounded-full bg-success px-4 py-1.5 text-lg font-extrabold text-success-foreground shadow-lg"
          >
            +{f.amount} XP
          </span>
        ))}
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "animate-pop-in pointer-events-auto flex max-w-sm items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg " +
              (t.variant === "success"
                ? "bg-success text-success-foreground"
                : t.variant === "error"
                ? "bg-destructive text-destructive-foreground"
                : "bg-foreground text-background")
            }
          >
            {t.emoji && <span className="text-lg">{t.emoji}</span>}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Modal de novo nível */}
      {levelUpInfo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6">
          <div className="animate-pop-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-card p-8 text-center shadow-2xl">
            <Confetti count={30} />
            <div className="relative">
              <div className="mb-2 text-6xl">🎉</div>
              <h2 className="text-2xl font-extrabold text-primary">NOVO NÍVEL!</h2>
              <p className="mt-2 text-lg font-semibold">Você chegou ao nível {levelUpInfo.level}.</p>
              {levelUpInfo.title && (
                <p className="mt-1 text-sm text-muted-foreground">{levelUpInfo.title}</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">{randomFeedback()}</p>
              <Button className="mt-6 w-full" onClick={() => setLevelUpInfo(null)}>
                Continuar
              </Button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
