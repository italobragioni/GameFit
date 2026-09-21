-- ==================================================================
-- Projeto Leve — 0001 schema inicial
-- Tabelas, chaves estrangeiras, índices e constraints.
-- RLS é habilitado em 0003_rls.sql. Funções em 0002_functions.sql.
-- ==================================================================

-- Extensões
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------
do $$ begin
  create type mission_category as enum
    ('hidratacao','alimentacao','movimento','sono','organizacao','mindfulness','outros');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_difficulty as enum ('facil','media','importante','desafio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type mission_recurrence as enum ('daily','weekly','once');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum
    ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid','none');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------
-- profiles  (1:1 com auth.users)
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  is_admin boolean not null default false,
  onboarding_completed boolean not null default false,
  focus_areas text[] not null default '{}',
  weekly_goal smallint not null default 5 check (weekly_goal between 1 and 7),
  intensity text not null default 'moderada' check (intensity in ('leve','moderada','desafiadora')),
  total_xp integer not null default 0 check (total_xp >= 0),
  level smallint not null default 1 check (level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- level_thresholds  (tabela de referência de níveis)
-- ------------------------------------------------------------------
create table if not exists public.level_thresholds (
  level smallint primary key check (level >= 1),
  min_xp integer not null check (min_xp >= 0),
  title text not null
);

-- ------------------------------------------------------------------
-- subscriptions
-- ------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'stripe',
  customer_id text,
  subscription_id text unique,
  price_id text,
  status subscription_status not null default 'none',
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_customer on public.subscriptions(customer_id);

-- ------------------------------------------------------------------
-- missions  (catálogo editável pelo admin)
-- ------------------------------------------------------------------
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category mission_category not null default 'outros',
  xp integer not null default 20 check (xp > 0),
  difficulty mission_difficulty not null default 'media',
  icon text not null default '✅',
  is_premium boolean not null default false,
  recurrence mission_recurrence not null default 'daily',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_missions_active on public.missions(active) where active = true;
create index if not exists idx_missions_category on public.missions(category);

-- ------------------------------------------------------------------
-- user_missions  (conclusões — idempotente por dia)
-- ------------------------------------------------------------------
create table if not exists public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  xp_awarded integer not null default 0,
  day date not null default (now() at time zone 'utc')::date,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, day)
);
create index if not exists idx_user_missions_user_day on public.user_missions(user_id, day);

-- ------------------------------------------------------------------
-- xp_transactions  (ledger imutável de XP)
-- ------------------------------------------------------------------
create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  source text not null,            -- 'mission' | 'challenge' | 'bonus'
  reference_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_xp_tx_user on public.xp_transactions(user_id, created_at desc);

-- ------------------------------------------------------------------
-- streaks
-- ------------------------------------------------------------------
create table if not exists public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- daily_checkins
-- ------------------------------------------------------------------
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  mood smallint check (mood between 1 and 5),
  nutrition smallint check (nutrition between 1 and 4),
  movement smallint check (movement between 0 and 2),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists idx_checkins_user_day on public.daily_checkins(user_id, day desc);

-- ------------------------------------------------------------------
-- achievements  +  user_achievements
-- ------------------------------------------------------------------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text not null,
  icon text not null default '🏅',
  criteria_type text not null,     -- 'first_mission'|'streak'|'xp'|'category_count'
  criteria_value integer not null default 0,
  criteria_category mission_category,
  sort_order integer not null default 0
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);
create index if not exists idx_user_ach_user on public.user_achievements(user_id);

-- ------------------------------------------------------------------
-- challenges  (jornada de 30 dias)
-- ------------------------------------------------------------------
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  total_days smallint not null default 30,
  is_premium boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_days (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  day_number smallint not null check (day_number >= 1),
  title text not null,
  description text not null default '',
  unique (challenge_id, day_number)
);

create table if not exists public.challenge_missions (
  id uuid primary key default gen_random_uuid(),
  challenge_day_id uuid not null references public.challenge_days(id) on delete cascade,
  title text not null,
  description text not null default '',
  icon text not null default '✅',
  xp integer not null default 15 check (xp > 0),
  sort_order integer not null default 0
);

create table if not exists public.user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  current_day smallint not null default 1,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

create table if not exists public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_day_id uuid not null references public.challenge_days(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_day_id)
);
create index if not exists idx_ucp_user on public.user_challenge_progress(user_id);

-- ------------------------------------------------------------------
-- weight_entries  (opcional, privado)
-- ------------------------------------------------------------------
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg < 500),
  goal_kg numeric(5,2) check (goal_kg > 0 and goal_kg < 500),
  entry_date date not null default (now() at time zone 'utc')::date,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, entry_date)
);
create index if not exists idx_weight_user_date on public.weight_entries(user_id, entry_date desc);

-- ------------------------------------------------------------------
-- notification_preferences
-- ------------------------------------------------------------------
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push boolean not null default true,
  email boolean not null default true,
  whatsapp boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- analytics_events  (buffer local antes de PostHog/etc)
-- ------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_analytics_name on public.analytics_events(name, created_at desc);
