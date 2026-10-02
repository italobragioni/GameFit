import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { afterAll, describe, expect, it } from 'vitest';
import type { FitMode } from '@editor/shared';

// media.ts importa config.ts, que exige variáveis de ambiente — mockamos.
import { vi } from 'vitest';
vi.mock('./config.js', () => ({ config: { ffmpegPath: '' } }));

import { hasAudioStream, runFfmpeg } from './media.js';

const ffmpeg = ffmpegStatic as unknown as string;
const ffprobe = ffprobeStatic.path;
const DIR = mkdtempSync(join(tmpdir(), 'editor-render-'));

function sh(bin: string, args: string[]) {
  const r = spawnSync(bin, args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr?.slice(-500));
}

function probe(file: string): string {
  const r = spawnSync(
    ffprobe,
    ['-v', 'error', '-show_entries', 'stream=codec_name,width,height:format=duration', '-of', 'default=noprint_wrappers=1', file],
    { encoding: 'utf8' },
  );
  return r.stdout;
}

afterAll(() => {
  spawnSync('rm', ['-rf', DIR]);
});

describe('render FFmpeg (integração)', () => {
  const template = join(DIR, 'template.png');
  sh(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=c=navy:s=1080x1920:d=1', '-frames:v', '1', template]);

  const shapes: Record<string, string> = {
    horizontal: '1280x720',
    vertical: '720x1280',
    square: '720x720',
  };

  for (const [label, size] of Object.entries(shapes)) {
    for (const fitMode of ['fill', 'contain'] as FitMode[]) {
      it(`gera 1080x1920 H.264/AAC para vídeo ${label} (${fitMode})`, async () => {
        const input = join(DIR, `in-${label}.mp4`);
        if (!existsSync(input)) {
          sh(ffmpeg, [
            '-y',
            '-f', 'lavfi', '-i', `testsrc=size=${size}:rate=30:d=2`,
            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
            '-shortest', '-pix_fmt', 'yuv420p', input,
          ]);
        }
        const output = join(DIR, `out-${label}-${fitMode}.mp4`);
        expect(await hasAudioStream(input)).toBe(true);

        await runFfmpeg({
          templatePath: template,
          inputPath: input,
          outputPath: output,
          area: { x: 80, y: 300, width: 920, height: 1400 },
          mirror: true,
          speed: 1.1,
          filter: 'filtro1',
          fitMode,
          hasAudio: true,
        });

        const info = probe(output);
        expect(info).toContain('width=1080');
        expect(info).toContain('height=1920');
        expect(info).toContain('codec_name=h264');
        expect(info).toContain('codec_name=aac');
        // velocidade 1.1x aplicada: ~2s / 1.1 ≈ 1.8s
        const dur = Number(/duration=([\d.]+)/.exec(info)?.[1]);
        expect(dur).toBeGreaterThan(1.5);
        expect(dur).toBeLessThan(2.0);
      }, 60_000);
    }
  }
});
