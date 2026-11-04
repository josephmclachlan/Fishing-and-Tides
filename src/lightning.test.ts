import { describe, expect, it } from 'vitest';
import { countNear, nearestFlash, type Flash } from './lightning';
import { parseLightning, repoSlug, slugFor, lightningUrl } from './adapters/lightning';

const NOW = 1_800_000_000_000;
const flashes: Flash[] = [
  [NOW - 2 * 60000, -82.83, 9.9],   // ~12 km N, 2 min ago
  [NOW - 20 * 60000, -82.83, 9.8],  // close but too old
  [NOW - 1 * 60000, -80, 12],       // far
];

describe('lightning', () => {
  it('finds the nearest recent flash and ignores old ones', () => {
    const n = nearestFlash(flashes, -82.83, 9.79, NOW)!;
    expect(n.km).toBeGreaterThan(10);
    expect(n.km).toBeLessThan(14);
    expect(n.ageMin).toBeCloseTo(2, 5);
    expect(nearestFlash([flashes[1]], -82.83, 9.79, NOW)).toBeNull();
  });
  it('counts flashes within a radius', () => {
    expect(countNear(flashes, -82.83, 9.79, NOW, 25)).toBe(1);
    expect(countNear(flashes, -82.83, 9.79, NOW, 1000)).toBe(2);
    expect(countNear(flashes, -82.83, 9.79, NOW, 25, 30)).toBe(2);
  });
  it('parses the collector file and drops bad rows', () => {
    const d = parseLightning({ fetchedAt: '2026-11-02T12:00:00Z', newestFileAt: '2026-11-02T11:59:40Z', windowMin: 30, flashes: [[1, -83, 10], [1, 'x', 10], [1, 2]] });
    expect(d.flashes).toEqual([[1, -83, 10]]);
    expect(d.fetchedAt).toBe(Date.parse('2026-11-02T12:00:00Z'));
    expect(() => parseLightning({})).toThrow();
  });
  it('derives the repo from the Pages address only', () => {
    expect(repoSlug('josephmclachlan.github.io', '/Fishing-and-Tides/')).toBe('josephmclachlan/Fishing-and-Tides');
    expect(repoSlug('localhost', '/')).toBeNull();
    expect(lightningUrl('a/b')).toBe('https://raw.githubusercontent.com/a/b/data-lightning/lightning.json');
  });
  it('reads the repo from an absolute site base without a page (the Node verify run)', () => {
    expect(slugFor('https://josephmclachlan.github.io/Fishing-and-Tides/', undefined)).toBe('josephmclachlan/Fishing-and-Tides');
    expect(slugFor('/Fishing-and-Tides/', 'https://josephmclachlan.github.io/Fishing-and-Tides/#x')).toBe('josephmclachlan/Fishing-and-Tides');
    expect(slugFor('/Fishing-and-Tides/', undefined)).toBeNull();
    expect(slugFor('/', 'http://localhost:5173/')).toBeNull();
  });
});
