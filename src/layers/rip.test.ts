import { describe, expect, it } from 'vitest';
import type { LineString } from 'geojson';
import { haversineM, bearingDeg } from '../geo';
import { createSpotModel } from '../physics/spot-model';
import { realDepth } from '../physics/fixtures/seafloor';
import { SPOTS } from '../region';
import { offset, ripFeatures, surfZoneWidth } from './rip';

describe('rip overlay geometry', () => {
  it('offsets by distance and bearing', () => {
    const p: [number, number] = [-82.84, 9.74];
    const q = offset(p, 45, 1000);
    expect(haversineM(p, q)).toBeCloseTo(1000, -1);
    expect(bearingDeg(p, q)).toBeCloseTo(45, 0);
  });

  it('surf zone width from breaking depth and slope, clamped', () => {
    expect(surfZoneWidth(2, 0.02)).toBeCloseTo(100, 9);
    expect(surfZoneWidth(2, null)).toBeCloseTo(2 / 0.03, 9);
    expect(surfZoneWidth(0.1, 0.1)).toBe(20);
    expect(surfZoneWidth(5, 0.001)).toBe(800);
  });

  it('draws a bar per spot, arrows only for MOD/HIGH, and a label, pointing out to sea', () => {
    const m = createSpotModel(realDepth, { fanStepDeg: 1 });
    const spots = SPOTS.slice(2, 4);
    const calm = spots.map((s) => ({ name: s.name, pin: s.lngLat, result: m.spot({ pin: s.lngLat, sea: { Hs: 0.3, Tp: 7, fromDeg: 45 }, tideLevel: 0.5 }) }));
    const big = spots.map((s) => ({ name: s.name, pin: s.lngLat, result: m.spot({ pin: s.lngLat, sea: { Hs: 2.5, Tp: 13, fromDeg: 45 }, tideLevel: 0 }) }));
    const kinds = (fc: ReturnType<typeof ripFeatures>) => fc.features.map((f) => f.properties!.kind);
    expect(kinds(ripFeatures(calm))).toEqual(['zone', 'label', 'zone', 'label']);
    const fc = ripFeatures(big);
    expect(kinds(fc)).toEqual(['zone', 'arrow', 'arrow', 'label', 'zone', 'arrow', 'arrow', 'label']);
    expect(fc.features[1].properties!.level).toBe('HIGH');
    // The shaft heads seaward along the shore normal.
    const shaft = (fc.features[1].geometry as LineString).coordinates as [number, number][];
    expect(bearingDeg(shaft[0], shaft[1])).toBeCloseTo(big[0].result!.waves.normalDeg, 0);
    expect(String(fc.features[3].properties!.label)).toContain('RIP HIGH');
    expect(ripFeatures([{ name: 'X', pin: [0, 0], result: null }]).features).toHaveLength(0);
  }, 20_000);
});
