import { config } from './config.js';
import { log } from './logger.js';
import { claimNextVideo } from './supabase.js';
import { processVideo } from './processor.js';
import { runMaintenance } from './cleanup.js';

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
