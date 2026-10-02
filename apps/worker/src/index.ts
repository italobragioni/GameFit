import { config } from './config.js';
import { log } from './logger.js';
import { claimNextVideo, getBatch, markBatchNotified } from './supabase.js';
import { processVideo } from './processor.js';
import { runMaintenance } from './cleanup.js';
import { notifyBatchFinished } from './push.js';

/** Avisa o dono do lote (push) quando o lote termina, apenas uma vez. */
async function maybeNotify(batchId: string): Promise<void> {
  try {
    const batch = await getBatch(batchId);
    const terminal =
      batch.status === 'completed' ||
      batch.status === 'completed_with_errors' ||
      batch.status === 'failed';
    if (terminal && !batch.notified_at) {
      await markBatchNotified(batch.id); // marca antes de enviar, para não duplicar
      await notifyBatchFinished(batch);
    }
  } catch (err) {
    log.warn(`Falha ao avaliar notificação do lote: ${String(err)}`);
  }
}

let running = true;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  log.info('=====================================================');
  log.info(`Worker do Editor de Vídeos iniciado (id: ${config.workerId})`);
  log.info(`Fila sequencial: 1 vídeo por vez. Poll: ${config.pollIntervalMs}ms.`);
  log.info('=====================================================');

  // manutenção periódica (a cada 10 min) — roda em paralelo ao loop principal
  await runMaintenance();
  const maintenanceTimer = setInterval(() => void runMaintenance(), 10 * 60_000);

  while (running) {
    let video;
    try {
      video = await claimNextVideo(config.workerId);
    } catch (err) {
      log.error('Erro ao consultar a fila', err);
      await sleep(config.pollIntervalMs);
      continue;
    }

    if (!video) {
      await sleep(config.pollIntervalMs);
      continue;
    }

    // processa UM vídeo por vez (nunca em paralelo)
    await processVideo(video);

    // se o lote terminou com este vídeo, avisa o usuário (push)
    await maybeNotify(video.batch_id);
  }

  clearInterval(maintenanceTimer);
  log.info('Worker encerrado.');
}

function shutdown(signal: string): void {
  log.info(`Recebido ${signal}. Encerrando após o vídeo atual...`);
  running = false;
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  log.error('Erro fatal no worker', err);
  process.exit(1);
});
