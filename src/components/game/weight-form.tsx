"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addWeightEntry } from "@/lib/actions";

export function WeightForm({ lastGoal }: { lastGoal: number | null }) {
  const router = useRouter();
  const [weight, setWeight] = React.useState("");
  const [goal, setGoal] = React.useState(lastGoal ? String(lastGoal) : "");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(weight.replace(",", "."));
    if (!w || w <= 0) return;
    setSaving(true);
    const res = await addWeightEntry({
      weightKg: w,
      goalKg: goal ? parseFloat(goal.replace(",", ".")) : null,
    });
    setSaving(false);
    if (res.success) {
      setWeight("");
      setMsg("Registro salvo 💚");
      router.refresh();
      setTimeout(() => setMsg(null), 2500);
    } else {
      setMsg(res.error ?? "Erro ao salvar");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="w">Peso atual (kg)</Label>
          <Input id="w" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70,0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="g">Meta (opcional)</Label>
          <Input id="g" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="65,0" />
        </div>
      </div>
      <Button type="submit" className="mt-3 w-full" disabled={saving || !weight}>
        {saving ? "Salvando..." : "Registrar"}
      </Button>
      {msg && <p className="mt-2 text-center text-sm text-success">{msg}</p>}
    </form>
  );
}
