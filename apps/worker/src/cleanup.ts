import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config.js';
import { log } from './logger.js';
import { reclaimStale } from './supabase.js';

/** Apaga arquivos temporários locais abandonados há mais de N horas. */
export async function cleanupTempFiles(ageHours = config.cleanupAgeHours): Promise<number> {
  let removed = 0;
  const cutoff = Date.now() - ageHours * 3600_000;
  let entries: string[];
  try {
    entries = await readdir(config.tmpDir);
  } catch {
    return 0; // pasta ainda não existe
  }
  for (const name of entries) {
    const full = join(config.tmpDir, name);
    try {
      const s = await stat(full);
      if (s.mtimeMs < cutoff) {
        await rm(full, { force: true, recursive: true });
        removed += 1;
      }
    } catch {
      // ignora arquivos que sumiram no meio do caminho
    }
  }
  if (removed > 0) log.info(`Limpeza: ${removed} arquivo(s) temporário(s) antigo(s) removido(s).`);
  return removed;
}

/**
 * Rotina de manutenção: devolve à fila itens presos (worker caiu) e apaga
 * temporários abandonados.
 */
export async function runMaintenance(): Promise<void> {
  try {
    const reclaimed = await reclaimStale(30);
    if (reclaimed > 0) log.warn(`Manutenção: ${reclaimed} vídeo(s) preso(s) devolvido(s) à fila.`);
  } catch (err) {
    log.error('Falha ao recuperar vídeos presos', err);
  }
  await cleanupTempFiles().catch((err) => log.error('Falha na limpeza de temporários', err));
}
