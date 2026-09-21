import { createClient } from "@/lib/supabase/client";

export type AnalyticsEvent =
  | "signup_completed"
  | "onboarding_completed"
  | "mission_completed"
  | "daily_goal_completed"
  | "streak_increased"
  | "streak_lost"
  | "level_up"
  | "paywall_viewed"
  | "checkout_started"
  | "subscription_created"
  | "subscription_cancelled"
  | "checkin_completed"
  | "challenge_day_completed";

/**
 * Registra um evento de analytics. Hoje grava em analytics_events (Supabase).
 * No futuro, basta encaminhar para PostHog/etc aqui (interface estável).
 */
export async function track(name: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      name,
      properties,
    });
    if (typeof window !== "undefined" && (window as any).posthog) {
      (window as any).posthog.capture(name, properties);
    }
  } catch {
    // Analytics nunca deve quebrar a experiência do usuário.
  }
}
