import { describe, expect, it } from 'vitest';
import { chlFit, riverTerm, softFit, waterTerm } from './water';
import { speciesById } from './species';
import { bite } from './bite';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { localDayStart } from '../physics/astro';

const snook = speciesById('snook');
const barracuda = speciesById('barracuda');

describe('water term (PLAN 7.11)', () => {
  it('soft fit: 1 in the ideal range, floor beyond the limits, linear between', () => {
    const r = [1, 2, 4, 6] as const;
    expect(softFit(3, r, 0.3)).toBe(1);
    expect(softFit(2, r, 0.3)).toBe(1);
    expect(softFit(0.5, r, 0.3)).toBe(0.3);
    expect(softFit(10, r, 0.3)).toBe(0.3);
    expect(softFit(5, r, 0.3)).toBeCloseTo(0.65);
  });
  it('chlorophyll: blue desert low, productive water best, plumes ease off', () => {
    expect(chlFit(0.05)).toBeCloseTo(0.7);
    expect(chlFit(1)).toBe(1);
    expect(chlFit(20)).toBeCloseTo(0.85);
  });
  it('stained water suits snook, clear water suits barracuda', () => {
    const stained = { visM: 1.5 }, clear = { visM: 12 };
    expect(waterTerm(snook, stained).factor).toBeGreaterThan(waterTerm(snook, clear).factor);
    expect(waterTerm(barracuda, clear).factor).toBeGreaterThan(waterTerm(barracuda, stained).factor);
    expect(waterTerm(snook, clear).reasons).toContain('clearwater');
    expect(waterTerm(barracuda, stained).reasons).toContain('murky');
    expect(waterTerm(snook, stained).reasons).toContain('goodwater');
  });
  it('unknown water is neutral; sargassum always counts', () => {
    expect(waterTerm(snook, {})).toEqual({ water: null, factor: 1, reasons: [] });
    const t = waterTerm(snook, { sarg: 'HIGH' });
    expect(t.factor).toBeCloseTo(0.6);
    expect(t.reasons[0]).toBe('sargassum');
    expect(waterTerm(snook, { sarg: 'LOW' }).factor).toBe(1);
  });
  it('factor stays in 0.36..1', () => {
    const worst = waterTerm(barracuda, { visM: 0.1, sstC: 10, chl: 0.01, sarg: 'HIGH' });
    expect(worst.factor).toBeGreaterThanOrEqual(0.36 - 1e-9);
    const best = waterTerm(snook, { visM: 1, sstC: 28, chl: 1 });
    expect(best.factor).toBe(1);
  });
  it('lowers BITE and names the reason', () => {
    const t = localDayStart(Date.UTC(2026, 10, 2, 18), -6) + 11 * 3.6e6;
    const base = { lat: 9.99, lng: -83.03, tide: LIMON_HARMONICS, tzOffsetH: -6, tMs: t };
    const good = bite({ ...base, water: waterTerm(barracuda, { visM: 12 }) });
    const bad = bite({ ...base, water: waterTerm(barracuda, { visM: 0.5 }) });
    expect(bad.bite).toBeLessThan(good.bite);
    expect(bad.reasons).toContain('murky');
  });
});

describe('river flow term (PLAN 7.15)', () => {
  const tarpon = speciesById('tarpon');
  const snapper = speciesById('snapper');
  it('a running river lifts mouth hunters near the mouth only', () => {
    expect(riverTerm(tarpon, { km: 0.2, ratio: 2 }).why).toBe('riverup');
    expect(riverTerm(tarpon, { km: 0.2, ratio: 2 }).factor).toBeGreaterThan(1.09);
    expect(riverTerm(tarpon, { km: 20, ratio: 2 })).toEqual({ factor: 1, why: null });
    expect(riverTerm(snapper, { km: 0.2, ratio: 2 })).toEqual({ factor: 1, why: null });
  });
  it('a flood cuts everyone, a low river trims mouth hunters', () => {
    expect(riverTerm(snapper, { km: 0.2, ratio: 8 }).why).toBe('flood');
    expect(riverTerm(snapper, { km: 0.2, ratio: 8 }).factor).toBeLessThan(0.87);
    expect(riverTerm(tarpon, { km: 0.2, ratio: 0.3 }).why).toBe('riverlow');
    expect(riverTerm(tarpon, null)).toEqual({ factor: 1, why: null });
  });
  it('flows into the water term', () => {
    const t = waterTerm(tarpon, { river: { km: 0.1, ratio: 3 } });
    expect(t.factor).toBeGreaterThan(1);
    expect(t.reasons).toContain('riverup');
  });
});
