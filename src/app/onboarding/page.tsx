"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FOCUS_OPTIONS, INTENSITY_OPTIONS } from "@/lib/game/config";
import { completeOnboarding } from "@/lib/actions";
import { track } from "@/lib/analytics";
import type { MissionCategory } from "@/lib/types/database";

const WEEK_OPTIONS = [3, 4, 5, 6, 7];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [focus, setFocus] = React.useState<MissionCategory[]>([]);
  const [weekly, setWeekly] = React.useState(5);
  const [intensity, setIntensity] = React.useState<"leve" | "moderada" | "desafiadora">("moderada");
  const [saving, setSaving] = React.useState(false);

  const totalSteps = 5;

  function toggleFocus(v: MissionCategory) {
    setFocus((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      if (prev.length >= 3) return prev;
      return [...prev, v];
    });
  }

  async function finish() {
    setSaving(true);
    const res = await completeOnboarding({ focusAreas: focus, weeklyGoal: weekly, intensity });
    if (res.success) {
      await track("onboarding_completed", { focus, weekly, intensity });
      router.push("/dashboard");
      router.refresh();
    } else {
      setSaving(false);
      alert(res.error ?? "Não foi possível salvar. Tente novamente.");
    }
  }

  const canNext = step === 1 ? focus.length >= 1 : true;

  return (
    <div className="flex min-h-dvh flex-col bg-secondary/20 px-6 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Progress value={((step + 1) / totalSteps) * 100} className="mb-8" />

        <div className="flex flex-1 flex-col">
          {step === 0 && (
            <Step title="Vamos transformar seus hábitos em um jogo." emoji="🎮">
              <p className="text-muted-foreground">
                Pequenas missões diárias, XP, níveis e sequências para te ajudar a construir uma
                rotina mais leve e consistente.
              </p>
            </Step>
          )}

          {step === 1 && (
            <Step title="O que você gostaria de melhorar?" subtitle="Selecione até 3">
              <div className="grid grid-cols-2 gap-3">
                {FOCUS_OPTIONS.map((o) => {
                  const selected = focus.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleFocus(o.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                        selected ? "border-primary bg-primary/5" : "border-border bg-card"
                      )}
                    >
                      <span className="text-3xl">{o.icon}</span>
                      <span className="text-sm font-semibold">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title="Quantos dias por semana você quer focar?">
              <div className="flex flex-wrap justify-center gap-3">
                {WEEK_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWeekly(n)}
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-xl font-bold transition-all",
                      weekly === n ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 3 && (
            <Step title="Escolha sua meta inicial.">
              <div className="space-y-3">
                {INTENSITY_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setIntensity(o.value)}
                    className={cn(
                      "w-full rounded-2xl border-2 p-4 text-left transition-all",
                      intensity === o.value ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <p className="font-bold">{o.label}</p>
                    <p className="text-sm text-muted-foreground">{o.description}</p>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step title="Tudo pronto." emoji="✨">
              <p className="text-muted-foreground">
                Seu primeiro desafio começa hoje. Complete suas missões, ganhe XP e comece a
                construir sua sequência.
              </p>
            </Step>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
              Voltar
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button className="flex-1" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continuar
            </Button>
          ) : (
            <Button className="flex-1" size="lg" onClick={finish} disabled={saving}>
              {saving ? "Preparando..." : "Começar"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  subtitle,
  emoji,
  children,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-pop-in">
      {emoji && <div className="mb-4 text-5xl">{emoji}</div>}
      <h1 className="text-2xl font-extrabold leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
