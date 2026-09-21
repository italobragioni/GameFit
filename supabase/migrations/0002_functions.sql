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
