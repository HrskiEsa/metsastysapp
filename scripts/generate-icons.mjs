/**
 * Luo PWA-kuvakkeet (PNG) ilman ulkoisia riippuvuuksia.
 * Kuvake: tummanvihreä pyöristetty neliö, jossa valkoinen tähtäinrengas ja keskipiste.
 *
 * Käyttö: node scripts/generate-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'client', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter: none
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const BG = [15, 61, 36];
const BG2 = [22, 101, 52];
const FG = [246, 248, 246];

function renderIcon(size, { rounded }) {
  const buf = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const corner = rounded ? size * 0.16 : 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const r = Math.hypot(dx, dy);

      // Pyöristetyn neliön peittävyys
      let alpha = 1;
      if (rounded) {
        const qx = Math.abs(dx) - (c - corner);
        const qy = Math.abs(dy) - (c - corner);
        const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
        alpha = 1 - smoothstep(corner - 0.5, corner + 0.5, outside);
      }

      // Taustan liukuväri
      const t = (x + y) / (2 * size);
      let [R, G, B] = [mix(BG[0], BG2[0], t), mix(BG[1], BG2[1], t), mix(BG[2], BG2[2], t)];

      const ringRadius = size * 0.3;
      const ringHalf = size * 0.03;
      const ring = 1 - smoothstep(ringHalf - 0.8, ringHalf + 0.8, Math.abs(r - ringRadius));

      // Ristikko renkaan ulkopuolella
      const lineW = size * 0.022;
      const tick = Math.max(0, smoothstep(size * 0.36, size * 0.38, r) - smoothstep(size * 0.47, size * 0.49, r));
      const onAxis =
        Math.max(1 - smoothstep(lineW, lineW + 1, Math.abs(dx)), 1 - smoothstep(lineW, lineW + 1, Math.abs(dy)));
      const cross = tick * onAxis;

      const dot = 1 - smoothstep(size * 0.045, size * 0.055, r);

      const fg = Math.min(1, Math.max(ring, cross, dot));
      R = mix(R, FG[0], fg);
      G = mix(G, FG[1], fg);
      B = mix(B, FG[2], fg);

      buf[i] = Math.round(R);
      buf[i + 1] = Math.round(G);
      buf[i + 2] = Math.round(B);
      buf[i + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, size, buf);
}

const files = [
  ['icon-192.png', 192, { rounded: true }],
  ['icon-512.png', 512, { rounded: true }],
  ['icon-maskable-512.png', 512, { rounded: false }],
  ['apple-touch-icon.png', 180, { rounded: false }],
];

for (const [name, size, opts] of files) {
  fs.writeFileSync(path.join(outDir, name), renderIcon(size, opts));
  console.log(`✓ icons/${name} (${size}×${size})`);
}
