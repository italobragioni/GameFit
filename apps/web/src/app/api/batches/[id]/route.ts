import { ok, serverError, withUser } from '@/lib/api';

/** Detalhe do lote + vídeos (usado pelo polling de status em tempo real). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const { data: batch, error } = await supabase
    .from('batches')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();
  if (error) return serverError('Erro ao carregar o lote.');
  if (!batch) return new Response(JSON.stringify({ error: 'Lote não encontrado.' }), { status: 404 });

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('batch_id', params.id)
    .order('position', { ascending: true });

  return ok({ batch, videos: videos ?? [] });
}
