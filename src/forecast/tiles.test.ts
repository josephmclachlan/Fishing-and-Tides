import { describe, expect, it } from 'vitest';
import { drawTile, reefAt, tipBand } from './tiles';
import type { TileKind, TileViz } from './view';
import { recCtx } from './testkit';

const KINDS: TileKind[] = ['weather', 'swell', 'wind', 'tide', 'window', 'water', 'uv', 'rain', 'catch', 'moon', 'rip', 'breaker', 'feels', 'chop', 'current', 'reef', 'stingers', 'surge', 'gust', 'boat', 'squall', 'sea'];
const P = { I: '#000', A: '#f00', B: '#eee', sand: [200, 180, 140] as const, reduced: false, words: { period: 'Period', from: 'From' } };

describe('conditions tile pictures (PLAN 7.69)', () => {
  it('draws every kind at any value, and with nothing, without a NaN', () => {
    const series = Array.from({ length: 24 }, (_, i) => 0.2 * Math.sin(i / 2));
    const vizes: TileViz[] = [
      {},
      { v: null, deg: null, series: [], sky: null },
      ...[0, 0.3, 1, 3, 12, 40, 100].map((v) => ({ v, deg: v * 3.6, period: 9, sky: 'showers' as const, rainPct: v, from: 6, to: 9.5, waxing: v > 1, series, mean: series, at: 13.5, turnAt: 17.2, turnHigh: true, count: 3 })),
    ];
    for (const k of KINDS)
      for (const z of vizes)
        for (const t of [0, 3.2, 61]) {
          const c = recCtx();
          drawTile(k, c, 160, 90, t, z, P);
          drawTile(k, c, 160, 90, t, z, { ...P, reduced: true });
          drawTile(k, c, 160, 90, t, z, { ...P, glow: true });
        }
  });
  it('draws every line with square ends, never round ones (PLAN 13.6)', () => {
    const series = Array.from({ length: 24 }, (_, i) => 0.2 * Math.sin(i / 2));
    const z: TileViz = { v: 1, deg: 90, period: 9, sky: 'storm', rainPct: 60, from: 6, to: 9, series, mean: series, at: 13, turnAt: 17, turnHigh: true, count: 3, rel: 20 };
    for (const k of [...KINDS, 'push' as const]) {
      const c = recCtx();
      const caps: string[] = [];
      const real = c as unknown as Record<string, unknown>;
      const spy = new Proxy(real, { set(t, key: string, v) { if (key === 'lineCap' || key === 'lineJoin') caps.push(String(v)); t[key] = v; return true; } });
      drawTile(k, spy as unknown as typeof c, 160, 90, 2.3, z, P);
      expect(caps.filter((x) => x === 'round'), k).toEqual([]);
    }
  });
  it('draws nothing into a box too small to hold it', () => {
    const c = recCtx();
    drawTile('swell', c, 2, 2, 0, { v: 1 }, P);
    expect(c.calls).toEqual(['clearRect']);
  });
  it('shares one smooth reef profile with the hero, inside 0..1', () => {
    for (let u = 0; u <= 1; u += 0.01) {
      expect(reefAt(u)).toBeGreaterThan(0);
      expect(reefAt(u)).toBeLessThan(1.1);
    }
  });
  it('picks tips on the page\'s own bands', () => {
    expect(tipBand('uv', 11)).toBe('extreme');
    expect(tipBand('uv', 8)).toBe('vhigh');
    expect(tipBand('uv', 2)).toBe('low');
    expect(tipBand('feels', 40)).toBe('danger');
    expect(tipBand('feels', 33)).toBe('hot');
    expect(tipBand('water', 29)).toBe('bath');
    expect(tipBand('water', 23)).toBe('cool');
    expect(tipBand('breaker', 1.5)).toBe('dump');
    expect(tipBand('rainpct', 85)).toBe('wet');
    expect(tipBand('humidity', 85)).toBe('muggy');
    expect(tipBand('uv', null)).toBeNull();
  });
});
