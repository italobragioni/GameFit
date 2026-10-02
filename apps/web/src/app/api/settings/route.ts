import {
  DEFAULT_FILTER,
  DEFAULT_FIT_MODE,
  DEFAULT_MIRROR,
  DEFAULT_SPEED,
  FILTER_OPTIONS,
  FIT_MODES,
  SPEED_OPTIONS,
} from '@editor/shared';
import { ok, serverError, withUser } from '@/lib/api';

export async function GET() {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;
  const { data } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return ok(data ?? null);
}

interface SettingsBody {
  mirror?: boolean;
  speed?: number;
  filter?: string;
  fitMode?: string;
  driveFolderMode?: string;
  keepOriginalName?: boolean;
  driveFolderId?: string | null;
  driveFolderName?: string | null;
}

export async function PUT(request: Request) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  const { user, supabase } = ctx;

  let body: SettingsBody;
  try {
    body = (await request.json()) as SettingsBody;
  } catch {
    return serverError('Corpo inválido.');
  }

  const speed = SPEED_OPTIONS.includes(body.speed as never) ? body.speed! : DEFAULT_SPEED;
  const filter = FILTER_OPTIONS.includes(body.filter as never) ? body.filter! : DEFAULT_FILTER;
  const fitMode = FIT_MODES.includes(body.fitMode as never) ? body.fitMode! : DEFAULT_FIT_MODE;
  const folderMode = body.driveFolderMode === 'flat' ? 'flat' : 'per_batch';

  const patch: Record<string, unknown> = {
    user_id: user.id,
    mirror: body.mirror ?? DEFAULT_MIRROR,
    speed,
    filter,
    fit_mode: fitMode,
    drive_folder_mode: folderMode,
    keep_original_name: body.keepOriginalName ?? false,
    updated_at: new Date().toISOString(),
  };
  if (body.driveFolderId !== undefined) patch.drive_folder_id = body.driveFolderId;
  if (body.driveFolderName !== undefined) patch.drive_folder_name = body.driveFolderName;

  const { error } = await supabase.from('user_settings').upsert(patch, { onConflict: 'user_id' });
  if (error) return serverError('Não foi possível salvar as configurações.');
  return ok({ saved: true });
}
