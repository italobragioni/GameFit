import { createReadStream } from 'node:fs';
import { google, type drive_v3 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { DriveConnection } from '@editor/shared';
import { config } from './config.js';
import { decrypt, encrypt } from './crypto.js';
import { supabase } from './supabase.js';
import { log } from './logger.js';

/**
 * Cria um cliente OAuth2 do Google já autenticado a partir da conexão
 * salva no banco. Se o Google renovar o access token, persistimos de volta
 * (criptografado) automaticamente.
 */
export function createOAuthClient(conn: DriveConnection, userId: string): OAuth2Client {
  const client = new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri,
  );
  client.setCredentials({
    access_token: decrypt(conn.access_token_enc),
    refresh_token: decrypt(conn.refresh_token_enc),
    expiry_date: conn.expiry || undefined,
  });

  client.on('tokens', (tokens) => {
    void (async () => {
      try {
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (tokens.access_token) patch.access_token_enc = encrypt(tokens.access_token);
        if (tokens.refresh_token) patch.refresh_token_enc = encrypt(tokens.refresh_token);
        if (tokens.expiry_date) patch.expiry = tokens.expiry_date;
        await supabase.from('drive_connections').update(patch).eq('user_id', userId);
      } catch (err) {
        log.error('Não foi possível persistir o token renovado do Drive', err);
      }
    })();
  });

  return client;
}

export function driveClient(auth: OAuth2Client): drive_v3.Drive {
  return google.drive({ version: 'v3', auth });
}

/** Encontra (ou cria) uma subpasta com o nome dado dentro de `parentId`. */
export async function ensureFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string,
): Promise<string> {
  const safe = name.replace(/'/g, "\\'");
  const q = [
    `name = '${safe}'`,
    `'${parentId}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ].join(' and ');

  const existing = await drive.files.list({
    q,
    fields: 'files(id, name)',
    spaces: 'drive',
    pageSize: 1,
  });
  const found = existing.data.files?.[0]?.id;
  if (found) return found;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  if (!created.data.id) throw new Error('Não foi possível criar a pasta no Google Drive.');
  return created.data.id;
}

/**
 * Faz upload de um arquivo para o Drive e confirma a existência (busca o id).
 * Retorna o id do arquivo. Lança erro se não confirmar.
 */
export async function uploadFile(
  drive: drive_v3.Drive,
  params: { folderId: string; name: string; filePath: string; mimeType?: string },
): Promise<string> {
  const res = await drive.files.create({
    requestBody: { name: params.name, parents: [params.folderId] },
    media: {
      mimeType: params.mimeType ?? 'video/mp4',
      body: createReadStream(params.filePath),
    },
    fields: 'id, size',
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error('O Google Drive não retornou o id do arquivo enviado.');

  // Confirmação: só consideramos concluído quando o Drive confirma o arquivo.
  const check = await drive.files.get({ fileId, fields: 'id, size, trashed' });
  if (!check.data.id || check.data.trashed) {
    throw new Error('O upload no Google Drive não pôde ser confirmado.');
  }
  return fileId;
}
