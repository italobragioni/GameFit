import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from '@editor/shared';
import { badRequest, ok, serverError, withUser } from '@/lib/api';

interface CreateTemplateBody {
  name?: string;
  imageUrl?: string;
  videoX?: number;
  videoY?: number;
  videoWidth?: number;
  videoHeight?: number;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function GET() {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { data } = await ctx.supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false });
  return ok(data ?? []);
}

export async function POST(request: Request) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;

  let body: CreateTemplateBody;
  try {
    body = (await request.json()) as CreateTemplateBody;
  } catch {
    return badRequest('Corpo inválido.');
  }

  const name = (body.name ?? '').trim();
  if (!name) return badRequest('Dê um nome ao template.');
  if (!body.imageUrl) return badRequest('Envie a imagem do template.');

  const x = clampInt(body.videoX, 0, OUTPUT_WIDTH, 0);
  const y = clampInt(body.videoY, 0, OUTPUT_HEIGHT, 0);
  const width = clampInt(body.videoWidth, 2, OUTPUT_WIDTH, OUTPUT_WIDTH);
  const height = clampInt(body.videoHeight, 2, OUTPUT_HEIGHT, OUTPUT_HEIGHT);

  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: user.id,
      name,
      image_url: body.imageUrl,
      video_x: x,
      video_y: y,
      video_width: width,
      video_height: height,
    })
    .select('id')
    .single();

  if (error || !data) return serverError('Não foi possível salvar o template.');
  return ok({ id: data.id });
}
