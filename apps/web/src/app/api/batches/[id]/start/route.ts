import { badRequest, ok, serverError, withUser } from '@/lib/api';

/** Inicia o processamento do lote (status -> processing). */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;

  // precisa ter Drive conectado e pasta selecionada
  const { data: settings } = await supabase
    .from('user_settings')
    .select('drive_folder_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!settings?.drive_folder_id) {
    return badRequest('Conecte o Google Drive e escolha uma pasta em Configurações antes de iniciar.');
  }

  const { data: batch } = await supabase
    .from('batches')
    .select('id, template_id, total_videos')
    .eq('id', params.id)
    .maybeSingle();
  if (!batch) return badRequest('Lote não encontrado.');
  if (!batch.template_id) return badRequest('O lote não tem template.');
  if (!batch.total_videos) return badRequest('O lote não tem vídeos.');

  const { error } = await supabase
    .from('batches')
    .update({ status: 'processing', started_at: new Date().toISOString(), finished_at: null })
    .eq('id', params.id);
  if (error) return serverError('Não foi possível iniciar o lote.');

  return ok({ started: true });
}
