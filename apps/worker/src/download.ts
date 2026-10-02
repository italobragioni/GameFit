import { createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { downloadFromStorage } from './supabase.js';
import { config } from './config.js';

/** Baixa uma URL http(s) para um arquivo local. */
export async function downloadUrl(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Falha ao baixar a URL (HTTP ${res.status}).`);
  }
  // Converte o ReadableStream (web) em stream do Node e grava em disco.
  const nodeStream = Readable.fromWeb(res.body as unknown as import('stream/web').ReadableStream);
  await pipeline(nodeStream, createWriteStream(destPath));
}

/** Copia um arquivo do Supabase Storage para um arquivo local. */
export async function downloadStorage(path: string, destPath: string): Promise<void> {
  const buf = await downloadFromStorage(config.uploadsBucket, path);
  await writeFile(destPath, buf);
}

/** Baixa a imagem do template (URL pública) para um arquivo local. */
export async function downloadTemplateImage(imageUrl: string, destPath: string): Promise<void> {
  await downloadUrl(imageUrl, destPath);
}
