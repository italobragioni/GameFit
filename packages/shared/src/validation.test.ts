import { describe, expect, it } from 'vitest';
import { isValidVideoUrl, parseUrlLines, validateBatchItems } from './validation.js';

describe('isValidVideoUrl', () => {
  it('aceita http/https', () => {
    expect(isValidVideoUrl('https://exemplo.com/a.mp4')).toBe(true);
    expect(isValidVideoUrl('http://exemplo.com/a.mp4')).toBe(true);
  });
  it('rejeita o resto', () => {
    expect(isValidVideoUrl('ftp://x/a.mp4')).toBe(false);
    expect(isValidVideoUrl('não é url')).toBe(false);
    expect(isValidVideoUrl('')).toBe(false);
  });
});

describe('parseUrlLines', () => {
  it('separa válidas e inválidas, ignorando linhas vazias', () => {
    const r = parseUrlLines('https://a.com/1.mp4\n\n  \nlixo\nhttps://b.com/2.mp4');
    expect(r.valid).toEqual(['https://a.com/1.mp4', 'https://b.com/2.mp4']);
    expect(r.invalid).toEqual(['lixo']);
  });
});

describe('validateBatchItems', () => {
  it('exige ao menos 1 item', () => {
    expect(validateBatchItems([]).ok).toBe(false);
  });
  it('limita a 20 itens', () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ url: `https://a.com/${i}.mp4` }));
    expect(validateBatchItems(items).ok).toBe(false);
  });
  it('aceita arquivo (storagePath) ou url', () => {
    expect(validateBatchItems([{ storagePath: 'u/1.mp4' }]).ok).toBe(true);
    expect(validateBatchItems([{ url: 'https://a.com/1.mp4' }]).ok).toBe(true);
  });
  it('rejeita item sem arquivo e sem url', () => {
    expect(validateBatchItems([{}]).ok).toBe(false);
  });
  it('rejeita url malformada', () => {
    expect(validateBatchItems([{ url: 'xyz' }]).ok).toBe(false);
  });
});
