import { describe, expect, it } from 'vitest';
import { buildFfmpegArgs, type BuildFfmpegOptions } from './ffmpeg.js';

const base: BuildFfmpegOptions = {
  templatePath: '/tmp/template.png',
  inputPath: '/tmp/in.mp4',
  outputPath: '/tmp/out.mp4',
  area: { x: 80, y: 300, width: 920, height: 1400 },
  mirror: true,
  speed: 1.1,
  filter: 'filtro1',
  fitMode: 'fill',
  hasAudio: true,
};

function fcOf(args: string[]): string {
  const i = args.indexOf('-filter_complex');
  return args[i + 1];
}

describe('buildFfmpegArgs', () => {
  it('inclui as duas entradas: template em loop e vídeo', () => {
    const args = buildFfmpegArgs(base);
    expect(args).toContain('-loop');
    expect(args).toContain('/tmp/template.png');
    expect(args).toContain('/tmp/in.mp4');
    // ordem: template é a entrada 0, vídeo é a entrada 1
    expect(args.indexOf('/tmp/template.png')).toBeLessThan(args.indexOf('/tmp/in.mp4'));
  });

  it('escala o fundo para 1080x1920', () => {
    expect(fcOf(buildFfmpegArgs(base))).toContain('[0:v]scale=1080:1920');
  });

  it('aplica espelhamento quando mirror=true', () => {
    expect(fcOf(buildFfmpegArgs(base))).toContain('hflip');
  });

  it('não aplica hflip quando mirror=false', () => {
    expect(fcOf(buildFfmpegArgs({ ...base, mirror: false }))).not.toContain('hflip');
  });

  it('ajusta vídeo e áudio juntos na velocidade (sem dessincronizar)', () => {
    const fc = fcOf(buildFfmpegArgs(base));
    expect(fc).toContain('setpts=PTS/1.1');
    expect(fc).toContain('atempo=1.1');
  });

  it('não aplica setpts/atempo quando velocidade é 1.0', () => {
    const fc = fcOf(buildFfmpegArgs({ ...base, speed: 1 }));
    expect(fc).not.toContain('setpts=PTS/');
    expect(fc).toContain('anull');
  });

  it('modo fill cobre a área e corta', () => {
    const fc = fcOf(buildFfmpegArgs({ ...base, fitMode: 'fill' }));
    expect(fc).toContain('force_original_aspect_ratio=increase');
    expect(fc).toContain('crop=920:1400');
    expect(fc).toContain('overlay=x=80:y=300');
  });

  it('modo contain cabe inteiro e centraliza dentro da área', () => {
    const fc = fcOf(buildFfmpegArgs({ ...base, fitMode: 'contain' }));
    expect(fc).toContain('force_original_aspect_ratio=decrease');
    expect(fc).not.toContain('crop=');
    expect(fc).toContain('overlay=x=80+(920-w)/2:y=300+(1400-h)/2');
  });

  it('arredonda dimensões ímpares para pares', () => {
    const fc = fcOf(buildFfmpegArgs({ ...base, area: { x: 11, y: 21, width: 921, height: 1401 } }));
    expect(fc).toContain('scale=920:1400');
  });

  it('não mapeia áudio quando o vídeo não tem faixa de áudio', () => {
    const args = buildFfmpegArgs({ ...base, hasAudio: false });
    const fc = fcOf(args);
    expect(fc).not.toContain('atempo');
    expect(fc).not.toContain('[1:a]');
    expect(args).not.toContain('-c:a');
  });

  it('usa codecs compatíveis e faststart', () => {
    const args = buildFfmpegArgs(base);
    expect(args).toContain('libx264');
    expect(args).toContain('aac');
    expect(args).toContain('yuv420p');
    expect(args).toContain('+faststart');
    expect(args[args.length - 1]).toBe('/tmp/out.mp4');
  });

  it('filtro none não adiciona eq/colortemperature', () => {
    const fc = fcOf(buildFfmpegArgs({ ...base, filter: 'none', mirror: false, speed: 1 }));
    expect(fc).not.toContain('eq=');
    expect(fc).not.toContain('colortemperature');
  });
});
