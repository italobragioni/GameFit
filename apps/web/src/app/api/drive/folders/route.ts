import { badRequest, ok, serverError, withUser } from '@/lib/api';
import { createFolder, listFolders } from '@/lib/google';
import { getValidAccessToken } from '@/lib/drive-token';

/** Lista as pastas (criadas pelo app) para o usuário escolher o destino. */
export async function GET() {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  try {
    const token = await getValidAccessToken(ctx.user.id);
    if (!token) return badRequest('Google Drive não conectado.');
    const folders = await listFolders(token, 'root');
    return ok({ folders });
  } catch {
    return serverError('Não foi possível listar as pastas do Drive.');
  }
}

/** Cria uma nova pasta no Drive (ex.: "Vídeos Editados"). */
export async function POST(request: Request) {
  const ctx = await withUser();
  if (ctx instanceof Response) return ctx;
  let name = '';
  try {
    const body = (await request.json()) as { name?: string };
    name = (body.name ?? '').trim();
  } catch {
    return badRequest('Corpo inválido.');
  }
  if (!name) return badRequest('Dê um nome à pasta.');
  try {
    const token = await getValidAccessToken(ctx.user.id);
    if (!token) return badRequest('Google Drive não conectado.');
    const folder = await createFolder(token, name, 'root');
    return ok({ folder });
  } catch {
    return serverError('Não foi possível criar a pasta no Drive.');
  }
}
