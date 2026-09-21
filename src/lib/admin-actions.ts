"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MissionCategory, MissionDifficulty } from "@/lib/types/database";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return { ok: false as const, error: "Acesso negado." };
  return { ok: true as const, supabase };
}

export interface MissionInput {
  id?: string;
  title: string;
  description: string;
  category: MissionCategory;
  xp: number;
  difficulty: MissionDifficulty;
  icon: string;
  is_premium: boolean;
  active: boolean;
}

export async function saveMission(input: MissionInput) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const row = {
    title: input.title,
    description: input.description,
    category: input.category,
    xp: input.xp,
    difficulty: input.difficulty,
    icon: input.icon,
    is_premium: input.is_premium,
    active: input.active,
    recurrence: "daily" as const,
  };

  const { error } = input.id
    ? await guard.supabase.from("missions").update(row).eq("id", input.id)
    : await guard.supabase.from("missions").insert(row);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/missions");
  return { success: true };
}

export async function toggleMissionActive(id: string, active: boolean) {
  const guard = await requireAdmin();
  if (!guard.ok) return { success: false, error: guard.error };
  const { error } = await guard.supabase.from("missions").update({ active }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/missions");
  return { success: true };
}
