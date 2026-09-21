"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MOOD_OPTIONS, NUTRITION_OPTIONS, MOVEMENT_OPTIONS } from "@/lib/game/config";
import { saveCheckin } from "@/lib/actions";
import { track } from "@/lib/analytics";

export default function CheckinPage() {
  const router = useRouter();
  const [mood, setMood] = React.useState<number | null>(null);
  const [nutrition, setNutrition] = React.useState<number | null>(null);
  const [movement, setMovement] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  const ready = mood !== null && nutrition !== null && movement !== null;

  async function submit() {
    if (!ready) return;
    setSaving(true);
    const res = await saveCheckin({ mood: mood!, nutrition: nutrition!, movement: movement! });
    if (res.success) {
      await track("checkin_completed", { mood, nutrition, movement });
      router.push("/dashboard");
      router.refresh();
    } else {
      setSaving(false);
      alert(res.error ?? "Não foi possível salvar.");
    }
  }

  return (
    <div className="px-4 pt-6">
      <header className="pb-4">
        <h1 className="text-2xl font-extrabold">Check-in diário</h1>
        <p className="text-sm text-muted-foreground">Leva menos de 1 minuto 💚</p>
      </header>

      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 font-semibold">Como você está se sentindo hoje?</legend>
          <div className="grid grid-cols-5 gap-2">
            {MOOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setMood(o.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-all",
                  mood === o.value ? "border-primary bg-primary/5" : "border-border bg-card"
                )}
              >
                <span className="text-2xl">{o.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{o.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-semibold">Como foi sua alimentação hoje?</legend>
          <div className="grid grid-cols-2 gap-2">
            {NUTRITION_OPTIONS.map((o) => (
              <Option key={o.value} active={nutrition === o.value} onClick={() => setNutrition(o.value)}>
                {o.label}
              </Option>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-semibold">Você se movimentou hoje?</legend>
          <div className="grid grid-cols-3 gap-2">
            {MOVEMENT_OPTIONS.map((o) => (
              <Option key={o.value} active={movement === o.value} onClick={() => setMovement(o.value)}>
                {o.label}
              </Option>
            ))}
          </div>
        </fieldset>
      </div>

      <Button className="mt-8 w-full" size="lg" onClick={submit} disabled={!ready || saving}>
        {saving ? "Salvando..." : "Salvar check-in"}
      </Button>
    </div>
  );
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border-2 p-3 text-sm font-semibold transition-all",
        active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card"
      )}
    >
      {children}
    </button>
  );
}
