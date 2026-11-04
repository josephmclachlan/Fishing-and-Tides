import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { SURF_BREAKS } from '../data/surf-breaks';
import { breakFor, estimateHb, surfScoreAt, type SurfHour } from './surf-estimate';
import type { SeaState } from '../adapters/waves';

const sea = (over: Partial<SeaState> = {}): SeaState => ({ hs: 1.5, tm: 10, dir: 60, swellHs: 1.5, swellT: 12, swellDir: 60, swell2Hs: NaN, swell2T: NaN, swell2Dir: NaN, windSeaHs: NaN, windSeaT: NaN, windSeaDir: NaN, kind: 'forecast', ...over });
const salsa = SURF_BREAKS.find((b) => b.id === 'salsa-brava')!;
const hour = (over: Partial<SurfHour> = {}): SurfHour => ({ brk: salsa, sea: sea(), tide: LIMON_HARMONICS, ms: Date.UTC(2026, 10, 4, 15), windMs: 3, windFromDeg: 170, gustMs: 4, rainMmH: 0, squall: 'none', sargKm2: 0, ...over });

describe('breakFor', () => {
  it('matches a break by name, else the nearest within 25 km, else none', () => {
    expect(breakFor('SALSA BRAVA', [0, 0])?.id).toBe('salsa-brava');
    expect(breakFor('CAHUITA', [-82.84, 9.7397])?.id).toBe('playa-negra');
    expect(breakFor('FAR AWAY', [-84.5, 10.5])).toBeNull();
  });
});

describe('estimateHb', () => {
  it('is cut when the swell comes in at an angle to the break', () => {
    expect(estimateHb(salsa, 1.5, 12, 350)).toBeGreaterThan(estimateHb(salsa, 1.5, 12, 60));
    expect(estimateHb(salsa, 1.5, 12, 170)).toBeLessThan(estimateHb(salsa, 1.5, 12, 350));
  });
});

describe('surfScoreAt', () => {
  it('rewards a clean offshore day over an onshore, stormy one', () => {
    const good = surfScoreAt(hour())!;
    expect(good).toBeGreaterThan(5);
    expect(surfScoreAt(hour({ windMs: 9, windFromDeg: 350 }))!).toBeLessThan(good);
    expect(surfScoreAt(hour({ squall: 'high' }))!).toBeCloseTo(good * 0.25, 3);
  });
  it('is null with no wind or no wave data', () => {
    expect(surfScoreAt(hour({ windMs: null }))).toBeNull();
    expect(surfScoreAt(hour({ sea: sea({ hs: NaN, swellHs: NaN, tm: NaN, swellT: NaN, dir: NaN, swellDir: NaN }) }))).toBeNull();
  });
});
