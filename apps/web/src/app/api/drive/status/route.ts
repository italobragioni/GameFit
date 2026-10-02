import { ok, withUser } from '@/lib/api';

/** Diz se o usuário já conectou o Google Drive (e com qual e-mail). */
export async function GET() {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;
  const { data } = await supabase
    .from('drive_connections')
    .select('email')
    .eq('user_id', user.id)
    .maybeSingle();
  return ok({ connected: !!data, email: data?.email ?? null });
}
