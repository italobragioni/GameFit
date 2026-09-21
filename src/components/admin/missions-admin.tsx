"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { saveMission, toggleMissionActive, type MissionInput } from "@/lib/admin-actions";
import { CATEGORY_META } from "@/lib/game/config";
import type { Mission, MissionCategory, MissionDifficulty } from "@/lib/types/database";

const CATEGORIES = Object.keys(CATEGORY_META) as MissionCategory[];
const DIFFICULTIES: MissionDifficulty[] = ["facil", "media", "importante", "desafio"];
const XP_BY_DIFFICULTY: Record<MissionDifficulty, number> = { facil: 10, media: 20, importante: 30, desafio: 50 };

const EMPTY: MissionInput = {
  title: "",
  description: "",
  category: "hidratacao",
  xp: 20,
  difficulty: "media",
  icon: "✅",
  is_premium: false,
  active: true,
};

export function MissionsAdmin({ initial }: { initial: Mission[] }) {
  const [missions, setMissions] = React.useState(initial);
  const [form, setForm] = React.useState<MissionInput>(EMPTY);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function editMission(m: Mission) {
    setEditingId(m.id);
    setForm({
      id: m.id,
      title: m.title,
      description: m.description,
      category: m.category,
      xp: m.xp,
      difficulty: m.difficulty,
      icon: m.icon,
      is_premium: m.is_premium,
      active: m.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(EMPTY);
    setEditingId(null);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveMission(form);
    setSaving(false);
    if (!res.success) {
      setError(res.error ?? "Erro ao salvar.");
      return;
    }
    // Recarrega para refletir alterações
    window.location.reload();
  }

  async function onToggle(m: Mission) {
    setMissions((ms) => ms.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)));
    await toggleMissionActive(m.id, !m.active);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Formulário */}
      <Card className="h-fit lg:sticky lg:top-20">
        <CardContent className="pt-5">
          <h2 className="font-bold">{editingId ? "Editar missão" : "Nova missão"}</h2>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as MissionCategory })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Dificuldade</Label>
                <select
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.difficulty}
                  onChange={(e) => {
                    const d = e.target.value as MissionDifficulty;
                    setForm({ ...form, difficulty: d, xp: XP_BY_DIFFICULTY[d] });
                  }}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>XP</Label>
                <Input type="number" min={1} value={form.xp} onChange={(e) => setForm({ ...form, xp: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Ícone (emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_premium} onChange={(e) => setForm({ ...form, is_premium: e.target.checked })} />
                Premium
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Ativa
              </label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{missions.length} missões</p>
        {missions.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
            <span className="text-2xl">{m.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{m.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="muted">{CATEGORY_META[m.category].label}</Badge>
                <Badge>+{m.xp} XP</Badge>
                {m.is_premium && <Badge variant="premium">Premium</Badge>}
                {!m.active && <Badge variant="outline">Inativa</Badge>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => editMission(m)}>Editar</Button>
              <Button size="sm" variant="ghost" onClick={() => onToggle(m)}>
                {m.active ? "Desativar" : "Ativar"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
