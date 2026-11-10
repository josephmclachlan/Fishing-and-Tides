import { describe, expect, it } from 'vitest';
import { SPOTS } from '../region';
import { M_PER_DEG_LNG } from './bathy';
import { breakerHeight } from './breaking';
import { realDepth } from './fixtures/seafloor';
import type { DepthFn } from './refraction';
import { defaultSpread, spotWaves } from './surf-zone';

const RAD = Math.PI / 180;
const LNG0 = -82.8;
const mx = M_PER_DEG_LNG * Math.cos(9.7 * RAD);
/** Sea to the east, 1:50 slope, straight contours. */
const planar: DepthFn = (lng) => 0.02 * (lng - LNG0) * mx;
const pin: [number, number] = [LNG0 - 20 / mx, 9.7];

describe('spot surf zone', () => {
  it('on a straight 1:50 beach: east-facing normal, slope found, shore-normal swell spills', () => {
    const s = spotWaves(planar, pin, { Hs: 1.5, Tp: 10, fromDeg: 90 }, { fanStepDeg: 0.25 })!;
    expect(s.normalDeg).toBeCloseTo(90, 0);
    expect(s.slope!).toBeCloseTo(0.02, 2);
    expect(s.refraction.Kr).toBeCloseTo(1, 1);
    expect(s.breaker.Hb).toBeCloseTo(breakerHeight(1.5 * s.refraction.Kr, 10), 9);
    expect(s.breaker.type).toBe('spilling');
    expect(Math.abs(s.angleDeg)).toBeLessThan(2);
  });

  it('oblique swell arrives turned in, smaller, and drives a longshore current', () => {
    const straight = spotWaves(planar, pin, { Hs: 1.5, Tp: 10, fromDeg: 90 })!;
    const oblique = spotWaves(planar, pin, { Hs: 1.5, Tp: 10, fromDeg: 40 })!;
    expect(oblique.breaker.Hb).toBeLessThan(straight.breaker.Hb);
    expect(oblique.angleDeg).toBeLessThan(0);
    expect(oblique.angleDeg).toBeGreaterThan(-50);
    expect(Math.abs(oblique.breaker.longshoreMs)).toBeGreaterThan(0.2);
    // Turned further in by the break (Snell), same side: the rip score reads this angle.
    expect(oblique.breakAngleDeg).toBeLessThan(0);
    expect(Math.abs(oblique.breakAngleDeg)).toBeLessThan(Math.abs(oblique.angleDeg));
  });

  it('no water nearby gives null', () => {
    expect(spotWaves(() => 0, pin, { Hs: 1, Tp: 10, fromDeg: 90 })).toBeNull();
  });

  it('spread defaults narrow for swell, broad for wind sea', () => {
    expect(defaultSpread(14)).toBeLessThan(defaultSpread(9));
    expect(defaultSpread(9)).toBeLessThan(defaultSpread(5));
  });

  it('every spot gets a plausible breaker for a 1.5 m, 10 s north-east swell on the real grid', () => {
    for (const s of SPOTS) {
      const w = spotWaves(realDepth, s.lngLat, { Hs: 1.5, Tp: 10, fromDeg: 45 }, { fanStepDeg: 1 });
      expect(w, s.name).not.toBeNull();
      expect(w!.breaker.Hb, s.name).toBeGreaterThan(0.3);
      expect(w!.breaker.Hb, s.name).toBeLessThan(3.5);
      expect(w!.slope!, s.name).toBeGreaterThan(0);
    }
  }, 20_000);
});

describe('shore normal from the coastline', () => {
  it('agrees with the surf catalog facings (measured independently from the land mask) within 25°', async () => {
    const { SURF_BREAKS } = await import('../data/surf-breaks');
    const { shoreNormal } = await import('./surf-zone');
    for (const b of SURF_BREAKS) {
      const n = shoreNormal(realDepth, b.lngLat)!;
      const diff = Math.abs(((n - b.facing + 540) % 360) - 180);
      expect(diff, `${b.name}: ${n.toFixed(0)} vs ${b.facing}`).toBeLessThan(25);
    }
  });

  it('points east on a straight beach facing east', async () => {
    const { shoreNormal } = await import('./surf-zone');
    expect(shoreNormal(planar, pin)).toBeCloseTo(90, 6);
  });
});
