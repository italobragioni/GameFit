import { MAX_VIDEOS_PER_BATCH } from './constants.js';

/**
 * Valida uma URL de vídeo. Aceita apenas http/https bem formados.
 *
 * IMPORTANTE: este projeto NÃO contorna DRM, autenticação ou proteções de
 * plataformas. A validação aqui é apenas de formato. A arquitetura é modular
 * para, no futuro, adicionar "importadores" de fontes autorizadas.
 */
export function isValidVideoUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  return url.protocol === 'http:' || url.protocol === 'https:';
}

export interface ParsedUrls {
  valid: string[];
  invalid: string[];
}

/** Separa um bloco de texto (uma URL por linha) em válidas/ inválidas. */
export function parseUrlLines(text: string): ParsedUrls {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const valid: string[] = [];
  const invalid: string[] = [];
  for (const line of lines) {
    if (isValidVideoUrl(line)) valid.push(line);
    else invalid.push(line);
  }
  return { valid, invalid };
}

export interface BatchItemInput {
  url?: string | null;
  storagePath?: string | null;
  originalFilename?: string | null;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Valida a quantidade e o conteúdo mínimo dos itens de um lote. */
export function validateBatchItems(items: BatchItemInput[]): ValidationResult {
  if (items.length === 0) {
    return { ok: false, error: 'Adicione pelo menos um vídeo ao lote.' };
  }
  if (items.length > MAX_VIDEOS_PER_BATCH) {
    return {
      ok: false,
      error: `Máximo de ${MAX_VIDEOS_PER_BATCH} vídeos por lote.`,
    };
  }
  for (const item of items) {
    const hasUrl = !!item.url && item.url.trim().length > 0;
    const hasFile = !!item.storagePath && item.storagePath.trim().length > 0;
    if (!hasUrl && !hasFile) {
      return { ok: false, error: 'Cada item precisa de um arquivo ou de uma URL.' };
    }
    if (hasUrl && !isValidVideoUrl(item.url!)) {
      return { ok: false, error: `URL inválida: ${item.url}` };
    }
  }
  return { ok: true };
}
