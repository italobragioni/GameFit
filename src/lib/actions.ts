"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayUTC } from "@/lib/utils";
import type { MissionCategory } from "@/lib/types/database";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function completeOnboarding(input: {
  focusAreas: MissionCategory[];
  weeklyGoal: number;
  intensity: "leve" | "moderada" | "desafiadora";
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      focus_areas: input.focusAreas,
      weekly_goal: input.weeklyGoal,
      intensity: input.intensity,
      onboarding_completed: true,
    })
    .eq("id", user.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function saveCheckin(input: { mood: number; nutrition: number; movement: number }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: user.id,
      day: todayUTC(),
      mood: input.mood,
      nutrition: input.nutrition,
      movement: input.movement,
    },
    { onConflict: "user_id,day" }
  );
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addWeightEntry(input: { weightKg: number; goalKg?: number | null; note?: string }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("weight_entries").upsert(
    {
      user_id: user.id,
      entry_date: todayUTC(),
      weight_kg: input.weightKg,
      goal_kg: input.goalKg ?? null,
      note: input.note ?? null,
    },
    { onConflict: "user_id,entry_date" }
  );
  if (error) return { success: false, error: error.message };
  revalidatePath("/weight");
  return { success: true };
}

export async function updateProfileName(fullName: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/profile");
  return { success: true };
}

export async function updateNotifications(input: { push: boolean; email: boolean; whatsapp: boolean }) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notification_preferences")
    .update({ push: input.push, email: input.email, whatsapp: input.whatsapp })
    .eq("user_id", user.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/profile");
  return { success: true };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
