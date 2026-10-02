import {
  DEFAULT_FILTER,
  DEFAULT_FIT_MODE,
  DEFAULT_MIRROR,
  DEFAULT_SPEED,
  validateBatchItems,
  type BatchItemInput,
} from '@editor/shared';
import { badRequest, ok, serverError, withUser } from '@/lib/api';

interface CreateBatchBody {
  name?: string;
  templateId?: string;
  items?: BatchItemInput[];
  mirror?: boolean;
  speed?: number;
  filter?: string;
  fitMode?: string;
  driveFolderMode?: string;
  keepOriginalName?: boolean;
}

export async function POST(request: Request) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;

  let body: CreateBatchBody;
  try {
    body = (await request.json()) as CreateBatchBody;
  } catch {
    return badRequest('Corpo inválido.');
  }

  const name = (body.name ?? '').trim();
  if (!name) return badRequest('Dê um nome ao lote.');
  if (!body.templateId) return badRequest('Escolha um template.');

  const items = body.items ?? [];
  const validation = validateBatchItems(items);
  if (!validation.ok) return badRequest(validation.error!);

  // cria o lote (pending)
  const { data: batch, error: batchErr } = await supabase
    .from('batches')
    .insert({
      user_id: user.id,
      name,
      template_id: body.templateId,
      status: 'pending',
      total_videos: items.length,
      mirror: body.mirror ?? DEFAULT_MIRROR,
      speed: body.speed ?? DEFAULT_SPEED,
      filter: body.filter ?? DEFAULT_FILTER,
      fit_mode: body.fitMode ?? DEFAULT_FIT_MODE,
      drive_folder_mode: body.driveFolderMode ?? 'per_batch',
      keep_original_name: body.keepOriginalName ?? false,
    })
    .select('id')
    .single();

  if (batchErr || !batch) return serverError('Não foi possível criar o lote.');

  // cria os vídeos na ordem recebida
  const rows = items.map((item, i) => ({
    batch_id: batch.id,
    position: i + 1,
    original_url: item.url?.trim() || null,
    storage_path: item.storagePath?.trim() || null,
    original_filename: item.originalFilename ?? null,
    status: 'pending' as const,
  }));

  const { error: videosErr } = await supabase.from('videos').insert(rows);
  if (videosErr) {
    await supabase.from('batches').delete().eq('id', batch.id);
    return serverError('Não foi possível adicionar os vídeos.');
  }

  return ok({ id: batch.id });
}
