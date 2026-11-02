import { describe, expect, it } from 'vitest';
import { REGION, SPOTS } from '../region';
import { MAJOR_HALF_MS, MINOR_HALF_MS, daySky, localDayStart, moonPhase, moonTimes, solunarRating, solunarWindows, sunTimes } from './astro';

/**
 * Ground truth from PyEphem 4.1 (same lat/lng, local-midnight day starts, sun at -0:34 horizon and
 * moon at +0:07.5 with use_center) for Limón. Epoch ms.
 */
const [LNG, LAT] = SPOTS[0].lngLat;
interface Day { start: number; sunrise: number; sunset: number; solarNoon: number; moonrise: number; moonset: number; transit: number; underfoot: number }
const DAYS: Record<string, Day> = {
  '2024-01-01': { start: 1704088800000, sunrise: 1704109805062, sunset: 1704151259260, solarNoon: 1704130531208, moonrise: 1704168807773, moonset: 1704124582525, transit: 1704102240158, underfoot: 1704146637068 },
  '2024-03-20': { start: 1710914400000, sunrise: 1710934621037, sunset: 1710978107312, solarNoon: 1710956359976, moonrise: 1710966656455, moonset: 1710923558800, transit: 1710989648975, underfoot: 1710945068700 },
  '2024-06-20': { start: 1718863200000, sunrise: 1718882025777, sunset: 1718927636176, solarNoon: 1718904830966, moonrise: 1718924320279, moonset: 1718876305639, transit: 1718945174364, underfoot: 1718900266542 },
  '2024-12-21': { start: 1734760800000, sunrise: 1734781524013, sunset: 1734822935991, solarNoon: 1734802229975, moonrise: 1734843870715, moonset: 1734799388545, transit: 1734777164123, underfoot: 1734821569721 },
  '2025-02-14': { start: 1739512800000, sunrise: 1739533983694, sunset: 1739576367234, solarNoon: 1739555171797, moonrise: 1739583303319, moonset: 1739538702375, transit: 1739516523147, underfoot: 1739560940830 },
};
const SUN_TOL = 90e3;
const MOON_TOL = 5 * 60e3;

describe('local day', () => {
  it('finds local midnight for UTC-6', () => {
    expect(localDayStart(1704130531208, REGION.tzOffsetH)).toBe(DAYS['2024-01-01'].start);
    expect(localDayStart(DAYS['2024-01-01'].start, REGION.tzOffsetH)).toBe(DAYS['2024-01-01'].start);
    expect(localDayStart(DAYS['2024-01-01'].start - 1, REGION.tzOffsetH)).toBe(DAYS['2024-01-01'].start - 86400000);
  });
});

describe('sun times match PyEphem', () => {
  for (const [name, d] of Object.entries(DAYS)) {
    it(name, () => {
      const s = sunTimes(d.start, LAT, LNG);
      expect(Math.abs(s.sunrise! - d.sunrise)).toBeLessThan(SUN_TOL);
      expect(Math.abs(s.sunset! - d.sunset)).toBeLessThan(SUN_TOL);
      expect(Math.abs(s.solarNoon! - d.solarNoon)).toBeLessThan(SUN_TOL);
    });
  }
  it('orders civil twilight and golden hour around sunrise and sunset', () => {
    const s = sunTimes(DAYS['2024-06-20'].start, LAT, LNG);
    expect(s.firstLight!).toBeLessThan(s.sunrise!);
    expect(s.lastLight!).toBeGreaterThan(s.sunset!);
    expect(s.goldenAm![0]).toBeLessThan(s.sunrise!);
    expect(s.goldenAm![1]).toBeGreaterThan(s.sunrise!);
    expect(s.goldenPm![0]).toBeLessThan(s.sunset!);
    expect(s.goldenPm![1]).toBeGreaterThan(s.sunset!);
  });
  it('day length stays near 11 to 13 hours at 10°N', () => {
    for (const d of Object.values(DAYS)) {
      const s = sunTimes(d.start, LAT, LNG);
      const h = (s.sunset! - s.sunrise!) / 3.6e6;
      expect(h).toBeGreaterThan(11.2);
      expect(h).toBeLessThan(12.9);
    }
  });
});

describe('moon times match PyEphem', () => {
  for (const [name, d] of Object.entries(DAYS)) {
    it(name, () => {
      const m = moonTimes(d.start, LAT, LNG);
      expect(Math.abs(m.moonrise! - d.moonrise)).toBeLessThan(MOON_TOL);
      expect(Math.abs(m.moonset! - d.moonset)).toBeLessThan(MOON_TOL);
      expect(Math.abs(m.transit! - d.transit)).toBeLessThan(MOON_TOL);
      expect(Math.abs(m.underfoot! - d.underfoot)).toBeLessThan(MOON_TOL);
    });
  }
  it('returns null for an event that does not fall in the day', () => {
    // The moon rises about 50 min later each day, so over a month some days have no moonrise.
    let missing = 0;
    for (let i = 0; i < 30; i++) if (moonTimes(DAYS['2024-01-01'].start + i * 86400000, LAT, LNG).moonrise === null) missing++;
    expect(missing).toBeGreaterThanOrEqual(1);
    expect(missing).toBeLessThanOrEqual(3);
  });
});

describe('moon phase', () => {
  const cases: [string, number, number, number][] = [
    ['new', 1704974220000, 0.0019, 0],
    ['first quarter', 1705549980000, 0.5012, 2],
    ['full', 1706205240000, 0.9983, 4],
    ['last quarter', 1706915880000, 0.5014, 6],
    ['new (June)', 1717677480000, 0.0015, 0],
    ['waxing gibbous-ish near full', 1739534400000, 0.9639, 4],
  ];
  for (const [label, ms, illum, name] of cases) {
    it(label, () => {
      const p = moonPhase(ms);
      expect(Math.abs(p.illumination - illum)).toBeLessThan(0.015);
      expect(p.name).toBe(name);
    });
  }
  it('cycles through all eight names in about 29.5 days', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 30; i++) seen.add(moonPhase(1704974220000 + i * 86400000).name);
    expect(seen.size).toBe(8);
  });
});

describe('solunar windows', () => {
  const sky = daySky(DAYS['2024-03-20'].start, LAT, LNG);
  it('centres a major window on moon overhead and underfoot, a minor on rise and set', () => {
    const majors = sky.windows.filter((w) => w.kind === 'major');
    const minors = sky.windows.filter((w) => w.kind === 'minor');
    expect(majors).toHaveLength(2);
    expect(minors).toHaveLength(2);
    for (const w of majors) expect(w.end - w.start).toBe(2 * MAJOR_HALF_MS);
    for (const w of minors) expect(w.end - w.start).toBe(2 * MINOR_HALF_MS);
    expect(majors.map((w) => w.centre).sort()).toEqual([sky.moon.transit, sky.moon.underfoot].sort());
  });
  it('lists windows in time order and skips missing moon events', () => {
    const w = solunarWindows({ moonrise: null, moonset: 5e6, transit: 1e6, underfoot: null });
    expect(w.map((x) => x.kind)).toEqual(['major', 'minor']);
    expect(w[0].start).toBeLessThan(w[1].start);
  });
  it('rates new and full moon higher than the quarters, always within 0 to 4', () => {
    const base = daySky(DAYS['2024-03-20'].start, LAT, LNG);
    const rate = (elongation: number) => solunarRating({ elongation, illumination: 0, name: 0 }, { ...base.sun, sunrise: null, sunset: null }, base.windows);
    expect(rate(0)).toBeGreaterThan(rate(90));
    expect(rate(180)).toBeGreaterThan(rate(90));
    for (let e = 0; e < 360; e += 15) expect([0, 1, 2, 3, 4]).toContain(rate(e));
  });
  it('is lifted when a major window overlaps sunrise', () => {
    const base = daySky(DAYS['2024-03-20'].start, LAT, LNG);
    const phase = { elongation: 90, illumination: 0.5, name: 2 as const };
    const withSun = solunarRating(phase, { ...base.sun, sunrise: base.windows[0].centre, sunset: null }, [{ kind: 'major', centre: base.windows[0].centre, start: base.windows[0].centre - 36e5, end: base.windows[0].centre + 36e5 }]);
    const without = solunarRating(phase, { ...base.sun, sunrise: null, sunset: null }, base.windows);
    expect(withSun).toBeGreaterThan(without);
  });
});
