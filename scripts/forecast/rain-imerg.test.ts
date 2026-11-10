import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PLUME_RIVERS } from '../../src/region.ts';
import { subsetOf, type RainImerg } from '../../src/adapters/imerg-parse.ts';
import { buildRainImerg } from './rain-imerg.ts';

const H = 3.6e6;
const now = Date.UTC(2026, 10, 10, 18, 10);
const b = subsetOf(PLUME_RIVERS);
const nLon = b.i1 - b.i0 + 1, nLat = b.j1 - b.j0 + 1;
const name = (ms: number) => {
  const d = new Date(ms).toISOString();
  const end = new Date(ms + 1799e3).toISOString();
  const min = String(new Date(ms).getUTCHours() * 60 + new Date(ms).getUTCMinutes()).padStart(4, '0');
  return `3B-HHR-E.MS.MRG.3IMERG.${d.slice(0, 10).replace(/-/g, '')}-S${d.slice(11, 19).replace(/:/g, '')}-E${end.slice(11, 19).replace(/:/g, '')}.${min}.V07C.HDF5`;
};
/** GES DISC with every half hour up to 5 h ago, raining `rate` mm/h everywhere. */
function fakeGesdisc(rate = 2, at = now) {
  const asked: string[] = [];
  const latest = Math.floor((at - 5 * H) / 1800e3) * 1800e3;
  return {
    asked,
    async text(url: string) {
      asked.push(url);
      const m = url.match(/\/data\/GPM_L3\/GPM_3IMERGHHE\.07\/(\d{4})\/(\d{3})\/$/);
      if (m) {
        const day0 = Date.UTC(+m[1], 0, 1) + (+m[2] - 1) * 864e5;
        const files = [...Array(48)].map((_, k) => day0 + k * 1800e3).filter((t) => t <= latest).map(name);
        if (!files.length) throw new Error('404');
        return files.map((f) => `<a href="${f}">${f}</a>`).join('\n');
      }
      const row = Array(nLat).fill(rate).join(', ');
      return ['Dataset: x', ...[...Array(nLon)].map((_, i) => `precipitation[0][${i}], ${row}`)].join('\n');
    },
  };
}

let dir = '';
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

describe('buildRainImerg', () => {
  it('reads 8 days of half hours and averages each catchment', async () => {
    dir = mkdtempSync(join(tmpdir(), 'imerg-'));
    const g = fakeGesdisc();
    const msg = await buildRainImerg(dir, now, g, null);
    const f = JSON.parse(readFileSync(join(dir, 'rain-imerg.json'), 'utf8')) as RainImerg;
    expect(f.times[0]).toBe(Date.UTC(2026, 10, 3));
    expect(f.times.at(-1)).toBe(Date.UTC(2026, 10, 10, 13, 0));
    expect(f.times.length).toBe(7 * 48 + 27);
    expect(f.byRiver['RÍO SIXAOLA'].every((x) => x === 2)).toBe(true);
    expect(f.cells).toEqual({ 'RÍO SIXAOLA': 28, 'RÍO ESTRELLA': 8, 'RÍO BANANO': 2, 'RÍO BANANITO': 1 });
    expect(msg).toMatch(/363 new/);
    expect(g.asked.find((u) => u.includes('/opendap/'))).toMatch(/\.HDF5\.ascii\?precipitation%5B0%5D%5B967%3A973%5D%5B992%3A999%5D$/);
  });

  it('reads only the half hours the published copy lacks', async () => {
    dir = mkdtempSync(join(tmpdir(), 'imerg-'));
    await buildRainImerg(dir, now - H, fakeGesdisc(1, now - H), null);
    const prev = JSON.parse(readFileSync(join(dir, 'rain-imerg.json'), 'utf8')) as RainImerg;
    const g = fakeGesdisc(3);
    expect(await buildRainImerg(dir, now, g, prev)).toMatch(/ 2 new/);
    const f = JSON.parse(readFileSync(join(dir, 'rain-imerg.json'), 'utf8')) as RainImerg;
    expect(f.byRiver['RÍO BANANO'].slice(-3)).toEqual([1, 3, 3]);
  });

  it('reads the newest first and leaves the rest for later runs when out of time', async () => {
    dir = mkdtempSync(join(tmpdir(), 'imerg-'));
    const msg = await buildRainImerg(dir, now, fakeGesdisc(), null, 0);
    const f = JSON.parse(readFileSync(join(dir, 'rain-imerg.json'), 'utf8')) as RainImerg;
    // With no time left, only the first (the login) read: the newest half hour.
    expect(f.times).toEqual([Date.UTC(2026, 10, 10, 13, 0)]);
    expect(msg).toMatch(/1 new, 362 left for the next runs/);
  });

  it('stops when no half hour can be read', async () => {
    dir = mkdtempSync(join(tmpdir(), 'imerg-'));
    const g = fakeGesdisc();
    const broken = { text: (u: string) => (u.includes('/opendap/') ? Promise.reject(new Error('500 from x')) : g.text(u)) };
    await expect(buildRainImerg(dir, now, broken, null)).rejects.toThrow(/none of/);
  });
});
