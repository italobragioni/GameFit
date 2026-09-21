-- ==================================================================
-- Projeto Leve — setup completo do banco (rode este arquivo UMA vez)
-- Gerado de: 0001 + 0002 + 0003 + 0004 + seed
-- ==================================================================

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

-- ==================================================================
-- Projeto Leve — 0002 funções, triggers e RPCs
-- Toda a lógica de jogo (XP, nível, streak, conquistas) roda aqui,
-- em funções SECURITY DEFINER, para que o client não possa trapacear.
-- ==================================================================

-- Missões mínimas concluídas para o dia "contar" na sequência.
create or replace function public.daily_goal_count()
returns integer language sql immutable as $$ select 3 $$;

-- ------------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_subs_updated on public.subscriptions;
create trigger trg_subs_updated before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------
-- Novo usuário: cria profile + linhas relacionadas
-- ------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.streaks (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.subscriptions (user_id, status) values (new.id, 'none') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
-- Nível a partir do XP
-- ------------------------------------------------------------------
create or replace function public.calc_level(p_xp integer)
returns smallint language sql stable as $$
  select coalesce(max(level), 1)::smallint
  from public.level_thresholds
  where min_xp <= greatest(p_xp, 0);
$$;

-- ------------------------------------------------------------------
-- Usuário é premium?
-- ------------------------------------------------------------------
create or replace function public.is_premium(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user
      and s.status in ('active','trialing')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- ------------------------------------------------------------------
-- Avalia e concede conquistas. Retorna os codes recém-desbloqueados.
-- ------------------------------------------------------------------
create or replace function public.check_achievements(p_user uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  v_total_missions integer;
  v_total_xp integer;
  v_streak integer;
  rec record;
  v_unlocked text[] := '{}';
  v_meets boolean;
  v_cat_count integer;
begin
  select count(*) into v_total_missions from public.user_missions where user_id = p_user;
  select total_xp into v_total_xp from public.profiles where id = p_user;
  select coalesce(current_streak, 0) into v_streak from public.streaks where user_id = p_user;

  for rec in
    select a.* from public.achievements a
    where not exists (
      select 1 from public.user_achievements ua
      where ua.user_id = p_user and ua.achievement_id = a.id
    )
  loop
    v_meets := false;

    if rec.criteria_type = 'first_mission' then
      v_meets := v_total_missions >= 1;
    elsif rec.criteria_type = 'xp' then
      v_meets := coalesce(v_total_xp, 0) >= rec.criteria_value;
    elsif rec.criteria_type = 'streak' then
      v_meets := v_streak >= rec.criteria_value;
    elsif rec.criteria_type = 'category_count' then
      select count(*) into v_cat_count
      from public.user_missions um
      join public.missions m on m.id = um.mission_id
      where um.user_id = p_user and m.category = rec.criteria_category;
      v_meets := v_cat_count >= rec.criteria_value;
    end if;

    if v_meets then
      insert into public.user_achievements (user_id, achievement_id)
      values (p_user, rec.id)
      on conflict do nothing;
      v_unlocked := array_append(v_unlocked, rec.code);
    end if;
  end loop;

  return v_unlocked;
end $$;

-- ------------------------------------------------------------------
-- Atualiza streak (chamada quando o dia se torna válido)
-- ------------------------------------------------------------------
create or replace function public.bump_streak(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_last date;
  v_current integer;
begin
  select last_active_date, current_streak into v_last, v_current
  from public.streaks where user_id = p_user for update;

  if v_last = v_today then
    return; -- já contabilizado hoje
  elsif v_last = v_today - 1 then
    v_current := coalesce(v_current, 0) + 1;
  else
    v_current := 1;
  end if;

  update public.streaks
  set current_streak = v_current,
      best_streak = greatest(best_streak, v_current),
      last_active_date = v_today,
      updated_at = now()
  where user_id = p_user;
end $$;

-- ------------------------------------------------------------------
-- RPC principal: concluir missão do dia
-- ------------------------------------------------------------------
create or replace function public.complete_mission(p_mission_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_mission public.missions%rowtype;
  v_today date := (now() at time zone 'utc')::date;
  v_old_level smallint;
  v_new_level smallint;
  v_new_xp integer;
  v_done_today integer;
  v_day_complete boolean := false;
  v_unlocked text[] := '{}';
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'reason', 'unauthenticated');
  end if;

  select * into v_mission from public.missions where id = p_mission_id and active = true;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'mission_not_found');
  end if;

  if v_mission.is_premium and not public.is_premium(v_user) then
    return jsonb_build_object('success', false, 'reason', 'premium_required');
  end if;

  -- Idempotência: uma missão só dá XP uma vez por dia
  begin
    insert into public.user_missions (user_id, mission_id, xp_awarded, day)
    values (v_user, p_mission_id, v_mission.xp, v_today);
  exception when unique_violation then
    return jsonb_build_object('success', false, 'reason', 'already_completed');
  end;

  insert into public.xp_transactions (user_id, amount, source, reference_id)
  values (v_user, v_mission.xp, 'mission', p_mission_id);

  select level into v_old_level from public.profiles where id = v_user;

  update public.profiles
  set total_xp = total_xp + v_mission.xp
  where id = v_user
  returning total_xp into v_new_xp;

  v_new_level := public.calc_level(v_new_xp);
  update public.profiles set level = v_new_level where id = v_user;

  -- Dia válido para streak?
  select count(*) into v_done_today
  from public.user_missions where user_id = v_user and day = v_today;

  if v_done_today >= public.daily_goal_count() then
    v_day_complete := true;
    perform public.bump_streak(v_user);
  end if;

  v_unlocked := public.check_achievements(v_user);

  return jsonb_build_object(
    'success', true,
    'xp_gained', v_mission.xp,
    'total_xp', v_new_xp,
    'level', v_new_level,
    'leveled_up', v_new_level > v_old_level,
    'missions_done_today', v_done_today,
    'daily_goal', public.daily_goal_count(),
    'day_complete', v_day_complete,
    'current_streak', (select current_streak from public.streaks where user_id = v_user),
    'unlocked_achievements', to_jsonb(v_unlocked)
  );
end $$;

-- ------------------------------------------------------------------
-- RPC: concluir um dia da jornada de 30 dias
-- ------------------------------------------------------------------
create or replace function public.complete_challenge_day(p_challenge_day_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_day public.challenge_days%rowtype;
  v_challenge public.challenges%rowtype;
  v_xp integer;
  v_old_level smallint;
  v_new_level smallint;
  v_new_xp integer;
  v_uc public.user_challenges%rowtype;
  v_unlocked text[] := '{}';
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'reason', 'unauthenticated');
  end if;

  select * into v_day from public.challenge_days where id = p_challenge_day_id;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'day_not_found');
  end if;

  select * into v_challenge from public.challenges where id = v_day.challenge_id and active = true;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'challenge_inactive');
  end if;

  if v_challenge.is_premium and not public.is_premium(v_user) then
    return jsonb_build_object('success', false, 'reason', 'premium_required');
  end if;

  -- Garante inscrição no desafio
  select * into v_uc from public.user_challenges
  where user_id = v_user and challenge_id = v_challenge.id;
  if not found then
    insert into public.user_challenges (user_id, challenge_id, current_day)
    values (v_user, v_challenge.id, 1)
    returning * into v_uc;
  end if;

  -- Só pode concluir o dia atual (bloqueio sequencial)
  if v_day.day_number > v_uc.current_day then
    return jsonb_build_object('success', false, 'reason', 'day_locked');
  end if;

  -- Idempotência
  begin
    insert into public.user_challenge_progress (user_id, challenge_day_id)
    values (v_user, p_challenge_day_id);
  exception when unique_violation then
    return jsonb_build_object('success', false, 'reason', 'already_completed');
  end;

  select coalesce(sum(xp), 0) into v_xp
  from public.challenge_missions where challenge_day_id = p_challenge_day_id;
  if v_xp = 0 then v_xp := 50; end if;

  insert into public.xp_transactions (user_id, amount, source, reference_id)
  values (v_user, v_xp, 'challenge', p_challenge_day_id);

  select level into v_old_level from public.profiles where id = v_user;
  update public.profiles set total_xp = total_xp + v_xp
    where id = v_user returning total_xp into v_new_xp;
  v_new_level := public.calc_level(v_new_xp);
  update public.profiles set level = v_new_level where id = v_user;

  -- Avança o dia atual
  if v_day.day_number = v_uc.current_day then
    update public.user_challenges
    set current_day = least(current_day + 1, v_challenge.total_days),
        completed_at = case when current_day + 1 > v_challenge.total_days then now() else null end
    where id = v_uc.id;
  end if;

  v_unlocked := public.check_achievements(v_user);

  return jsonb_build_object(
    'success', true,
    'xp_gained', v_xp,
    'total_xp', v_new_xp,
    'level', v_new_level,
    'leveled_up', v_new_level > v_old_level,
    'unlocked_achievements', to_jsonb(v_unlocked)
  );
end $$;

-- Permissões de execução para usuários autenticados
grant execute on function public.complete_mission(uuid) to authenticated;
grant execute on function public.complete_challenge_day(uuid) to authenticated;
grant execute on function public.is_premium(uuid) to authenticated;

-- ==================================================================
-- Projeto Leve — 0003 Row Level Security
-- Um usuário nunca acessa dados privados de outro usuário.
-- ==================================================================

-- Helper: usuário é admin? (SECURITY DEFINER evita recursão de RLS)
create or replace function public.is_admin(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = p_user), false);
$$;
grant execute on function public.is_admin(uuid) to authenticated;

-- Guarda: cliente não pode alterar colunas sensíveis do próprio profile.
-- Só funções SECURITY DEFINER (current_user = owner) podem mexer em XP/nível/admin.
create or replace function public.guard_profile_columns()
returns trigger language plpgsql as $$
begin
  if current_user = 'authenticated' or current_user = 'anon' then
    new.is_admin := old.is_admin;
    new.total_xp := old.total_xp;
    new.level := old.level;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ------------------------------------------------------------------
-- Habilita RLS
-- ------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.level_thresholds         enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.missions                 enable row level security;
alter table public.user_missions            enable row level security;
alter table public.xp_transactions          enable row level security;
alter table public.streaks                  enable row level security;
alter table public.daily_checkins           enable row level security;
alter table public.achievements             enable row level security;
alter table public.user_achievements        enable row level security;
alter table public.challenges               enable row level security;
alter table public.challenge_days           enable row level security;
alter table public.challenge_missions       enable row level security;
alter table public.user_challenges          enable row level security;
alter table public.user_challenge_progress  enable row level security;
alter table public.weight_entries           enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.analytics_events         enable row level security;

-- ------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

-- ------------------------------------------------------------------
-- Catálogos públicos (leitura autenticada; escrita só admin)
-- ------------------------------------------------------------------
drop policy if exists levels_read on public.level_thresholds;
create policy levels_read on public.level_thresholds for select using (true);

drop policy if exists missions_read on public.missions;
create policy missions_read on public.missions for select
  using (active = true or public.is_admin(auth.uid()));
drop policy if exists missions_admin on public.missions;
create policy missions_admin on public.missions for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements for select using (true);
drop policy if exists achievements_admin on public.achievements;
create policy achievements_admin on public.achievements for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges for select using (true);
drop policy if exists challenges_admin on public.challenges;
create policy challenges_admin on public.challenges for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists cdays_read on public.challenge_days;
create policy cdays_read on public.challenge_days for select using (true);
drop policy if exists cdays_admin on public.challenge_days;
create policy cdays_admin on public.challenge_days for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists cmissions_read on public.challenge_missions;
create policy cmissions_read on public.challenge_missions for select using (true);
drop policy if exists cmissions_admin on public.challenge_missions;
create policy cmissions_admin on public.challenge_missions for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------
-- Dados do usuário (somente leitura; escrita via RPC SECURITY DEFINER)
-- ------------------------------------------------------------------
drop policy if exists subs_select on public.subscriptions;
create policy subs_select on public.subscriptions for select
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists um_select on public.user_missions;
create policy um_select on public.user_missions for select using (user_id = auth.uid());

drop policy if exists xp_select on public.xp_transactions;
create policy xp_select on public.xp_transactions for select using (user_id = auth.uid());

drop policy if exists streaks_select on public.streaks;
create policy streaks_select on public.streaks for select using (user_id = auth.uid());

drop policy if exists ua_select on public.user_achievements;
create policy ua_select on public.user_achievements for select using (user_id = auth.uid());

drop policy if exists uc_select on public.user_challenges;
create policy uc_select on public.user_challenges for select using (user_id = auth.uid());

drop policy if exists ucp_select on public.user_challenge_progress;
create policy ucp_select on public.user_challenge_progress for select using (user_id = auth.uid());

-- ------------------------------------------------------------------
-- Dados que o usuário edita diretamente
-- ------------------------------------------------------------------
drop policy if exists checkins_all on public.daily_checkins;
create policy checkins_all on public.daily_checkins for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists weight_all on public.weight_entries;
create policy weight_all on public.weight_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notif_select on public.notification_preferences;
create policy notif_select on public.notification_preferences for select
  using (user_id = auth.uid());
drop policy if exists notif_update on public.notification_preferences;
create policy notif_update on public.notification_preferences for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------------
-- analytics: usuário insere seus eventos; leitura só admin
-- ------------------------------------------------------------------
drop policy if exists analytics_insert on public.analytics_events;
create policy analytics_insert on public.analytics_events for insert
  with check (user_id = auth.uid() or user_id is null);
drop policy if exists analytics_admin on public.analytics_events;
create policy analytics_admin on public.analytics_events for select
  using (public.is_admin(auth.uid()));

-- ==================================================================
-- Projeto Leve — seed
-- Conteúdo inicial: níveis, 50 missões, 10 conquistas, jornada 30 dias.
-- Idempotente: pode rodar mais de uma vez.
-- ==================================================================

-- ------------------------------------------------------------------
-- Níveis (progressão crescente)
-- ------------------------------------------------------------------
insert into public.level_thresholds (level, min_xp, title) values
  (1, 0,     'Primeiros passos'),
  (2, 200,   'Aquecendo'),
  (3, 500,   'Em ritmo'),
  (4, 900,   'Consistente'),
  (5, 1400,  'Determinado'),
  (6, 2000,  'Focado'),
  (7, 2700,  'Dedicado'),
  (8, 3500,  'Imparável'),
  (9, 4400,  'Exemplar'),
  (10, 5400, 'Referência'),
  (11, 6500, 'Veterano'),
  (12, 7700, 'Inspirador'),
  (13, 9000, 'Mestre da rotina'),
  (14, 10400,'Lendário'),
  (15, 11900,'Elite'),
  (16, 13500,'Guardião do hábito'),
  (17, 15200,'Virtuoso'),
  (18, 17000,'Fenômeno'),
  (19, 18900,'Titã'),
  (20, 20900,'Ícone')
on conflict (level) do update set min_xp = excluded.min_xp, title = excluded.title;

-- ------------------------------------------------------------------
-- Missões diárias (catálogo). free = is_premium false.
-- xp: fácil 10, média 20, importante 30, desafio 50+
-- ------------------------------------------------------------------
insert into public.missions (title, description, category, xp, difficulty, icon, is_premium, sort_order) values
  -- Hidratação
  ('Beber sua meta diária de água', 'Mantenha-se hidratado ao longo do dia.', 'hidratacao', 20, 'media', '💧', false, 1),
  ('Começar o dia com um copo de água', 'Um copo de água logo ao acordar.', 'hidratacao', 10, 'facil', '🚰', false, 2),
  ('Trocar um refrigerante por água', 'Escolha água em uma das refeições.', 'hidratacao', 20, 'media', '💦', true, 3),
  ('Levar uma garrafa de água com você', 'Tenha água por perto o dia todo.', 'hidratacao', 10, 'facil', '🍶', true, 4),
  ('Beber água antes de cada refeição', 'Um copo antes das principais refeições.', 'hidratacao', 20, 'media', '🥤', true, 5),
  ('Adicionar fruta na água', 'Água saborizada natural.', 'hidratacao', 10, 'facil', '🍋', true, 6),
  ('Reduzir bebidas açucaradas hoje', 'Menos açúcar líquido no dia.', 'hidratacao', 30, 'importante', '🚫', true, 7),
  ('Hidratar-se após atividade física', 'Reponha líquidos depois de se mover.', 'hidratacao', 10, 'facil', '💧', true, 8),
  -- Alimentação
  ('Fazer uma refeição equilibrada', 'Inclua proteína, carboidrato e vegetais.', 'alimentacao', 30, 'importante', '🥗', false, 10),
  ('Incluir fruta ou vegetal no dia', 'Pelo menos uma porção.', 'alimentacao', 20, 'media', '🍎', false, 11),
  ('Comer devagar e com atenção', 'Preste atenção à comida, sem telas.', 'alimentacao', 20, 'media', '🍽️', true, 12),
  ('Planejar as refeições do dia', 'Pense com antecedência no que comer.', 'alimentacao', 20, 'media', '📝', true, 13),
  ('Incluir uma porção de proteína', 'Proteína em uma refeição.', 'alimentacao', 20, 'media', '🍳', true, 14),
  ('Comer 3 cores diferentes no prato', 'Variedade de vegetais no prato.', 'alimentacao', 20, 'media', '🌈', true, 15),
  ('Preparar um lanche saudável', 'Tenha uma opção prática por perto.', 'alimentacao', 10, 'facil', '🥕', true, 16),
  ('Evitar comer em frente à tela', 'Refeição sem distrações.', 'alimentacao', 10, 'facil', '📵', true, 17),
  ('Incluir grãos integrais', 'Prefira versões integrais hoje.', 'alimentacao', 20, 'media', '🌾', true, 18),
  ('Montar uma lista de compras saudável', 'Planeje suas compras da semana.', 'alimentacao', 30, 'importante', '🛒', true, 19),
  -- Movimento
  ('Fazer 20 minutos de movimento', 'Caminhada, dança ou o que preferir.', 'movimento', 30, 'importante', '🚶', false, 20),
  ('Fazer um alongamento rápido', 'Alongue-se por alguns minutos.', 'movimento', 10, 'facil', '🧘', false, 21),
  ('Subir escadas em vez do elevador', 'Escolha as escadas hoje.', 'movimento', 10, 'facil', '🪜', true, 22),
  ('Caminhar após uma refeição', 'Uma caminhada leve depois de comer.', 'movimento', 20, 'media', '🚶‍♀️', true, 23),
  ('Fazer uma pausa ativa no trabalho', 'Levante e mexa o corpo.', 'movimento', 10, 'facil', '🤸', true, 24),
  ('Completar 6.000 passos', 'Movimente-se ao longo do dia.', 'movimento', 30, 'importante', '👟', true, 25),
  ('Fazer 10 minutos de exercício em casa', 'Um treino curto em casa.', 'movimento', 20, 'media', '🏋️', true, 26),
  ('Dançar sua música favorita', 'Movimento divertido conta também.', 'movimento', 10, 'facil', '💃', true, 27),
  ('Alongar antes de dormir', 'Relaxe o corpo à noite.', 'movimento', 10, 'facil', '🤙', true, 28),
  ('Fazer uma atividade ao ar livre', 'Movimente-se ao ar livre hoje.', 'movimento', 30, 'importante', '🌳', true, 29),
  -- Sono
  ('Preparar-se para dormir em horário adequado', 'Comece a desacelerar no horário.', 'sono', 20, 'media', '😴', false, 30),
  ('Desligar telas 30 min antes de dormir', 'Menos telas antes de deitar.', 'sono', 20, 'media', '🌙', true, 31),
  ('Manter horário de sono consistente', 'Durma e acorde em horários próximos.', 'sono', 30, 'importante', '⏰', true, 32),
  ('Criar um ambiente escuro para dormir', 'Reduza luzes no quarto.', 'sono', 10, 'facil', '🕯️', true, 33),
  ('Evitar cafeína à noite', 'Sem café no fim do dia.', 'sono', 20, 'media', '☕', true, 34),
  ('Fazer um ritual relaxante antes de dormir', 'Leitura, respiração ou banho morno.', 'sono', 20, 'media', '🛁', true, 35),
  ('Anotar 3 coisas boas do dia', 'Feche o dia com gratidão.', 'sono', 10, 'facil', '📓', true, 36),
  -- Organização
  ('Organizar as tarefas do dia', 'Liste o que é prioridade hoje.', 'organizacao', 20, 'media', '✅', false, 40),
  ('Preparar a roupa do dia seguinte', 'Deixe tudo pronto na noite anterior.', 'organizacao', 10, 'facil', '👕', true, 41),
  ('Arrumar um espaço da casa', 'Organize um cantinho hoje.', 'organizacao', 10, 'facil', '🧹', true, 42),
  ('Planejar a semana', 'Dê uma olhada nos próximos dias.', 'organizacao', 30, 'importante', '🗓️', true, 43),
  ('Definir 3 prioridades do dia', 'Escolha o que realmente importa.', 'organizacao', 20, 'media', '🎯', true, 44),
  ('Revisar seus objetivos', 'Relembre onde quer chegar.', 'organizacao', 20, 'media', '🧭', true, 45),
  ('Separar um tempo só para você', 'Reserve um momento no dia.', 'organizacao', 10, 'facil', '⏳', true, 46),
  -- Mindfulness
  ('Fazer 5 minutos de respiração', 'Respire com calma e atenção.', 'mindfulness', 20, 'media', '🌬️', false, 50),
  ('Praticar gratidão', 'Reconheça algo bom de hoje.', 'mindfulness', 10, 'facil', '🙏', true, 51),
  ('Fazer uma pausa consciente', 'Pare e observe como você está.', 'mindfulness', 10, 'facil', '🧘‍♂️', true, 52),
  ('Passar 10 min sem celular', 'Um intervalo sem tela.', 'mindfulness', 20, 'media', '📴', true, 53),
  ('Observar a natureza por alguns minutos', 'Conecte-se com o ambiente.', 'mindfulness', 10, 'facil', '🌿', true, 54),
  ('Anotar como você está se sentindo', 'Registre suas emoções.', 'mindfulness', 20, 'media', '💭', true, 55),
  -- Outros
  ('Fazer o check-in diário', 'Registre como foi seu dia.', 'outros', 10, 'facil', '📊', false, 60),
  ('Compartilhar seu progresso com alguém', 'Conte a alguém sobre sua jornada.', 'outros', 20, 'media', '🤝', true, 61)
on conflict do nothing;

-- ------------------------------------------------------------------
-- Conquistas
-- ------------------------------------------------------------------
insert into public.achievements (code, title, description, icon, criteria_type, criteria_value, criteria_category, sort_order) values
  ('first_step',   'Primeiro passo',      'Conclua sua primeira missão.',                 '🌱', 'first_mission', 1,  null, 1),
  ('streak_7',     '7 dias',              'Complete uma semana de consistência.',         '🔥', 'streak', 7,          null, 2),
  ('streak_30',    '30 dias',             'Complete 30 dias de sequência.',               '🔥', 'streak', 30,         null, 3),
  ('hydrated',     'Hidratado',           'Complete 30 missões de hidratação.',           '💧', 'category_count', 30, 'hidratacao', 4),
  ('balanced',     'Rotina equilibrada',  'Complete 50 missões de alimentação.',          '🥗', 'category_count', 50, 'alimentacao', 5),
  ('in_motion',    'Em movimento',        'Complete 50 missões de atividade.',            '🚶', 'category_count', 50, 'movimento', 6),
  ('rested',       'Bem descansado',      'Complete 30 missões de sono.',                 '😴', 'category_count', 30, 'sono', 7),
  ('mindful',      'Mente tranquila',     'Complete 20 missões de mindfulness.',          '🧘', 'category_count', 20, 'mindfulness', 8),
  ('xp_1000',      '1.000 XP',            'Alcance mil pontos de experiência.',           '⭐', 'xp', 1000,           null, 9),
  ('xp_10000',     '10.000 XP',           'Alcance dez mil pontos de experiência.',       '🌟', 'xp', 10000,          null, 10)
on conflict (code) do nothing;

-- ------------------------------------------------------------------
-- Jornada de 30 dias
-- ------------------------------------------------------------------
insert into public.challenges (slug, title, description, total_days, is_premium)
values ('jornada-30-dias', 'Jornada de 30 Dias', 'Pequenos passos diários para construir uma rotina mais leve e consistente.', 30, true)
on conflict (slug) do nothing;

do $$
declare
  v_challenge uuid;
  v_day uuid;
  i int;
  themes text[] := array[
    'Comece bem: hidratação',
    'Movimento leve',
    'Prato colorido',
    'Sono com qualidade',
    'Organize seu dia',
    'Respire fundo',
    'Semana da consistência',
    'Água em foco',
    'Caminhe mais',
    'Frutas e vegetais',
    'Desacelere à noite',
    'Planeje a semana',
    'Pausa consciente',
    'Refeição sem telas',
    'Passos extras',
    'Proteína no prato',
    'Ritual do sono',
    'Gratidão diária',
    'Menos açúcar líquido',
    'Alongamento do corpo',
    'Cozinhe em casa',
    'Ambiente tranquilo',
    'Momento para você',
    'Lanche inteligente',
    'Atividade ao ar livre',
    'Rotina matinal',
    'Foco nas prioridades',
    'Corpo em movimento',
    'Reflexão da jornada',
    'Celebre sua evolução'
  ];
  descs text[] := array[
    'Beba água ao acordar e mantenha uma garrafa por perto.',
    'Faça 10 minutos de movimento no seu ritmo.',
    'Inclua ao menos 3 cores de vegetais nas refeições.',
    'Prepare o ambiente e desacelere antes de dormir.',
    'Liste as 3 tarefas mais importantes do dia.',
    'Reserve 5 minutos para respirar com atenção.',
    'Mantenha os hábitos da semana com leveza.',
    'Atinja sua meta de água hoje.',
    'Some mais passos do que ontem.',
    'Coma frutas e vegetais em duas refeições.',
    'Reduza as telas 30 minutos antes de deitar.',
    'Organize os próximos dias com calma.',
    'Faça uma pausa consciente no meio do dia.',
    'Faça uma refeição sem distrações.',
    'Caminhe um pouco mais durante o dia.',
    'Inclua proteína em duas refeições.',
    'Crie um ritual relaxante para o sono.',
    'Anote três coisas boas do seu dia.',
    'Troque bebidas açucaradas por água.',
    'Alongue o corpo pela manhã e à noite.',
    'Prepare uma refeição simples em casa.',
    'Deixe seu espaço mais tranquilo e organizado.',
    'Reserve um tempo só para você hoje.',
    'Tenha um lanche saudável à mão.',
    'Faça uma atividade ao ar livre.',
    'Crie uma pequena rotina para começar o dia.',
    'Concentre-se no que realmente importa hoje.',
    'Movimente o corpo por 20 minutos.',
    'Relembre o quanto você já avançou.',
    'Reconheça sua evolução e planeje continuar.'
  ];
begin
  select id into v_challenge from public.challenges where slug = 'jornada-30-dias';

  for i in 1..30 loop
    insert into public.challenge_days (challenge_id, day_number, title, description)
    values (v_challenge, i, 'Dia ' || i || ' — ' || themes[i], descs[i])
    on conflict (challenge_id, day_number) do nothing
    returning id into v_day;

    if v_day is null then
      select id into v_day from public.challenge_days
      where challenge_id = v_challenge and day_number = i;
    end if;

    -- 3 mini-missões por dia (só insere se ainda não houver)
    if not exists (select 1 from public.challenge_missions where challenge_day_id = v_day) then
      insert into public.challenge_missions (challenge_day_id, title, description, icon, xp, sort_order) values
        (v_day, 'Objetivo principal do dia', descs[i], '🎯', 30, 1),
        (v_day, 'Beba água e se hidrate', 'Mantenha-se hidratado hoje.', '💧', 10, 2),
        (v_day, 'Check-in de como você está', 'Registre como se sentiu hoje.', '📊', 10, 3);
    end if;
  end loop;
end $$;

-- ==================================================================
-- Projeto Leve — 0004 missões com foco em emagrecimento saudável
-- Idempotente (não duplica se rodar de novo). Sem metas extremas,
-- sem prescrição de dieta — apenas hábitos seguros.
-- ==================================================================

insert into public.missions (title, description, category, xp, difficulty, icon, is_premium, sort_order)
select v.title, v.description, v.category::mission_category, v.xp, v.difficulty::mission_difficulty, v.icon, v.is_premium, v.sort_order
from (values
  ('Registrar seu peso hoje', 'Acompanhe sua evolução no seu ritmo.', 'outros', 20, 'media', '⚖️', false, 100),
  ('Comer devagar e mastigar bem', 'Comer com calma ajuda a sentir saciedade.', 'alimentacao', 20, 'media', '🍽️', false, 101),
  ('Incluir vegetais em 2 refeições', 'Mais volume e nutrientes com menos calorias.', 'alimentacao', 30, 'importante', '🥦', true, 102),
  ('Fazer refeições em horários definidos', 'Uma rotina que ajuda a evitar exageros.', 'alimentacao', 20, 'media', '⏰', true, 103),
  ('Trocar bebida açucarada por água', 'Menos açúcar líquido no seu dia.', 'hidratacao', 20, 'media', '🥤', false, 104),
  ('Comer uma fruta no lugar de um doce', 'Uma troca simples e gostosa.', 'alimentacao', 20, 'media', '🍎', true, 105),
  ('Caminhar 30 minutos', 'Movimento constante faz diferença.', 'movimento', 30, 'importante', '🚶', false, 106),
  ('Fazer um treino de 15 minutos', 'Curto, mas conta muito.', 'movimento', 30, 'importante', '🏋️', true, 107),
  ('Montar um prato equilibrado', 'Proteína, vegetais e um carboidrato de qualidade.', 'alimentacao', 30, 'importante', '🍱', true, 108),
  ('Dormir de 7 a 8 horas', 'Sono de qualidade apoia o emagrecimento.', 'sono', 20, 'media', '😴', true, 109),
  ('Planejar as refeições do dia seguinte', 'Planejar ajuda a fazer boas escolhas.', 'organizacao', 20, 'media', '📝', true, 110),
  ('Fazer uma pausa antes de repetir o prato', 'Dê tempo ao corpo de sinalizar saciedade.', 'mindfulness', 20, 'media', '⏸️', true, 111)
) as v(title, description, category, xp, difficulty, icon, is_premium, sort_order)
where not exists (select 1 from public.missions m where m.title = v.title);
