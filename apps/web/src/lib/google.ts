/**
 * Integração com o Google Drive via OAuth 2.0 usando apenas `fetch`
 * (sem a biblioteca googleapis, que é pesada para funções serverless).
 *
 * Escopo usado: `drive.file` — o app só enxerga/acessa os arquivos e pastas
 * que ele mesmo cria. É o escopo de MENOR privilégio que atende ao objetivo
 * (criar pastas e enviar os vídeos). Por isso, a seleção de pasta lista as
 * pastas criadas pelo app; novas pastas podem ser criadas aqui mesmo.
 */

const OAUTH_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    redirect_uri: env('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    scope: OAUTH_SCOPES,
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: env('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao trocar o código OAuth (HTTP ${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao renovar o token do Drive (HTTP ${res.status}).`);
  }
  return (await res.json()) as TokenResponse;
}

export async function getUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export async function listFolders(accessToken: string, parentId = 'root'): Promise<DriveFolder[]> {
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
    `'${parentId}' in parents`,
  ].join(' and ');
  const params = new URLSearchParams({
    q,
    fields: 'files(id,name)',
    orderBy: 'name',
    pageSize: '100',
    spaces: 'drive',
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao listar pastas (HTTP ${res.status})`);
  const data = (await res.json()) as { files?: DriveFolder[] };
  return data.files ?? [];
}

export async function createFolder(
  accessToken: string,
  name: string,
  parentId = 'root',
): Promise<DriveFolder> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!res.ok) throw new Error(`Falha ao criar pasta (HTTP ${res.status})`);
  return (await res.json()) as DriveFolder;
}
