/**
 * Generates the extension icons as PNGs without any image dependency.
 * Design: dark rounded square, a small green "ready" dot, and a two-step
 * ladder mark. Run: node scripts/make-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const inRounded = (x, y, s, r) => {
  const cx = Math.min(Math.max(x, r), s - r);
  const cy = Math.min(Math.max(y, r), s - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

function pixel(x, y, s) {
  const u = x / s, v = y / s;
  if (!inRounded(x, y, s, s * 0.22)) return [0, 0, 0, 0];
  // background
  let c = [24, 25, 31, 255];
  // ladder: three ascending bars
  const bars = [
    [0.22, 0.70, 0.22],
    [0.39, 0.54, 0.39],
    [0.56, 0.38, 0.56],
  ];
  for (const [bx, by, _] of bars) {
    if (u >= bx && u <= bx + 0.16 && v >= by && v <= by + 0.12) c = [232, 233, 237, 255];
  }
  // accent dot top-right
  const dx = u - 0.78, dy = v - 0.24;
  if (dx * dx + dy * dy <= 0.075 ** 2) c = [74, 201, 126, 255];
  return c;
}

mkdirSync("public/icons", { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(`public/icons/icon${size}.png`, png(size, pixel));
}
console.log("icons written");
