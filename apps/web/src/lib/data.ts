import { redirect } from 'next/navigation';
import type { Batch, Template, UserSettings } from '@editor/shared';
import { createClient } from '@/lib/supabase/server';

/** Garante que há um usuário logado; senão redireciona para /login. */
export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { user, supabase };
}

export async function getTemplates(): Promise<Template[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as Template[]) ?? [];
}

export async function getBatches(): Promise<Batch[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as Batch[]) ?? [];
}

export async function getSettings(): Promise<UserSettings | null> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return (data as UserSettings) ?? null;
}

export async function isDriveConnected(): Promise<{ connected: boolean; email: string | null }> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from('drive_connections')
    .select('email')
    .eq('user_id', user.id)
    .maybeSingle();
  return { connected: !!data, email: data?.email ?? null };
}
