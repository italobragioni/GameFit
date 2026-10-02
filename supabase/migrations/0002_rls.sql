-- ==========================================================================
-- Row Level Security — cada usuário só enxerga os próprios dados.
-- O worker usa a chave service_role, que ignora RLS (por isso não há policy
-- para ele). Nunca exponha a service_role no frontend.
-- ==========================================================================

alter table public.templates         enable row level security;
alter table public.batches           enable row level security;
alter table public.videos            enable row level security;
alter table public.user_settings     enable row level security;
alter table public.drive_connections enable row level security;

-- ---- templates -----------------------------------------------------------
drop policy if exists "templates_own" on public.templates;
create policy "templates_own" on public.templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- batches --------------------------------------------------------------
drop policy if exists "batches_own" on public.batches;
create policy "batches_own" on public.batches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- videos (via lote do dono) -------------------------------------------
drop policy if exists "videos_own" on public.videos;
create policy "videos_own" on public.videos
  for all using (
    exists (select 1 from public.batches b where b.id = videos.batch_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.batches b where b.id = videos.batch_id and b.user_id = auth.uid())
  );

-- ---- user_settings --------------------------------------------------------
drop policy if exists "settings_own" on public.user_settings;
create policy "settings_own" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- drive_connections ----------------------------------------------------
-- O usuário pode ver se está conectado, mas os tokens são escritos/lidos
-- apenas pelo backend (service_role). Expomos SELECT limitado via view se
-- necessário; por padrão, nenhuma policy de leitura ampla dos tokens.
drop policy if exists "drive_conn_read_own" on public.drive_connections;
create policy "drive_conn_read_own" on public.drive_connections
  for select using (auth.uid() = user_id);
