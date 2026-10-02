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
