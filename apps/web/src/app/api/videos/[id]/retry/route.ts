import { badRequest, ok, serverError, withUser } from '@/lib/api';

/** Recoloca um vídeo que falhou de volta na fila e reativa o lote. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const { data: video } = await supabase
    .from('videos')
    .select('id, batch_id, status')
    .eq('id', params.id)
    .maybeSingle();
  if (!video) return badRequest('Vídeo não encontrado.');
  if (video.status !== 'failed') return badRequest('Só é possível tentar novamente vídeos que falharam.');

  const { error } = await supabase
    .from('videos')
    .update({ status: 'pending', attempts: 0, error_message: null, progress: 0, finished_at: null })
    .eq('id', params.id);
  if (error) return serverError('Não foi possível reativar o vídeo.');

  // garante que o lote volte a 'processing' para o worker pegar o item
  await supabase
    .from('batches')
    .update({ status: 'processing', finished_at: null })
    .eq('id', video.batch_id);

  return ok({ retried: true });
}
