import { describe, expect, it } from 'vitest';
import { FULL_DROP_M_PER_KM, habitatScore, seasonFactor, trapezoid } from './habitat';
import { SPECIES, speciesById } from './species';

const snook = speciesById('snook');
const snapper = speciesById('snapper');
const base = { depthM: 3, mouthKm: 0, reef: 0, slopeMPerKm: 0 };

describe('trapezoid', () => {
  it('rises, holds, falls', () => {
    expect(trapezoid(0, 1, 2, 3, 4)).toBe(0);
    expect(trapezoid(1.5, 1, 2, 3, 4)).toBe(0.5);
    expect(trapezoid(2.5, 1, 2, 3, 4)).toBe(1);
    expect(trapezoid(3.5, 1, 2, 3, 4)).toBe(0.5);
    expect(trapezoid(5, 1, 2, 3, 4)).toBe(0);
  });
});

describe('habitatScore', () => {
  it('is highest at a river mouth for snook and falls with distance', () => {
    const at = habitatScore(snook, base, 8);
    const away = habitatScore(snook, { ...base, mouthKm: 2 }, 8);
    expect(at).toBeGreaterThan(0.7);
    expect(away).toBeLessThan(at / 4);
  });
  it('prefers reef and drop-offs for snapper', () => {
    const reef = habitatScore(snapper, { depthM: 15, mouthKm: 5, reef: 1, slopeMPerKm: FULL_DROP_M_PER_KM }, 0);
    const sand = habitatScore(snapper, { depthM: 15, mouthKm: 5, reef: 0, slopeMPerKm: 0 }, 0);
    expect(reef).toBeGreaterThan(0.85);
    expect(sand).toBeLessThan(0.1); // open bottom keeps a small prior share
  });
  it('is zero outside the depth range', () => {
    expect(habitatScore(snook, { ...base, depthM: 60 }, 0)).toBe(0);
    expect(habitatScore(snapper, { depthM: 1, mouthKm: 0, reef: 1, slopeMPerKm: 99 }, 0)).toBe(0);
  });
  it('stays within 0..1 and the season only nudges it', () => {
    for (const sp of SPECIES)
      for (let m = 0; m < 12; m++) {
        const s = habitatScore(sp, { depthM: 5, mouthKm: 0, reef: 1, slopeMPerKm: 100 }, m);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
        expect(seasonFactor(sp, m)).toBeGreaterThanOrEqual(0.7);
      }
  });
  it('wraps months', () => {
    expect(seasonFactor(snook, 12)).toBe(seasonFactor(snook, 0));
    expect(seasonFactor(snook, -1)).toBe(seasonFactor(snook, 11));
  });
});
