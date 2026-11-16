import { describe, expect, it } from 'vitest';
import { FULL_DROP_M_PER_KM, habitatScore, seasonFactor, trapezoid } from './habitat';
import { SPECIES, speciesById } from './species';

const snook = speciesById('snook');
const snapper = speciesById('snapper');
// On the beach's surf strip, as every river mouth here is (PLAN 7.122 gave snook a surf term).
const base = { depthM: 3, mouthKm: 0, reef: 0, slopeMPerKm: 0, surf: 1 };

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
        // 0 only in a closed season (lobster, PLAN 7.125); otherwise a nudge.
        const f = seasonFactor(sp, m);
        expect(f === 0 || f >= 0.7).toBe(true);
      }
  });
  it('wraps months', () => {
    expect(seasonFactor(snook, 12)).toBe(seasonFactor(snook, 0));
    expect(seasonFactor(snook, -1)).toBe(seasonFactor(snook, 11));
  });
});

describe('sand, seagrass and surf terms (PLAN 7.122)', () => {
  it('puts pompano in the surf strip and bonefish on sand and seagrass, not on reef', () => {
    const pompano = speciesById('pompano'), bonefish = speciesById('bonefish');
    const reef = { depthM: 1.5, mouthKm: 5, reef: 1, slopeMPerKm: 0 };
    expect(habitatScore(pompano, { ...reef, reef: 0, surf: 1, sand: 0.4 }, 0)).toBeGreaterThan(0.8);
    expect(habitatScore(pompano, reef, 0)).toBeLessThan(0.1);
    expect(habitatScore(bonefish, { ...reef, reef: 0, sand: 0.4, grass: 0.1 }, 0)).toBeGreaterThan(0.75);
    expect(habitatScore(bonefish, reef, 0)).toBeLessThan(0.1);
  });
  it('leaves species without the new terms unchanged by them', () => {
    const f = { depthM: 15, mouthKm: 5, reef: 0.5, slopeMPerKm: 20 };
    expect(habitatScore(snapper, { ...f, sand: 1, grass: 1, surf: 1 }, 0)).toBe(habitatScore(snapper, f, 0));
  });
});
