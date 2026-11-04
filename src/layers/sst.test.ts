import { describe, expect, it } from 'vitest';
import { SST_BANDS, isotherms, sstImage, sstTone } from './sst';
import type { GridSeries } from '../adapters/pack';

const series = (z: number[], cols: number, rows: number): GridSeries => ({
  meta: { feed: 'sst', kind: 'observed', fetchedAt: '', grid: { cols, rows, lon0: -83, lat0: 10, dlon: 0.01, dlat: 0.01 }, times: [0], vars: [], sources: [], licence: '', file: '' },
  values: { sst: [Float32Array.from(z)] },
});

describe('sstTone', () => {
  it('bands green, amber, red at the cool and warm edges', () => {
    expect(sstTone(SST_BANDS.COOL - 0.01)?.tone).toBe('green');
    expect(sstTone(SST_BANDS.COOL)?.tone).toBe('amber');
    expect(sstTone(SST_BANDS.WARM - 0.01)?.tone).toBe('amber');
    expect(sstTone(SST_BANDS.WARM)?.tone).toBe('red');
  });
  it('shades warmer water stronger within a band, so a half-degree spread still shows', () => {
    const a = sstTone(28.6)!, b = sstTone(29.1)!;
    expect(a.tone).toBe(b.tone);
    expect(b.alpha - a.alpha).toBeGreaterThan(0.03);
  });
  it('stays visible and bounded at the extremes, and skips no-data', () => {
    for (const c of [15, 24, 28, 31, 40]) {
      const t = sstTone(c)!;
      expect(t.alpha).toBeGreaterThanOrEqual(0.07);
      expect(t.alpha).toBeLessThanOrEqual(0.24);
    }
    expect(sstTone(NaN)).toBeNull();
  });
});

describe('sstImage', () => {
  it('colours sea cells, leaves land clear and puts the corners half a cell out', () => {
    const img = sstImage(series([28, NaN, 30, 26], 2, 2), { green: [0, 255, 0], amber: [255, 176, 0], red: [255, 0, 0] });
    expect([img.width, img.height]).toEqual([2, 2]);
    expect([...img.px.slice(0, 3)]).toEqual([255, 176, 0]);
    expect(img.px[7]).toBe(0);
    expect([...img.px.slice(8, 11)]).toEqual([255, 0, 0]);
    expect([...img.px.slice(12, 15)]).toEqual([0, 255, 0]);
    expect(img.coordinates[0][0]).toBeCloseTo(-83.005);
    expect(img.coordinates[0][1]).toBeCloseTo(10.005);
    expect(img.coordinates[2][0]).toBeCloseTo(-82.985);
    expect(img.coordinates[2][1]).toBeCloseTo(9.985);
  });
  it('leaves cells inside the hole clear', () => {
    const c = { green: [0, 255, 0], amber: [255, 176, 0], red: [255, 0, 0] } as const;
    const img = sstImage(series([28, 28, 28, 28], 2, 2), c, [[-83.005, 10.005], [-82.995, 10.005], [-82.995, 9.995], [-83.005, 9.995]]);
    expect(img.px[3]).toBe(0);
    expect(img.px[7]).toBeGreaterThan(0);
    expect(img.px[15]).toBeGreaterThan(0);
  });
});

describe('isotherms', () => {
  it('draws nothing for flat water (why the fill exists)', () => {
    expect(isotherms(series(new Array(36).fill(28.8), 6, 6), 0.25, 'coast')).toEqual([]);
  });
});
