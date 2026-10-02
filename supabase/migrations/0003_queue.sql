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
