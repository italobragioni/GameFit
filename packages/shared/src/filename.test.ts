import { describe, expect, it } from 'vitest';
import { buildOutputName, sanitizeFilename, sequentialName } from './filename.js';

describe('sequentialName', () => {
  it('formata com 3 dígitos', () => {
    expect(sequentialName(1)).toBe('video-001.mp4');
    expect(sequentialName(7)).toBe('video-007.mp4');
    expect(sequentialName(20)).toBe('video-020.mp4');
  });
});

describe('sanitizeFilename', () => {
  it('remove extensão e caracteres inválidos', () => {
    expect(sanitizeFilename('Meu Vídeo!!!.mov')).toBe('Meu-Vídeo');
    expect(sanitizeFilename('a/b\\c:d.mp4')).toBe('abcd');
  });
  it('tem fallback quando fica vazio', () => {
    expect(sanitizeFilename('***.mp4')).toBe('video');
  });
});

describe('buildOutputName', () => {
  it('usa nome sequencial por padrão', () => {
    expect(buildOutputName({ position: 3 })).toBe('video-003.mp4');
  });
  it('mantém nome original quando pedido', () => {
    expect(
      buildOutputName({ position: 3, originalFilename: 'jogo.mov', keepOriginalName: true }),
    ).toBe('jogo.mp4');
  });
  it('cai para sequencial se pedir original mas não houver nome', () => {
    expect(buildOutputName({ position: 3, keepOriginalName: true })).toBe('video-003.mp4');
  });
});
