import { describe, expect, it } from 'vitest';
import { loadSummary, mapAssets, marked, saveSummary, styleFonts, syncForTrip, TRIP_CACHE, type SyncProgress } from './sync';
import { countRange, tilesIn } from './tiles';
import { REGION } from '../region';

const STYLE = {
  sources: {
    ne2_shaded: { type: 'raster', maxzoom: 6, tiles: ['https://t/ne2/{z}/{x}/{y}.png'] },
    openmaptiles: { type: 'vector', url: 'https://t/planet' },
  },
  sprite: 'https://t/sprites/ofm',
  glyphs: 'https://t/fonts/{fontstack}/{range}.pbf',
  layers: [{ layout: { 'text-font': ['Noto Sans Regular'] } }, { layout: {} }, { layout: { 'text-font': ['Noto Sans Regular'] } }],
};
const TILEJSON = { tiles: ['https://t/planet/20261025_pt/{z}/{x}/{y}.pbf'] };

function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    const m = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, m);
    return { put: async (k: string, r: Response) => void m.set(k, r), match: async (k: string) => m.get(k)?.clone() };
  };
  return { caches: { open, match: async () => undefined } as unknown as CacheStorage, stores };
}

function fakeFetch(fail: (u: string) => boolean = () => false) {
  const seen: string[] = [];
  const f = (async (input: RequestInfo | URL) => {
    const u = String(input);
    seen.push(u);
    if (fail(u)) return new Response('', { status: 500 });
    const plain = u.replace(/[?&]ftsync=1$/, '');
    if (plain === 'https://s/style') return Response.json(STYLE);
    if (plain === 'https://t/planet') return Response.json(TILEJSON);
    return new Response(new Uint8Array(10), { headers: { 'content-type': 'x/test', vary: 'Origin' } });
  }) as typeof fetch;
  return { f, seen };
}

const z0 = [tilesIn(REGION.bounds, 0), tilesIn(REGION.bounds, 8)];

describe('map assets', () => {
  it('lists the TileJSON, sprites at both densities and every glyph range of each font once', () => {
    expect(styleFonts(STYLE)).toEqual(['Noto Sans Regular']);
    const { files, templates } = mapAssets(STYLE, { openmaptiles: TILEJSON }, ['Noto Sans Regular']);
    expect(files).toContain('https://t/planet');
    expect(files).toContain('https://t/sprites/ofm@2x.png');
    expect(files).toContain('https://t/fonts/Noto%20Sans%20Regular/0-255.pbf');
    expect(files.filter((f) => f.includes('/fonts/')).length).toBe(6);
    expect(templates).toEqual([
      { template: 'https://t/ne2/{z}/{x}/{y}.png', maxZ: 6 },
      { template: TILEJSON.tiles[0], maxZ: 14 },
    ]);
  });
  it('marks sync requests', () => {
    expect(marked('https://a/b')).toBe('https://a/b?ftsync=1');
    expect(marked('https://a/b?x=1')).toBe('https://a/b?x=1&ftsync=1');
  });
});

describe('syncForTrip', () => {
  it('stores the map under stable keys, runs the feeds and reports progress to the end', async () => {
    const { caches, stores } = fakeCaches();
    const { f, seen } = fakeFetch();
    const ran: string[] = [];
    const progress: SyncProgress[] = [];
    const s = await syncForTrip({
      styleUrl: 'https://s/style', base: '/', plan: z0,
      jobs: [{ name: 'wind', run: async () => ran.push('wind') }, { name: 'waves', run: async () => { throw new Error('down'); } }],
      onProgress: (p) => progress.push(p),
      deps: { caches, fetch: f, now: () => 42, swReady: async () => false },
    });
    const trip = stores.get(TRIP_CACHE)!;
    // Raster stops at z6, vector goes on: z0 from both sources, z8 from the vector one only.
    expect(s.tiles).toBe(2 + countRange(z0[1]));
    expect(trip.has('https://t/planet/v/0/0/0.pbf')).toBe(true);
    expect(trip.has('https://t/ne2/0/0/0.png')).toBe(true);
    expect(trip.has('https://s/style')).toBe(true);
    expect(seen.every((u) => u.endsWith('ftsync=1'))).toBe(true);
    const tile = trip.get('https://t/planet/v/0/0/0.pbf')!;
    expect(tile.headers.get('vary')).toBeNull();
    expect(tile.headers.get('content-type')).toBe('x/test');
    expect(ran).toEqual(['wind']);
    expect(s).toMatchObject({ at: 42, failed: 0, feeds: 2, feedsFailed: ['waves'], staticOk: null });
    expect(s.bytes).toBeGreaterThan(0);
    const last = progress.at(-1)!;
    expect(last.done).toBe(last.total);
    expect(progress.every((p, i) => i === 0 || p.done >= progress[i - 1].done)).toBe(true);
  });

  it('retries once and counts what still fails', async () => {
    const { caches } = fakeCaches();
    const { f, seen } = fakeFetch((u) => u.includes('@2x.png'));
    const s = await syncForTrip({ styleUrl: 'https://s/style', base: '/', plan: z0, jobs: [], deps: { caches, fetch: f, now: () => 1, swReady: async () => false } });
    expect(s.failed).toBe(1);
    expect(seen.filter((u) => u.includes('@2x.png')).length).toBe(2);
  });

  it('stops when cancelled', async () => {
    const { caches } = fakeCaches();
    const { f } = fakeFetch();
    const ctl = new AbortController();
    const p = syncForTrip({ styleUrl: 'https://s/style', base: '/', plan: z0, jobs: [], signal: ctl.signal, onProgress: (x) => x.done > 3 && ctl.abort(), deps: { caches, fetch: f, swReady: async () => false } });
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('fails clearly without the style', async () => {
    const { caches } = fakeCaches();
    const { f } = fakeFetch(() => true);
    await expect(syncForTrip({ styleUrl: 'https://s/style', base: '/', plan: z0, jobs: [], deps: { caches, fetch: f, swReady: async () => false } })).rejects.toThrow('style');
  });
});

describe('summary', () => {
  it('round-trips and ignores junk', () => {
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(loadSummary(st)).toBeNull();
    const s = { at: 5, tiles: 1, failed: 0, bytes: 9, feedsFailed: [], feeds: 3, staticOk: true, persisted: true };
    saveSummary(st, s);
    expect(loadSummary(st)).toEqual(s);
    m.set('ft.sync', '{oops');
    expect(loadSummary(st)).toBeNull();
  });
});
