import { spawn } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { buildFfmpegArgs, type BuildFfmpegOptions } from '@editor/shared';
import { config } from './config.js';
import { log } from './logger.js';

/** Caminho do binário do FFmpeg (env tem prioridade; senão usa o estático). */
export function ffmpegBin(): string {
  if (config.ffmpegPath) return config.ffmpegPath;
  if (ffmpegStatic) return ffmpegStatic as unknown as string;
  throw new Error('FFmpeg não encontrado. Defina FFMPEG_PATH ou instale ffmpeg-static.');
}

function ffprobeBin(): string {
  return ffprobeStatic.path;
}

/** Detecta se o vídeo possui faixa de áudio. */
export async function hasAudioStream(inputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const args = [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=codec_type',
      '-of', 'csv=p=0',
      inputPath,
    ];
    const proc = spawn(ffprobeBin(), args);
    let out = '';
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.on('error', () => resolve(false));
    proc.on('close', () => resolve(out.includes('audio')));
  });
}

export type ProgressFn = (percent: number) => void;

/** Lê o "Duration" do stderr do FFmpeg (em segundos). */
function parseDuration(stderr: string): number | null {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Lê o "time=" atual do stderr do FFmpeg (em segundos). */
function parseTime(chunk: string): number | null {
  const m = chunk.match(/time=(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Roda o FFmpeg com os argumentos gerados pelo pacote compartilhado. */
export function runFfmpeg(opts: BuildFfmpegOptions, onProgress?: ProgressFn): Promise<void> {
  const args = buildFfmpegArgs(opts);
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin(), args);
    let stderr = '';
    let duration: number | null = null;

    proc.stderr.on('data', (d) => {
      const chunk = d.toString();
      stderr += chunk;
      if (stderr.length > 20000) stderr = stderr.slice(-20000); // evita estourar memória
      if (duration === null) duration = parseDuration(stderr);
      if (onProgress && duration) {
        const t = parseTime(chunk);
        if (t !== null) {
          const pct = Math.max(0, Math.min(99, Math.round((t / duration) * 100)));
          onProgress(pct);
        }
      }
    });

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        log.error(`FFmpeg saiu com código ${code}`);
        reject(new Error(`FFmpeg falhou (código ${code}). ${stderr.slice(-500)}`));
      }
    });
  });
}
