/**
 * A minimal ZIP writer and reader for the coral backup (PLAN 7.41): entries are STORED (no compression,
 * since JPEGs do not shrink), with CRC-32, so any unzip tool opens the file and shows the photos in
 * folders. The reader handles STORED entries only (what the writer makes) and reads entry data lazily
 * through `read`, so a phone never holds a large backup in memory twice. No ZIP64: a backup must stay
 * under 4 GB and 65 535 files. Pure apart from `Blob`.
 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
const dosTime = (ms: number) => {
  const d = new Date(ms);
  const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
  const date = ((Math.max(1980, d.getUTCFullYear()) - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  return { time, date };
};

export interface ZipIn {
  name: string;
  data: Uint8Array;
  /** Modified time, ms. */
  t?: number;
}

/** The ZIP as a list of byte chunks (pass to `new Blob(parts)`). */
export function zipParts(entries: readonly ZipIn[]): Uint8Array[] {
  if (entries.length > 0xffff) throw new Error('zip: too many files');
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const { time, date } = dosTime(e.t ?? Date.now());
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true); // UTF-8 names
    h.setUint16(8, 0, true); // stored
    h.setUint16(10, time, true);
    h.setUint16(12, date, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, e.data.length, true);
    h.setUint32(22, e.data.length, true);
    h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, e.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, time, true);
    c.setUint16(14, date, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, e.data.length, true);
    c.setUint32(24, e.data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + e.data.length;
    if (offset > 0xffffffff) throw new Error('zip: over 4 GB');
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  return [...parts, ...central, new Uint8Array(end.buffer)];
}

export interface ZipEntry {
  name: string;
  size: number;
  crc: number;
  /** Reads and checks the entry's bytes. */
  bytes(): Promise<Uint8Array>;
}

/** Reads a ZIP's index. `read(offset, length)` returns those bytes of the file; `size` is its length. */
export async function unzip(read: (offset: number, length: number) => Promise<Uint8Array>, size: number): Promise<ZipEntry[]> {
  const tail = Math.min(size, 22 + 0xffff);
  const buf = await read(size - tail, tail);
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (v.getUint32(i, true) === 0x06054b50) (eocd = i), (i = -1);
  if (eocd < 0) throw new Error('zip: not a zip file');
  const n = v.getUint16(eocd + 10, true), cdSize = v.getUint32(eocd + 12, true), cdOff = v.getUint32(eocd + 16, true);
  const cd = await read(cdOff, cdSize);
  const c = new DataView(cd.buffer, cd.byteOffset, cd.byteLength);
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  let p = 0;
  for (let k = 0; k < n; k++) {
    if (c.getUint32(p, true) !== 0x02014b50) throw new Error('zip: bad central directory');
    const method = c.getUint16(p + 10, true), crc = c.getUint32(p + 16, true), csize = c.getUint32(p + 20, true), usize = c.getUint32(p + 24, true);
    const nl = c.getUint16(p + 28, true), xl = c.getUint16(p + 30, true), cl = c.getUint16(p + 32, true), local = c.getUint32(p + 42, true);
    const name = dec.decode(cd.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (method !== 0 || csize !== usize) {
      out.push({ name, size: usize, crc, bytes: () => Promise.reject(new Error(`zip: ${name} is compressed`)) });
      continue;
    }
    out.push({
      name, size: usize, crc,
      async bytes() {
        const lh = await read(local, 30);
        const l = new DataView(lh.buffer, lh.byteOffset, lh.byteLength);
        if (l.getUint32(0, true) !== 0x04034b50) throw new Error(`zip: bad entry ${name}`);
        const data = await read(local + 30 + l.getUint16(26, true) + l.getUint16(28, true), usize);
        if (crc32(data) !== crc) throw new Error(`zip: ${name} is damaged`);
        return data;
      },
    });
  }
  return out;
}

/** `unzip` over a Blob or File. */
export const unzipBlob = (b: Blob) => unzip(async (o, l) => new Uint8Array(await b.slice(o, o + l).arrayBuffer()), b.size);
