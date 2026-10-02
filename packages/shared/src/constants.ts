/**
 * Constantes compartilhadas entre o frontend (apps/web) e o worker (apps/worker).
 */

/** Resolução final obrigatória de saída (9:16, vertical). */
export const OUTPUT_WIDTH = 1080;
export const OUTPUT_HEIGHT = 1920;

/** Máximo de vídeos permitidos por lote (MVP). */
export const MAX_VIDEOS_PER_BATCH = 20;

/** Velocidades de reprodução disponíveis. */
export const SPEED_OPTIONS = [1.0, 1.05, 1.1, 1.15, 1.2] as const;
export type Speed = (typeof SPEED_OPTIONS)[number];
export const DEFAULT_SPEED: Speed = 1.1;

/** Filtros de cor discretos (implementados em FFmpeg). */
export const FILTER_OPTIONS = ['none', 'filtro1', 'filtro2', 'filtro3'] as const;
export type FilterName = (typeof FILTER_OPTIONS)[number];
export const DEFAULT_FILTER: FilterName = 'filtro1';

export const FILTER_LABELS: Record<FilterName, string> = {
  none: 'Nenhum',
  filtro1: 'Filtro 1 (quente)',
  filtro2: 'Filtro 2 (frio)',
  filtro3: 'Filtro 3 (vibrante)',
};

/** Modo de encaixe do vídeo dentro da área do template. */
export const FIT_MODES = ['fill', 'contain'] as const;
export type FitMode = (typeof FIT_MODES)[number];
export const DEFAULT_FIT_MODE: FitMode = 'fill';

export const FIT_MODE_LABELS: Record<FitMode, string> = {
  fill: 'Preencher',
  contain: 'Conter',
};

export const DEFAULT_MIRROR = true;

/** Número máximo de tentativas de processamento por vídeo. */
export const DEFAULT_MAX_ATTEMPTS = 3;
