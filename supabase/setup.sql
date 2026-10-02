-- ==========================================================================
-- Editor de Vídeos — setup COMPLETO do banco (cole tudo no SQL Editor do Supabase).
-- Gerado a partir de migrations/0001..0005. Executar UMA vez.
-- ==========================================================================

-- >>> migrations/0001_init.sql
-- ==========================================================================
-- Editor de Vídeos — esquema inicial
-- ==========================================================================
-- Executar no SQL Editor do Supabase (ou via CLI). As tabelas referenciam
-- auth.users (gerenciada pelo Supabase Auth).
-- ==========================================================================

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- templates
-- --------------------------------------------------------------------------
create table if not exists public.templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null,
  image_url     text not null,
  video_x       integer not null default 0,
  video_y       integer not null default 0,
  video_width   integer not null default 1080,
  video_height  integer not null default 1920,
  created_at    timestamptz not null default now()
);
create index if not exists templates_user_idx on public.templates (user_id);

-- --------------------------------------------------------------------------
-- batches (lotes)
-- --------------------------------------------------------------------------
create table if not exists public.batches (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  template_id        uuid references public.templates (id) on delete set null,
  status             text not null default 'pending'
                       check (status in ('pending','processing','completed','completed_with_errors','failed')),
  total_videos       integer not null default 0,
  completed_videos   integer not null default 0,
  failed_videos      integer not null default 0,
  -- configurações de edição congeladas ao iniciar o lote
  mirror             boolean not null default true,
  speed              numeric(4,2) not null default 1.10,
  filter             text not null default 'filtro1',
  fit_mode           text not null default 'fill' check (fit_mode in ('fill','contain')),
  drive_folder_mode  text not null default 'per_batch' check (drive_folder_mode in ('flat','per_batch')),
  keep_original_name boolean not null default false,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  finished_at        timestamptz
);
create index if not exists batches_user_idx on public.batches (user_id, created_at desc);
create index if not exists batches_status_idx on public.batches (status);

-- --------------------------------------------------------------------------
-- videos (itens da fila)
-- --------------------------------------------------------------------------
create table if not exists public.videos (
  id                uuid primary key default gen_random_uuid(),
  batch_id          uuid not null references public.batches (id) on delete cascade,
  position          integer not null,
  original_url      text,
  storage_path      text,
  original_filename text,
  status            text not null default 'pending'
                      check (status in ('pending','downloading','processing','uploading','completed','failed')),
  progress          integer not null default 0,
  attempts          integer not null default 0,
  drive_file_id     text,
  error_message     text,
  locked_by         text,
  locked_at         timestamptz,
  created_at        timestamptz not null default now(),
  finished_at       timestamptz,
  constraint videos_has_source check (original_url is not null or storage_path is not null)
);
create index if not exists videos_batch_idx on public.videos (batch_id, position);
-- índice usado pela fila: próximos itens pendentes, mais antigos primeiro
create index if not exists videos_queue_idx on public.videos (status, created_at) where status = 'pending';

-- --------------------------------------------------------------------------
-- user_settings (configurações padrão por usuário)
-- --------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  mirror             boolean not null default true,
  speed              numeric(4,2) not null default 1.10,
  filter             text not null default 'filtro1',
  fit_mode           text not null default 'fill' check (fit_mode in ('fill','contain')),
  drive_folder_id    text,
  drive_folder_name  text,
  drive_folder_mode  text not null default 'per_batch' check (drive_folder_mode in ('flat','per_batch')),
  keep_original_name boolean not null default false,
  updated_at         timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- drive_connections (tokens OAuth do Google Drive, criptografados)
-- --------------------------------------------------------------------------
create table if not exists public.drive_connections (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  access_token_enc  text not null,
  refresh_token_enc text not null,
  expiry            bigint not null default 0,
  email             text,
  updated_at        timestamptz not null default now()
);

-- >>> migrations/0002_rls.sql
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

-- >>> migrations/0003_queue.sql
-- ==========================================================================
-- Fila sequencial baseada em Postgres (sem Redis).
--
-- O worker chama claim_next_video() para pegar UM item por vez.
-- FOR UPDATE SKIP LOCKED garante que dois workers nunca peguem o mesmo item
-- (mesmo que, no MVP, rode apenas 1 worker).
-- ==========================================================================

-- Recalcula contadores e status terminal do lote sempre que um vídeo muda.
create or replace function public.recalc_batch() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_total int;
  v_completed int;
  v_failed int;
  v_started timestamptz;
begin
  v_batch_id := coalesce(new.batch_id, old.batch_id);

  select count(*),
         count(*) filter (where status = 'completed'),
         count(*) filter (where status = 'failed')
    into v_total, v_completed, v_failed
    from public.videos
   where batch_id = v_batch_id;

  select started_at into v_started from public.batches where id = v_batch_id;

  update public.batches b set
    total_videos = v_total,
    completed_videos = v_completed,
    failed_videos = v_failed,
    status = case
      when v_total > 0 and (v_completed + v_failed) = v_total then
        case
          when v_failed = 0 then 'completed'
          when v_completed = 0 then 'failed'
          else 'completed_with_errors'
        end
      when v_started is not null then 'processing'
      else b.status
    end,
    finished_at = case
      when v_total > 0 and (v_completed + v_failed) = v_total then now()
      else b.finished_at
    end
  where b.id = v_batch_id;

  return null;
end;
$$;

drop trigger if exists videos_recalc_batch on public.videos;
create trigger videos_recalc_batch
  after insert or update or delete on public.videos
  for each row execute function public.recalc_batch();

-- --------------------------------------------------------------------------
-- Pega o próximo vídeo a processar e o marca como 'downloading'.
-- Regras:
--   * somente lotes com status 'processing';
--   * dentro de um lote, respeita a ordem de "position" (sequencial): só
--     libera um item se nenhum item anterior do mesmo lote ainda estiver
--     em andamento (pending/downloading/processing/uploading);
--   * lotes mais antigos primeiro.
-- --------------------------------------------------------------------------
create or replace function public.claim_next_video(p_worker text)
returns public.videos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.videos;
begin
  select v.* into v_row
  from public.videos v
  join public.batches b on b.id = v.batch_id
  where v.status = 'pending'
    and b.status = 'processing'
    and not exists (
      select 1 from public.videos prev
      where prev.batch_id = v.batch_id
        and prev.position < v.position
        and prev.status in ('pending','downloading','processing','uploading')
    )
  order by b.started_at asc nulls last, b.created_at asc, v.position asc
  for update of v skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.videos
     set status = 'downloading',
         locked_by = p_worker,
         locked_at = now(),
         error_message = null
   where id = v_row.id
   returning * into v_row;

  return v_row;
end;
$$;

-- --------------------------------------------------------------------------
-- Libera itens "presos" (worker caiu no meio). Volta para 'pending' os que
-- estão travados há mais de p_minutes minutos.
-- --------------------------------------------------------------------------
create or replace function public.reclaim_stale_videos(p_minutes int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.videos
     set status = 'pending', locked_by = null, locked_at = null
   where status in ('downloading','processing','uploading')
     and locked_at < now() - make_interval(mins => p_minutes);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- >>> migrations/0004_storage.sql
-- ==========================================================================
-- Storage: bucket privado "uploads" para arquivos temporários enviados do
-- celular. Os arquivos ficam em pastas por usuário: <user_id>/<batch_id>/<arquivo>.
-- O worker (service_role) baixa e, após confirmar o upload no Drive, apaga.
-- ==========================================================================

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

-- Usuário só mexe na própria pasta (prefixo = seu auth.uid()).
drop policy if exists "uploads_insert_own" on storage.objects;
create policy "uploads_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads_select_own" on storage.objects;
create policy "uploads_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads_delete_own" on storage.objects;
create policy "uploads_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ==========================================================================
-- Bucket público "templates" para as imagens de template (PNG/JPG).
-- São imagens de moldura, não conteúdo sensível; ficam públicas para
-- facilitar a pré-visualização. Caminho: <user_id>/<arquivo>.
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('templates', 'templates', true)
on conflict (id) do nothing;

drop policy if exists "templates_insert_own" on storage.objects;
create policy "templates_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "templates_update_own" on storage.objects;
create policy "templates_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "templates_delete_own" on storage.objects;
create policy "templates_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'templates' and (storage.foldername(name))[1] = auth.uid()::text);

-- leitura pública das imagens de template
drop policy if exists "templates_public_read" on storage.objects;
create policy "templates_public_read" on storage.objects
  for select using (bucket_id = 'templates');

-- >>> migrations/0005_push.sql
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

