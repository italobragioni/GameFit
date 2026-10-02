import webpush from 'web-push';
import type { Batch, PushSubscriptionRecord } from '@editor/shared';
import { config } from './config.js';
import { supabase } from './supabase.js';
import { log } from './logger.js';

let configured = false;

/** Configura o VAPID uma vez. Retorna false se não houver chaves. */
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!config.push.publicKey || !config.push.privateKey) return false;
  webpush.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey);
  configured = true;
  return true;
}

function batchMessage(batch: Batch): { title: string; body: string } {
  if (batch.status === 'completed') {
    return { title: 'Lote concluído ✅', body: `"${batch.name}" terminou: ${batch.completed_videos} vídeos prontos.` };
  }
  if (batch.status === 'completed_with_errors') {
    return {
      title: 'Lote concluído com erros ⚠️',
      body: `"${batch.name}": ${batch.completed_videos} prontos, ${batch.failed_videos} falharam.`,
    };
  }
  return { title: 'Lote falhou ❌', body: `"${batch.name}" não pôde ser processado.` };
}

/**
 * Envia "Seu lote terminou" para todos os dispositivos inscritos do dono do lote.
 * Remove inscrições inválidas (expiradas). Nunca lança.
 */
export async function notifyBatchFinished(batch: Batch): Promise<void> {
  if (!ensureConfigured()) return;

  const { data } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', batch.user_id);
  const subs = (data as PushSubscriptionRecord[]) ?? [];
  if (subs.length === 0) return;

  const { title, body } = batchMessage(batch);
  const payload = JSON.stringify({ title, body, url: `${config.appUrl}/batches/${batch.id}` });

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          // inscrição expirada: remove
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        } else {
          log.warn(`Falha ao enviar push: ${String(err)}`);
        }
      }
    }),
  );
  log.info(`Notificação enviada para ${subs.length} dispositivo(s).`);
}
