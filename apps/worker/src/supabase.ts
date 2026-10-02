import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Batch, DriveConnection, Template, VideoItem } from '@editor/shared';
import { config } from './config.js';

/** Cliente com service_role: ignora RLS. SOMENTE no servidor/worker. */
export const supabase: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function claimNextVideo(workerId: string): Promise<VideoItem | null> {
  const { data, error } = await supabase.rpc('claim_next_video', { p_worker: workerId });
  if (error) throw error;
  return (data as VideoItem) ?? null;
}

export async function reclaimStale(minutes: number): Promise<number> {
  const { data, error } = await supabase.rpc('reclaim_stale_videos', { p_minutes: minutes });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function getBatch(id: string): Promise<Batch> {
  const { data, error } = await supabase.from('batches').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Batch;
}

export async function getTemplate(id: string): Promise<Template | null> {
  const { data, error } = await supabase.from('templates').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Template) ?? null;
}

export async function getDriveConnection(userId: string): Promise<DriveConnection | null> {
  const { data, error } = await supabase
    .from('drive_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as DriveConnection) ?? null;
}

export async function updateVideo(id: string, patch: Partial<VideoItem>): Promise<void> {
  const { error } = await supabase.from('videos').update(patch).eq('id', id);
  if (error) throw error;
}

/** Baixa um arquivo do Storage para um Buffer. */
export async function downloadFromStorage(bucket: string, path: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeFromStorage(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
