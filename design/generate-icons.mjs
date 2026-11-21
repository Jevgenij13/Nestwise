// Generates public/icons/* from one SVG definition.
// Usage (sharp is NOT a project dependency; install it in a scratch dir):
//   SHARP_DIR=/path/to/dir-with-node_modules/sharp-installed node design/generate-icons.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire((process.env.SHARP_DIR || process.cwd()) + '/');
const sharp = require('sharp');
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
fs.mkdirSync(out, { recursive: true });

// Artwork lives in a 1024 box. Everything important sits inside the central
// 80% circle (r = 410), so the same art works as a maskable icon.
const art = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9703f"/>
      <stop offset="1" stop-color="#a64420"/>
    </linearGradient>
    <linearGradient id="egg" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#fffaf2"/>
      <stop offset="1" stop-color="#f6dcbc"/>
    </linearGradient>
  </defs>`;

// Nest: dark back bowl, egg, then woven straw arcs in front of the egg.
const nest = `
  <path d="M196 560 C196 770 340 850 512 850 C684 850 828 770 828 560 Z" fill="#6f2f15"/>
  <ellipse cx="512" cy="560" rx="316" ry="62" fill="#4a1d0b"/>
  <path d="M512 262 C612 262 664 392 664 492 C664 590 600 650 512 650 C424 650 360 590 360 492 C360 392 412 262 512 262 Z" fill="url(#egg)"/>
  <path d="M452 340 C430 372 420 416 424 456" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="22" stroke-linecap="round"/>
  <g fill="none" stroke-linecap="round" stroke-width="34">
    <path d="M178 590 C250 790 390 842 512 842 C634 842 774 790 846 590" stroke="#ffd9a0"/>
    <path d="M232 618 C330 718 430 740 512 740 C594 740 694 718 792 618" stroke="#f3b878"/>
    <path d="M262 700 C350 790 440 812 512 812 C584 812 674 790 762 700" stroke="#ffe6bf"/>
  </g>`;

const svg = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${art}${bg}${nest}</svg>`;
const full = svg('<rect width="1024" height="1024" fill="url(#bg)"/>');
const rounded = svg('<rect width="1024" height="1024" rx="228" fill="url(#bg)"/>');

fs.writeFileSync(path.join(out, 'icon.svg'), rounded.replace(/\n\s*/g, '\n'));
fs.writeFileSync(path.join(out, 'favicon.svg'), rounded.replace(/\n\s*/g, '\n'));

const png = (svgText, size, file) =>
  sharp(Buffer.from(svgText), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(out, file));

await sharp(Buffer.from(full), { density: 384 }).resize(180, 180).flatten({ background: '#b9552b' }).removeAlpha().png({ compressionLevel: 9 }).toFile(path.join(out, 'apple-touch-icon.png'));   // iOS needs an opaque square; iOS applies the mask
await png(rounded, 192, 'icon-192.png');
await png(rounded, 512, 'icon-512.png');
await png(full, 512, 'icon-maskable-512.png');  // full-bleed, art inside the safe zone
await png(rounded, 32, 'favicon-32.png');

// favicon.ico with 16/32/48 embedded PNGs
const sizes = [16, 32, 48];
const bufs = await Promise.all(sizes.map((s) => sharp(Buffer.from(rounded), { density: 384 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const dir = bufs.map((b, i) => {
  const e = Buffer.alloc(16);
  e[0] = sizes[i]; e[1] = sizes[i]; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(b.length, 8); e.writeUInt32LE(offset, 12); offset += b.length; return e;
});
fs.writeFileSync(path.join(out, 'favicon.ico'), Buffer.concat([header, ...dir, ...bufs]));
console.log('icons written to', out);
