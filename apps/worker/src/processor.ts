import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildOutputName, type FilterName, type FitMode, type VideoItem } from '@editor/shared';
import { config } from './config.js';
import { log } from './logger.js';
import {
  getBatch,
  getDriveConnection,
  getTemplate,
  removeFromStorage,
  supabase,
  updateVideo,
} from './supabase.js';
import { downloadStorage, downloadTemplateImage, downloadUrl } from './download.js';
import { hasAudioStream, runFfmpeg } from './media.js';
import { createOAuthClient, driveClient, ensureFolder, uploadFile } from './drive.js';

/** Remove, sem lançar erro, os arquivos temporários locais. */
async function safeRemove(...paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((p) => rm(p, { force: true }).catch(() => undefined)),
  );
}

interface Settings {
  drive_folder_id: string | null;
  drive_folder_name: string | null;
}

async function getSettings(userId: string): Promise<Settings> {
  const { data } = await supabase
    .from('user_settings')
    .select('drive_folder_id, drive_folder_name')
    .eq('user_id', userId)
    .maybeSingle();
  return { drive_folder_id: data?.drive_folder_id ?? null, drive_folder_name: data?.drive_folder_name ?? null };
}

/**
 * Executa o pipeline completo de UM vídeo, uma única tentativa.
 * download -> processa -> envia ao Drive -> confirma -> exclui temporários.
 */
async function runPipeline(video: VideoItem, label: string): Promise<void> {
  await mkdir(config.tmpDir, { recursive: true });
  const inputPath = join(config.tmpDir, `${video.id}.input`);
  const templatePath = join(config.tmpDir, `${video.id}.template`);
  const outputPath = join(config.tmpDir, `${video.id}.out.mp4`);

  const batch = await getBatch(video.batch_id);
  if (!batch.template_id) throw new Error('O lote não tem um template selecionado.');
  const template = await getTemplate(batch.template_id);
  if (!template) throw new Error('Template não encontrado.');

  const conn = await getDriveConnection(batch.user_id);
  if (!conn) throw new Error('Google Drive não está conectado.');
  const settings = await getSettings(batch.user_id);
  if (!settings.drive_folder_id) throw new Error('Nenhuma pasta do Google Drive foi selecionada.');

  try {
    // ---- 1. DOWNLOAD ----------------------------------------------------
    await updateVideo(video.id, { status: 'downloading', progress: 0 });
    log.info(`${label} Baixando origem`);
    if (video.storage_path) {
      await downloadStorage(video.storage_path, inputPath);
    } else if (video.original_url) {
      await downloadUrl(video.original_url, inputPath);
    } else {
      throw new Error('Vídeo sem origem (nem arquivo nem URL).');
    }
    await downloadTemplateImage(template.image_url, templatePath);
    log.info(`${label} Download concluído`);

    // ---- 2. PROCESSAMENTO (FFmpeg) --------------------------------------
    await updateVideo(video.id, { status: 'processing', progress: 0 });
    const hasAudio = await hasAudioStream(inputPath);
    log.info(`${label} FFmpeg iniciado${hasAudio ? '' : ' (sem áudio)'}`);
    let lastReported = 0;
    await runFfmpeg(
      {
        templatePath,
        inputPath,
        outputPath,
        area: {
          x: template.video_x,
          y: template.video_y,
          width: template.video_width,
          height: template.video_height,
        },
        mirror: batch.mirror,
        speed: Number(batch.speed),
        filter: batch.filter as FilterName,
        fitMode: batch.fit_mode as FitMode,
        hasAudio,
      },
      (pct) => {
        // evita escrever no banco a cada frame
        if (pct - lastReported >= 10) {
          lastReported = pct;
          void updateVideo(video.id, { progress: pct }).catch(() => undefined);
        }
      },
    );
    log.info(`${label} Render concluído`);

    // ---- 3. UPLOAD PARA O GOOGLE DRIVE ----------------------------------
    await updateVideo(video.id, { status: 'uploading', progress: 100 });
    const auth = createOAuthClient(conn, batch.user_id);
    const drive = driveClient(auth);

    let folderId = settings.drive_folder_id;
    if (batch.drive_folder_mode === 'per_batch') {
      folderId = await ensureFolder(drive, folderId, batch.name);
    }
    const outName = buildOutputName({
      position: video.position,
      originalFilename: video.original_filename,
      keepOriginalName: batch.keep_original_name,
    });
    log.info(`${label} Upload Google Drive iniciado (${outName})`);
    const driveFileId = await uploadFile(drive, { folderId, name: outName, filePath: outputPath });
    log.info(`${label} Upload confirmado`);

    // ---- 4. CONCLUÍDO: marca e só então exclui temporários --------------
    await updateVideo(video.id, {
      status: 'completed',
      progress: 100,
      drive_file_id: driveFileId,
      error_message: null,
      finished_at: new Date().toISOString(),
    });

    // Exclui os temporários SOMENTE após a confirmação do upload.
    await safeRemove(inputPath, templatePath, outputPath);
    if (video.storage_path) {
      await removeFromStorage(config.uploadsBucket, video.storage_path).catch((err) =>
        log.warn(`Não foi possível apagar o upload original do Storage: ${String(err)}`),
      );
    }
    log.info(`${label} Temporários excluídos`);
  } catch (err) {
    // Em caso de erro, limpamos apenas os temporários LOCAIS. O arquivo de
    // origem no Storage é preservado para permitir nova tentativa.
    await safeRemove(inputPath, templatePath, outputPath);
    throw err;
  }
}

/**
 * Processa um vídeo com tentativas automáticas (até config.maxAttempts).
 * Nunca lança: ao final, o vídeo está 'completed' ou 'failed'.
 */
export async function processVideo(video: VideoItem): Promise<void> {
  const label = `video-${String(video.position).padStart(3, '0')}`;
  log.info(`Iniciando ${label}`);

  let attempt = video.attempts;
  let lastError: unknown;

  while (attempt < config.maxAttempts) {
    attempt += 1;
    await updateVideo(video.id, { attempts: attempt });
    try {
      await runPipeline(video, `${label} [tentativa ${attempt}/${config.maxAttempts}]`);
      log.info(`${label} ✅ Concluído`);
      return;
    } catch (err) {
      lastError = err;
      log.error(`${label} tentativa ${attempt}/${config.maxAttempts} falhou`, err);
      if (attempt < config.maxAttempts) {
        // pequeno backoff antes de tentar de novo
        await new Promise((r) => setTimeout(r, config.retryBackoffMs * attempt));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await updateVideo(video.id, {
    status: 'failed',
    error_message: message,
    finished_at: new Date().toISOString(),
  });
  log.error(`${label} ❌ Falhou após ${config.maxAttempts} tentativas`);
}
