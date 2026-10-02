import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Criptografia AES-256-GCM dos tokens OAuth do Google Drive.
 * Mesma implementação usada pelo worker. Chave em TOKEN_ENCRYPTION_KEY
 * (32 bytes em base64). SOMENTE servidor.
 */
function key(): Buffer {
  const k = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || '', 'base64');
  if (k.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY deve ter 32 bytes em base64.');
  }
  return k;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('Token criptografado inválido.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
