import type { BatchStatus, VideoStatus } from '@editor/shared';

export const videoStatusLabel: Record<VideoStatus, string> = {
  pending: 'Aguardando',
  downloading: 'Baixando',
  processing: 'Processando',
  uploading: 'Enviando ao Drive',
  completed: 'Concluído',
  failed: 'Falhou',
};

export const videoStatusEmoji: Record<VideoStatus, string> = {
  pending: '⏳',
  downloading: '⬇️',
  processing: '🔄',
  uploading: '☁️',
  completed: '✅',
  failed: '❌',
};

export const batchStatusLabel: Record<BatchStatus, string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  completed: 'Concluído',
  completed_with_errors: 'Concluído com erros',
  failed: 'Falhou',
};

export const batchStatusEmoji: Record<BatchStatus, string> = {
  pending: '⏳',
  processing: '🔄',
  completed: '✅',
  completed_with_errors: '⚠️',
  failed: '❌',
};

/** true enquanto o lote ainda está em andamento (vale a pena atualizar). */
export function isBatchActive(status: BatchStatus): boolean {
  return status === 'pending' || status === 'processing';
}
