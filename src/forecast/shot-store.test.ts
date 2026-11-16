import { describe, expect, it } from 'vitest';
import { cacheShotStore, parseShot } from './shot-store';

/** A Cache Storage stand-in: one cache, keyed by URL. */
function fakeCaches(): CacheStorage {
  const m = new Map<string, Response>();
  const cache = {
    keys: async () => [...m.keys()].map((u) => new Request(u)),
    match: async (r: Request) => m.get(r.url)?.clone(),
    put: async (r: Request, res: Response) => void m.set(r.url, res),
  };
  return { open: async () => cache } as unknown as CacheStorage;
}

describe('live-map card pictures', () => {
  const shot = { p: { url: 'data:image/jpeg;base64,AAAA', x: 0.5, y: 0.5, mPerPx: 12.5 }, at: 1_763_000_000_000 };
  it('keeps a picture between visits, per spot and scheme', async () => {
    const caches = fakeCaches();
    cacheShotStore(caches).save('dark|PUNTA UVA', shot);
    await new Promise((r) => setTimeout(r, 0));
    const kept = await cacheShotStore(caches).load();
    expect([...kept.keys()]).toEqual(['dark|PUNTA UVA']);
    expect(kept.get('dark|PUNTA UVA')).toEqual(shot);
  });
  it('drops anything that is not a picture with numbers', () => {
    expect(parseShot(shot)).toEqual(shot);
    expect(parseShot({ ...shot, p: { ...shot.p, url: 'javascript:alert(1)' } })).toBeNull();
    expect(parseShot({ ...shot, at: 'x' })).toBeNull();
    expect(parseShot(null)).toBeNull();
  });
  it('keeps nothing without Cache Storage', async () => {
    const s = cacheShotStore(undefined);
    s.save('k', shot);
    expect((await s.load()).size).toBe(0);
  });
});
