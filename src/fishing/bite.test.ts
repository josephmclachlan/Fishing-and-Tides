import { describe, expect, it } from 'vitest';
import { LIMON_HARMONICS } from '../data/tides-limon';
import { bestWindows, bite, lightTerm, weatherTerms, solunarTerm } from './bite';
import { daySky, localDayStart } from '../physics/astro';

const base = { lat: 9.99, lng: -83.03, tide: LIMON_HARMONICS, tzOffsetH: -6 };
const day = localDayStart(Date.UTC(2026, 10, 2, 18), -6);

describe('bite', () => {
  it('light: dawn beats midday', () => {
    expect(lightTerm(0, true).term).toBeGreaterThan(lightTerm(60, true).term);
    expect(lightTerm(-30, true).why).toBe('night');
  });
  it('weather: rough and windy water lowers the multiplier', () => {
    expect(weatherTerms(3, 0.5, false).weather).toBe(1);
    expect(weatherTerms(14, 3.5, true).weather).toBeLessThan(0.7);
    expect(weatherTerms(null, null, false).calm).toBe(1);
  });
  it('solunar: inside a major window beats outside', () => {
    const sky = daySky(day, base.lat, base.lng);
    const major = sky.windows.find((w) => w.kind === 'major')!;
    const outside = sky.windows.reduce((m, w) => Math.max(m, w.end), 0) + 3 * 3.6e6;
    expect(solunarTerm(sky, major.centre).kind).toBe('major');
    expect(solunarTerm(sky, major.centre).term).toBeGreaterThan(solunarTerm(sky, outside).term);
  });
  it('habitat scales the score and stays 0..100', () => {
    const t = day + 11 * 3.6e6;
    const hi = bite({ ...base, tMs: t, habitat: 1 }).bite;
    const lo = bite({ ...base, tMs: t, habitat: 0 }).bite;
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeLessThanOrEqual(100);
    expect(lo).toBeGreaterThan(0);
  });
  it('bad weather lowers the score at the same moment', () => {
    const t = day + 11 * 3.6e6;
    expect(bite({ ...base, tMs: t, windMs: 14, hsM: 3 }).bite).toBeLessThan(bite({ ...base, tMs: t, windMs: 3, hsM: 0.5 }).bite);
  });
  it('best windows are ordered, within the day, at most n', () => {
    const { series, windows } = bestWindows(base, day, 3);
    expect(series).toHaveLength(144);
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.length).toBeLessThanOrEqual(3);
    for (let k = 1; k < windows.length; k++) expect(windows[k].start).toBeGreaterThan(windows[k - 1].start);
    const max = Math.max(...series.map((s) => s.bite));
    expect(Math.max(...windows.map((w) => w.peak))).toBe(max);
  });
});
