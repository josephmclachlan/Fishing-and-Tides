import { describe, expect, it } from 'vitest';
import { tideFactor, cleanFactor, windTrend, sizeFactor, surfBand, surfQuality, windFactor, windowFactor, type SurfInput } from './surf-quality';

const reef: SurfInput['brk'] = { type: 'reef', facing: 350, swellFrom: [45, 135] };
const base: SurfInput = { brk: reef, Hb: 1.8, Tp: 13, swellFromDeg: 60, windMs: 3, windFromDeg: 170 };

describe('surf quality', () => {
  it('a clean, overhead groundswell with light offshore wind at a reef is EPIC', () => {
    const q = surfQuality(base);
    expect(q.band).toBe('EPIC');
    expect(q.windKind).toBe('offshore');
  });

  it('onshore wind chops it down', () => {
    const on = surfQuality({ ...base, windMs: 8, windFromDeg: 350 });
    expect(on.windKind).toBe('onshore');
    expect(on.score).toBeLessThan(surfQuality(base).score * 0.5);
  });

  it('tiny surf is FLAT, short-period wind swell is worse than groundswell', () => {
    expect(surfQuality({ ...base, Hb: 0.2 }).band).toBe('FLAT');
    expect(surfQuality({ ...base, Tp: 6 }).score).toBeLessThan(surfQuality(base).score);
  });

  it('size ranges differ by break type: a 2.5 m beach break is closing out, a reef is not', () => {
    expect(sizeFactor('beach', 2.5)).toBeLessThan(0.3);
    expect(sizeFactor('reef', 2.5)).toBe(1);
    expect(sizeFactor('beach', 0.3)).toBe(0);
    expect(sizeFactor('beach', 1.2)).toBe(1);
  });

  it('swell window: full inside, eased outside, wrapping through north', () => {
    expect(windowFactor(reef, 90)).toBe(1);
    expect(windowFactor(reef, 15)).toBeCloseTo(0.4, 9);
    expect(windowFactor(reef, 30)).toBeGreaterThan(0.4);
    // Without a window: ±60° of the facing (350°), so 20° is inside.
    expect(windowFactor({ type: 'beach', facing: 350 }, 20)).toBe(1);
    expect(windowFactor({ type: 'beach', facing: 350 }, 120)).toBeCloseTo(0.4, 9);
  });

  it('wind kinds', () => {
    expect(windFactor(0, 1, 0).kind).toBe('calm');
    expect(windFactor(0, 6, 180).kind).toBe('offshore');
    expect(windFactor(0, 6, 0).kind).toBe('onshore');
    expect(windFactor(0, 6, 90).kind).toBe('cross');
    expect(windFactor(0, 14, 180).f).toBeLessThan(windFactor(0, 6, 180).f);
  });

  it('bands', () => {
    expect([surfBand(2, 1), surfBand(4, 1), surfBand(8, 1), surfBand(9, 1)]).toEqual(['POOR', 'FAIR', 'GOOD', 'EPIC']);
  });

  it('wind-sea and a crossing second swell take points off; an aligned one does not', () => {
    const main = { Hs: 1.5, Tp: 12, fromDeg: 60 };
    expect(cleanFactor(main)).toBe(1);
    expect(cleanFactor(main, null, 1.5)).toBeLessThan(0.7);
    expect(cleanFactor(main, { Hs: 1.2, Tp: 8, fromDeg: 150 })).toBeLessThan(0.85);
    expect(cleanFactor(main, { Hs: 1.2, Tp: 8, fromDeg: 65 })).toBeCloseTo(1, 5);
    const q = surfQuality({ ...base, swellHs: 1.5, windSeaHs: 1.5 });
    expect(q.factors.clean).toBeLessThan(0.7);
    expect(q.score).toBeLessThan(surfQuality(base).score);
  });

  it('gusts over the mean cost points, calm air ignores them', () => {
    expect(windFactor(350, 5, 170, 12).f).toBeLessThan(windFactor(350, 5, 170, 6).f);
    expect(windFactor(350, 1, 170, 12).f).toBe(1);
  });

  it('wind trend: offshore turning onshore, and onshore easing off', () => {
    const off = { speedMs: 4, fromDeg: 170 };
    const on = { speedMs: 7, fromDeg: 350 };
    expect(windTrend(350, off, on)).toBe('turnsOnshore');
    expect(windTrend(350, on, off)).toBe('cleaning');
    expect(windTrend(350, off, off)).toBe('steady');
    expect(windTrend(350, off, null)).toBe('steady');
  });

  it('tide is a soft nudge: reefs want high water, beaches the middle, and no preference means no effect', () => {
    expect(tideFactor('high', 0)).toBeCloseTo(0.88, 5);
    expect(tideFactor('high', 0.8)).toBe(1);
    expect(tideFactor('mid', 0.5)).toBe(1);
    expect(tideFactor('mid', 0)).toBeCloseTo(0.88, 5);
    expect(tideFactor('mid', 1)).toBeCloseTo(0.88, 5);
    expect(tideFactor('any', 0)).toBe(1);
    expect(tideFactor(undefined, 0)).toBe(1);
    const lo = surfQuality({ ...base, brk: { ...reef, tidePref: 'high' }, tide: { level: 0, rising: true } });
    expect(lo.tideKind).toBe('low');
    expect(lo.score).toBeLessThan(surfQuality(base).score);
  });
});
