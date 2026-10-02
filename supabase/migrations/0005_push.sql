-- ==========================================================================
-- Notificações push (Web Push / PWA).
--
-- Guarda as inscrições de push do navegador de cada usuário. O worker (service
-- role) lê essas inscrições para avisar "Seu lote terminou" e remove as que
-- ficarem inválidas (expiradas).
-- ==========================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_own" on public.push_subscriptions;
create policy "push_subs_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Marca quando o aviso de conclusão do lote já foi enviado (evita duplicar).
alter table public.batches add column if not exists notified_at timestamptz;
