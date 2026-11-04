import { describe, expect, it } from 'vitest';
import { readExif } from './exif';
import { bestFix, doneWaiting, FIX_TIMEOUT_MS } from './gps';

/** A minimal big- or little-endian JPEG with an EXIF block: IFD0 → GPS IFD and Exif IFD. */
function jpeg(o: { lat?: [number, number, number]; latRef?: string; lng?: [number, number, number]; lngRef?: string; err?: number; when?: string; offset?: string; le?: boolean }) {
  const le = !!o.le;
  const bytes: number[] = [];
  const u16 = (x: number) => (le ? bytes.push(x & 255, x >> 8) : bytes.push(x >> 8, x & 255));
  const u32 = (x: number) => (le ? bytes.push(x & 255, (x >> 8) & 255, (x >> 16) & 255, x >>> 24) : bytes.push(x >>> 24, (x >> 16) & 255, (x >> 8) & 255, x & 255));
  type Entry = { tag: number; type: number; count: number; data: number[] | null; inline?: number };
  const enc = (f: (w: { u16: typeof u16; u32: typeof u32 }) => void) => {
    const save = bytes.length;
    f({ u16, u32 });
    return bytes.splice(save);
  };
  const rat = (xs: number[]) => enc(({ u32 }) => xs.forEach((x) => (u32(Math.round(x * 1000)), u32(1000))));
  const asc = (s: string) => [...s].map((c) => c.charCodeAt(0)).concat(0);
  // Layout: header 8, IFD0 at 8, then GPS IFD, Exif IFD, then data.
  const gps: Entry[] = [];
  if (o.latRef) gps.push({ tag: 1, type: 2, count: 2, data: null, inline: o.latRef.charCodeAt(0) });
  if (o.lat) gps.push({ tag: 2, type: 5, count: 3, data: rat(o.lat) });
  if (o.lngRef) gps.push({ tag: 3, type: 2, count: 2, data: null, inline: o.lngRef.charCodeAt(0) });
  if (o.lng) gps.push({ tag: 4, type: 5, count: 3, data: rat(o.lng) });
  if (o.err !== undefined) gps.push({ tag: 31, type: 5, count: 1, data: rat([o.err]) });
  const ex: Entry[] = [];
  if (o.when) ex.push({ tag: 0x9003, type: 2, count: o.when.length + 1, data: asc(o.when) });
  if (o.offset) ex.push({ tag: 0x9011, type: 2, count: o.offset.length + 1, data: asc(o.offset) });
  const size = (n: number) => 2 + n * 12 + 4;
  const ifd0At = 8, gpsAt = ifd0At + size(2), exAt = gpsAt + size(gps.length);
  let dataAt = exAt + size(ex.length);
  const body: number[] = [];
  const writeIfd = (es: Entry[]) => {
    const out = enc(({ u16, u32 }) => {
      u16(es.length);
      for (const e of es) {
        u16(e.tag), u16(e.type), u32(e.count);
        if (e.data && e.data.length > 4) (u32(dataAt), body.push(...e.data), (dataAt += e.data.length));
        else if (e.data) bytes.push(...e.data, ...Array(4 - e.data.length).fill(0));
        else bytes.push(e.inline!, 0, 0, 0);
      }
      u32(0);
    });
    return out;
  };
  const ifd0 = writeIfd([{ tag: 0x8825, type: 4, count: 1, data: enc(({ u32 }) => u32(gpsAt)) }, { tag: 0x8769, type: 4, count: 1, data: enc(({ u32 }) => u32(exAt)) }]);
  const g = writeIfd(gps);
  const e = writeIfd(ex);
  const tiff = [...(le ? [0x49, 0x49, 42, 0] : [0x4d, 0x4d, 0, 42]), ...enc(({ u32 }) => u32(8)), ...ifd0, ...g, ...e, ...body];
  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xda]).buffer;
}

describe('coral photo EXIF', () => {
  it('reads GPS (south and west negative), accuracy and the time in Costa Rica time', () => {
    const m = readExif(jpeg({ lat: [9, 44, 17.2], latRef: 'N', lng: [82, 49, 1.9], lngRef: 'W', err: 4.5, when: '2026:11:04 09:30:00' }));
    expect(m.lat).toBeCloseTo(9 + 44 / 60 + 17.2 / 3600, 6);
    expect(m.lng).toBeCloseTo(-(82 + 49 / 60 + 1.9 / 3600), 6);
    expect(m.accuracyM).toBeCloseTo(4.5);
    expect(m.takenAt).toBe(Date.UTC(2026, 10, 4, 15, 30));
  });
  it('honours OffsetTimeOriginal and little-endian files', () => {
    const m = readExif(jpeg({ le: true, lat: [9, 30, 0], latRef: 'S', lng: [82, 30, 0], lngRef: 'E', when: '2026:11:04 09:30:00', offset: '+01:00' }));
    expect(m.lat).toBeCloseTo(-9.5, 6);
    expect(m.lng).toBeCloseTo(82.5, 6);
    expect(m.takenAt).toBe(Date.UTC(2026, 10, 4, 8, 30));
  });
  it('gives no position without GPS, and nothing for non-JPEGs or junk', () => {
    expect(readExif(jpeg({ when: '2026:01:02 03:04:05' }))).toEqual({ takenAt: Date.UTC(2026, 0, 2, 9, 4, 5) });
    expect(readExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toEqual({});
    expect(readExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 200, 1, 2]).buffer)).toEqual({});
    expect(readExif(new ArrayBuffer(0))).toEqual({});
  });
});

describe('coral GPS fix', () => {
  const f = (accuracy: number, t: number) => ({ lng: -82.8, lat: 9.7, accuracy, t });
  it('keeps the most accurate fix, newest on a tie, ignoring useless ones', () => {
    expect(bestFix([f(40, 1), f(12, 2), f(30, 3)])?.t).toBe(2);
    expect(bestFix([f(12, 2), f(12, 5)])?.t).toBe(5);
    expect(bestFix([f(900, 1), f(NaN, 2)])).toBeNull();
  });
  it('stops on a good fix or at the timeout', () => {
    expect(doneWaiting(f(14, 0), 0, 1000)).toBe(true);
    expect(doneWaiting(f(30, 0), 0, 1000)).toBe(false);
    expect(doneWaiting(null, 0, FIX_TIMEOUT_MS)).toBe(true);
  });
});
