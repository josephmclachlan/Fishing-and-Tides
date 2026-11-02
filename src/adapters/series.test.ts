import { describe, expect, it } from 'vitest';
import { gunzipIfNeeded, loadSeries } from './series';
import { encodeSeries, type SeriesMeta } from './pack';

const meta: Omit<SeriesMeta, 'file'> = {
  feed: 'test', kind: 'forecast', fetchedAt: '2026-11-02T06:00:00Z',
  grid: { cols: 2, rows: 2, lon0: 0, lat0: 1, dlon: 1, dlat: 1 }, times: [0],
  vars: [{ name: 'a', unit: 'm', scale: 0.01, offset: 0 }], sources: [], licence: '',
};
const packed = encodeSeries(meta, { a: [Float32Array.from([1, 2, NaN, 4])] });
const gzip = async (b: Uint8Array<ArrayBuffer>) => new Uint8Array(await new Response(new Blob([b]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());

describe('loadSeries', () => {
  it('loads a gzipped body and a plain one', async () => {
    for (const gz of [true, false]) {
      const files: Record<string, BodyInit> = {
        '/data/forecast/test.json': JSON.stringify({ ...meta, file: 'test.bin', ...(gz ? { encoding: 'gzip' } : {}) }),
        '/data/forecast/test.bin': gz ? await gzip(new Uint8Array(packed.buffer as ArrayBuffer)) : new Uint8Array(packed.buffer as ArrayBuffer),
      };
      const fetch = async (u: RequestInfo | URL) => new Response(files[String(u)]);
      const r = await loadSeries('test', { base: '/', report: false, deps: { fetch: fetch as typeof globalThis.fetch, caches: null } });
      expect(Array.from(r.series.values.a[0])).toEqual([1, 2, NaN, 4]);
      expect(r.fetchedAt).toBe(Date.parse(meta.fetchedAt));
    }
  });
  it('passes through bytes that are not gzip', async () => {
    const b = new Uint8Array([1, 2, 3]).buffer;
    expect(await gunzipIfNeeded(b)).toBe(b);
  });
});
