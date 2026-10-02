// Gera os ícones PNG do PWA sem dependências externas.
// Fundo na cor da marca + um "play" branco. Troque pelos seus se quiser.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BRAND = [37, 99, 235]; // #2563eb
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function inTriangle(px, py, size, pad) {
  // triângulo "play" apontando para a direita, centralizado com padding relativo
  const p = size * pad;
  const left = p + size * 0.06;
  const right = size - p - size * 0.02;
  const top = p;
  const bottom = size - p;
  if (px < left || px > right || py < top || py > bottom) return false;
  // borda superior e inferior do triângulo
  const t = (px - left) / (right - left); // 0..1
  const halfAt = (1 - t) * ((bottom - top) / 2);
  const cy = (top + bottom) / 2;
  return py >= cy - halfAt && py <= cy + halfAt;
}

function makePng(size, pad) {
  const bytesPerPixel = 4;
  const rowLen = size * bytesPerPixel + 1; // +1 filtro
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filtro "none"
    for (let x = 0; x < size; x++) {
      const [r, g, b] = inTriangle(x, y, size, pad) ? WHITE : BRAND;
      const o = y * rowLen + 1 + x * bytesPerPixel;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets = [
  ['icon-192.png', 192, 0.26],
  ['icon-512.png', 512, 0.26],
  ['icon-512-maskable.png', 512, 0.34], // mais padding para zona segura
  ['icon-180.png', 180, 0.26], // apple-touch-icon
  ['icon-32.png', 32, 0.22],
];

for (const [name, size, pad] of targets) {
  writeFileSync(join(OUT, name), makePng(size, pad));
  console.log('gerado', name);
}
