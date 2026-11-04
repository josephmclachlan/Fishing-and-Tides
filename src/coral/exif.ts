/**
 * Just enough EXIF to file a coral photo (PLAN 7.38): where it was taken (GPS latitude, longitude
 * and, when the camera records it, horizontal error) and when (DateTimeOriginal, with its UTC offset
 * when present). Reads the APP1 block of a JPEG; anything else, or a JPEG without EXIF, gives {}.
 * Pure: takes the file's first bytes (64 KB is plenty; EXIF must sit in the first APP1 segment).
 *
 * Phones often strip GPS when a photo is shared or picked from the gallery (iOS asks whether to
 * include location), so a missing position is normal and the caller falls back.
 */
import { REGION } from '../region';

export interface PhotoMeta {
  lat?: number;
  lng?: number;
  /** GPSHPositioningError, m. */
  accuracyM?: number;
  /** When it was taken, ms since epoch. */
  takenAt?: number;
}

/** Bytes needed from the start of the file. */
export const EXIF_BYTES = 128 * 1024;

export function readExif(buf: ArrayBuffer, tzOffsetH: number = REGION.tzOffsetH): PhotoMeta {
  try {
    return parse(new DataView(buf), tzOffsetH);
  } catch {
    return {};
  }
}

function parse(v: DataView, tzOffsetH: number): PhotoMeta {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return {};
  let p = 2;
  while (p + 4 <= v.byteLength) {
    const marker = v.getUint16(p);
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return {};
    const len = v.getUint16(p + 2);
    if (marker === 0xffe1 && p + 10 <= v.byteLength && v.getUint32(p + 4) === 0x45786966 && v.getUint16(p + 8) === 0) return tiff(v, p + 10, tzOffsetH);
    p += 2 + len;
  }
  return {};
}

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

function tiff(v: DataView, t0: number, tzOffsetH: number): PhotoMeta {
  const le = v.getUint16(t0) === 0x4949;
  if (!le && v.getUint16(t0) !== 0x4d4d) return {};
  const u16 = (o: number) => v.getUint16(t0 + o, le);
  const u32 = (o: number) => v.getUint32(t0 + o, le);
  if (u16(2) !== 42) return {};
  /** Tag → [type, count, offset of the value (inline or pointed to), relative to t0]. */
  const ifd = (off: number) => {
    const out = new Map<number, [number, number, number]>();
    const n = u16(off);
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      const type = u16(e + 2), count = u32(e + 4);
      const size = (TYPE_SIZE[type] ?? 1) * count;
      out.set(u16(e), [type, count, size > 4 ? u32(e + 8) : e + 8]);
    }
    return out;
  };
  const ascii = (e?: [number, number, number]) => {
    if (!e || e[0] !== 2) return '';
    let s = '';
    for (let i = 0; i < e[1]; i++) {
      const c = v.getUint8(t0 + e[2] + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  /** Numeric values of any numeric type (cameras write RATIONAL; some tools write SRATIONAL or DOUBLE). */
  const rationals = (e?: [number, number, number]) => {
    if (!e) return [];
    const [type, count, at] = e;
    const xs: number[] = [];
    for (let i = 0; i < count; i++) {
      const o = t0 + at + i * (TYPE_SIZE[type] ?? 1);
      if (type === 5 || type === 10) {
        const num = type === 5 ? v.getUint32(o, le) : v.getInt32(o, le);
        const den = type === 5 ? v.getUint32(o + 4, le) : v.getInt32(o + 4, le);
        xs.push(den ? num / den : NaN);
      } else if (type === 3) xs.push(v.getUint16(o, le));
      else if (type === 4) xs.push(v.getUint32(o, le));
      else if (type === 11) xs.push(v.getFloat32(o, le));
      else if (type === 12) xs.push(v.getFloat64(o, le));
      else return [];
    }
    return xs;
  };
  const root = ifd(u32(4));
  const meta: PhotoMeta = {};
  const gpsPtr = root.get(0x8825);
  if (gpsPtr) {
    const g = ifd(u32(gpsPtr[2]));
    const dms = (e?: [number, number, number]) => {
      const [d, m, s] = rationals(e);
      return d === undefined ? NaN : d + (m ?? 0) / 60 + (s ?? 0) / 3600;
    };
    const lat = dms(g.get(2)) * (ascii(g.get(1)) === 'S' ? -1 : 1);
    const lng = dms(g.get(4)) * (ascii(g.get(3)) === 'W' ? -1 : 1);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
      meta.lat = lat;
      meta.lng = lng;
      const err = rationals(g.get(31))[0];
      if (Number.isFinite(err)) meta.accuracyM = err;
    }
  }
  const exifPtr = root.get(0x8769);
  const sub = exifPtr ? ifd(u32(exifPtr[2])) : null;
  const when = ascii(sub?.get(0x9003)) || ascii(root.get(0x0132));
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(when);
  if (m) {
    // Camera clocks are local and carry no zone unless OffsetTimeOriginal is set; else assume Costa Rica time.
    const off = /^([+-])(\d{2}):(\d{2})$/.exec(ascii(sub?.get(0x9011)));
    const offH = off ? (off[1] === '-' ? -1 : 1) * (+off[2] + +off[3] / 60) : tzOffsetH;
    const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - offH * 3.6e6;
    if (Number.isFinite(ms)) meta.takenAt = ms;
  }
  return meta;
}
