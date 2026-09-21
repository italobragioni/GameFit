// Tipos do banco (mantidos à mão para o MVP).
// Regenere com: supabase gen types typescript --project-id <id> > src/lib/types/database.ts

export type MissionCategory =
  | "hidratacao"
  | "alimentacao"
  | "movimento"
  | "sono"
  | "organizacao"
  | "mindfulness"
  | "outros";

export type MissionDifficulty = "facil" | "media" | "importante" | "desafio";
export type MissionRecurrence = "daily" | "weekly" | "once";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "none";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  onboarding_completed: boolean;
  focus_areas: string[];
  weekly_goal: number;
  intensity: "leve" | "moderada" | "desafiadora";
  total_xp: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface LevelThreshold {
  level: number;
  min_xp: number;
  title: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  provider: string;
  customer_id: string | null;
  subscription_id: string | null;
  price_id: string | null;
  status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  xp: number;
  difficulty: MissionDifficulty;
  icon: string;
  is_premium: boolean;
  recurrence: MissionRecurrence;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  xp_awarded: number;
  day: string;
  created_at: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  day: string;
  mood: number | null;
  nutrition: number | null;
  movement: number | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  criteria_type: "first_mission" | "streak" | "xp" | "category_count";
  criteria_value: number;
  criteria_category: MissionCategory | null;
  sort_order: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  total_days: number;
  is_premium: boolean;
  active: boolean;
  created_at: string;
}

export interface ChallengeDay {
  id: string;
  challenge_id: string;
  day_number: number;
  title: string;
  description: string;
}

export interface ChallengeMission {
  id: string;
  challenge_day_id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  sort_order: number;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  current_day: number;
  started_at: string;
  completed_at: string | null;
}

export interface UserChallengeProgress {
  id: string;
  user_id: string;
  challenge_day_id: string;
  completed_at: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  weight_kg: number;
  goal_kg: number | null;
  entry_date: string;
  note: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  push: boolean;
  email: boolean;
  whatsapp: boolean;
  updated_at: string;
}

/** Retorno das RPCs complete_mission / complete_challenge_day. */
export interface CompleteMissionResult {
  success: boolean;
  reason?: string;
  xp_gained?: number;
  total_xp?: number;
  level?: number;
  leveled_up?: boolean;
  missions_done_today?: number;
  daily_goal?: number;
  day_complete?: boolean;
  current_streak?: number;
  unlocked_achievements?: string[];
}
