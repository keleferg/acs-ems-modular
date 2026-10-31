// Small QR code encoder (byte mode, error correction level M, versions 1–10, up to 213 bytes),
// so the qualification "Use my phone" link can be shown as a QR code without a new dependency.
// Follows ISO/IEC 18004: Reed–Solomon over GF(256) (0x11D), block interleaving, eight masks
// scored with the four penalty rules.

type Version = { total: number; ec: number; groups: Array<[number, number]>; align: number[] };

const VERSIONS: Record<number, Version> = {
  1: { total: 26, ec: 10, groups: [[1, 16]], align: [] },
  2: { total: 44, ec: 16, groups: [[1, 28]], align: [6, 18] },
  3: { total: 70, ec: 26, groups: [[1, 44]], align: [6, 22] },
  4: { total: 100, ec: 18, groups: [[2, 32]], align: [6, 26] },
  5: { total: 134, ec: 24, groups: [[2, 43]], align: [6, 30] },
  6: { total: 172, ec: 16, groups: [[4, 27]], align: [6, 34] },
  7: { total: 196, ec: 18, groups: [[4, 31]], align: [6, 22, 38] },
  8: { total: 242, ec: 22, groups: [[2, 38], [2, 39]], align: [6, 24, 42] },
  9: { total: 292, ec: 22, groups: [[3, 36], [2, 37]], align: [6, 26, 46] },
  10: { total: 346, ec: 26, groups: [[4, 43], [1, 44]], align: [6, 28, 50] },
};

const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number) {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

function rsGenerator(degree: number) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data: number[], degree: number) {
  const generator = rsGenerator(degree);
  const result = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);
    for (let i = 0; i < degree; i++) result[i] ^= gfMul(generator[i + 1], factor);
  }
  return result;
}

function dataCapacity(v: Version) {
  return v.groups.reduce((sum, [count, size]) => sum + count * size, 0);
}

function encodeData(bytes: number[], version: number) {
  const v = VERSIONS[version];
  const capacity = dataCapacity(v);
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) push(byte, 8);
  push(0, Math.min(4, capacity * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  for (let pad = 0; codewords.length < capacity; pad++) codewords.push(pad % 2 ? 0x11 : 0xec);

  // Split into blocks, add error correction, interleave.
  const blocks: number[][] = [];
  let offset = 0;
  for (const [count, size] of v.groups) {
    for (let i = 0; i < count; i++) {
      blocks.push(codewords.slice(offset, offset + size));
      offset += size;
    }
  }
  const ecBlocks = blocks.map((block) => rsRemainder(block, v.ec));
  const result: number[] = [];
  const maxData = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < maxData; i++) for (const block of blocks) if (i < block.length) result.push(block[i]);
  for (let i = 0; i < v.ec; i++) for (const block of ecBlocks) result.push(block[i]);
  return result;
}

function bchFormat(mask: number) {
  const data = (0b00 << 3) | mask; // level M = 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
}

function bchVersion(version: number) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | (rem & 0xfff);
}

const MASKS: Array<(r: number, c: number) => boolean> = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function buildMatrix(codewords: number[], version: number, mask: number) {
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set = (r: number, c: number, dark: boolean) => {
    modules[r][c] = dark;
    reserved[r][c] = true;
  };

  // Finder patterns and separators.
  for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark = inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        set(rr, cc, dark);
      }
    }
  }
  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  // Alignment patterns.
  const align = VERSIONS[version].align;
  for (const r of align) {
    for (const c of align) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
      }
    }
  }
  // Format information (reserved now, written below) and the dark module.
  const format = bchFormat(mask);
  const formatBit = (i: number) => ((format >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(i, 8, formatBit(i));
  set(7, 8, formatBit(6));
  set(8, 8, formatBit(7));
  set(8, 7, formatBit(8));
  for (let i = 9; i < 15; i++) set(8, 14 - i, formatBit(i));
  for (let i = 0; i < 8; i++) set(8, size - 1 - i, formatBit(i));
  for (let i = 8; i < 15; i++) set(size - 15 + i, 8, formatBit(i));
  set(size - 8, 8, true);
  // Version information (version 7 and up).
  if (version >= 7) {
    const info = bchVersion(version);
    for (let i = 0; i < 18; i++) {
      const dark = ((info >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = (i % 3) + size - 11;
      set(a, b, dark);
      set(b, a, dark);
    }
  }

  // Data, in the two-column zigzag from the bottom right, skipping the vertical timing column.
  let bit = 0;
  const totalBits = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const upward = ((right + 1) & 2) === 0;
        const r = upward ? size - 1 - vert : vert;
        if (reserved[r][c]) continue;
        let dark = false;
        if (bit < totalBits) dark = ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1;
        bit++;
        modules[r][c] = MASKS[mask](r, c) ? !dark : dark;
      }
    }
  }
  return modules;
}

function penalty(m: boolean[][]) {
  const size = m.length;
  let score = 0;
  // Rule 1: runs of five or more in rows and columns.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < size; i++) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        const same = pass === 0 ? m[i][j] === m[i][j - 1] : m[j][i] === m[j - 1][i];
        if (same) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }
  // Rule 2: 2x2 blocks.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }
  // Rule 3: finder-like patterns.
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - 11; c++) {
      for (const p of [p1, p2]) {
        if (p.every((v, k) => m[r][c + k] === v)) score += 40;
        if (p.every((v, k) => m[c + k][r] === v)) score += 40;
      }
    }
  }
  // Rule 4: dark balance.
  const dark = m.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

/** QR matrix for `text` (true = dark), level M. Throws if longer than 213 bytes. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 1;
  while (version <= 10) {
    const header = 4 + (version < 10 ? 8 : 16);
    if (header + bytes.length * 8 <= dataCapacity(VERSIONS[version]) * 8) break;
    version++;
  }
  if (version > 10) throw new Error("Text is too long for this QR encoder.");
  const codewords = encodeData(bytes, version);
  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const matrix = buildMatrix(codewords, version, mask);
    const score = penalty(matrix);
    if (score < bestScore) {
      best = matrix;
      bestScore = score;
    }
  }
  return best!;
}

/** SVG markup for `text` as a QR code with a 4-module quiet zone. */
export function qrSvg(text: string, pixelSize = 240) {
  const matrix = qrMatrix(text);
  const size = matrix.length + 8;
  let path = "";
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (dark) path += `M${c + 4} ${r + 4}h1v1h-1z`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${pixelSize}" height="${pixelSize}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
