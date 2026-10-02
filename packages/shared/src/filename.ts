/**
 * Geração de nomes de arquivo de saída.
 *
 * Padrão: video-001.mp4, video-002.mp4, ...
 * Opcionalmente mantém o nome original do arquivo (trocando a extensão por .mp4).
 */

/** Remove caracteres problemáticos para nomes de arquivo. */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/\.[^/.]+$/, ''); // remove extensão
  const cleaned = base
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\-_ ]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return cleaned || 'video';
}

/** Nome sequencial: posição 1 -> "video-001.mp4". */
export function sequentialName(position: number): string {
  const n = String(position).padStart(3, '0');
  return `video-${n}.mp4`;
}

export interface OutputNameOptions {
  position: number;
  originalFilename?: string | null;
  keepOriginalName?: boolean;
}

export function buildOutputName(opts: OutputNameOptions): string {
  if (opts.keepOriginalName && opts.originalFilename) {
    return `${sanitizeFilename(opts.originalFilename)}.mp4`;
  }
  return sequentialName(opts.position);
}
