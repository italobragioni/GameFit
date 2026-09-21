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
