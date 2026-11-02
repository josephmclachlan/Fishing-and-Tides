import { describe, expect, it } from 'vitest';
import type { LineString } from 'geojson';
import { haversineM, bearingDeg } from '../geo';
import { createSpotModel } from '../physics/spot-model';
import { land, realDepth } from '../physics/fixtures/seafloor';
import { cellAt } from '../physics/bathy';
import { SPOTS } from '../region';
import { maskNormal, offset, ripFeatures, shoreBand, surfZoneWidth } from './rip';

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
    const small = { Hs: 0.3, Tp: 7, fromDeg: 45 };
    const large = { Hs: 2.5, Tp: 13, fromDeg: 45 };
    const calm = spots.map((s) => ({ name: s.name, pin: s.lngLat, sea: small, result: m.spot({ pin: s.lngLat, sea: small, tideLevel: 0.5 }) }));
    const big = spots.map((s) => ({ name: s.name, pin: s.lngLat, sea: large, result: m.spot({ pin: s.lngLat, sea: large, tideLevel: 0 }) }));
    const kinds = (fc: ReturnType<typeof ripFeatures>) => fc.features.map((f) => f.properties!.kind);
    expect(kinds(ripFeatures(calm))).toEqual(['zone', 'label', 'zone', 'label']);
    const fc = ripFeatures(big);
    expect(kinds(fc)).toEqual(['zone', 'arrow', 'arrow', 'label', 'zone', 'arrow', 'arrow', 'label']);
    expect(fc.features[1].properties!.level).toBe('HIGH');
    // The shaft heads seaward along the shore normal.
    const shaft = (fc.features[1].geometry as LineString).coordinates as [number, number][];
    expect(bearingDeg(shaft[0], shaft[1])).toBeCloseTo(big[0].result!.waves.normalDeg, 0);
    expect(String(fc.features[3].properties!.label)).toContain('RIP HIGH');
    expect(ripFeatures([{ name: 'X', pin: [0, 0], sea: small, result: null }]).features).toHaveLength(0);
  }, 20_000);

  it('reads the shore normal off the coastline mask: Salsa Brava faces roughly north', () => {
    const salsa = SPOTS.find((s) => s.name === 'SALSA BRAVA')!.lngLat;
    const n = maskNormal(land, salsa)!;
    const off = Math.abs(((n - 0 + 540) % 360) - 180);
    expect(off).toBeLessThan(45);
    expect(maskNormal(land, [-82.9, 9.6])).toBeNull(); // deep inland: no sea in reach
  });

  it('traces the band along the shore, on the water, never across the land', () => {
    for (const s of SPOTS) {
      const n = maskNormal(land, s.lngLat);
      if (n === null) continue;
      const lines = shoreBand(land, s.lngLat, n, 350, 30);
      const pts = lines.flat();
      expect(pts.length, s.name).toBeGreaterThan(10);
      for (const p of pts) {
        expect(cellAt(land, p[0], p[1]), s.name).not.toBe(1);
        expect(haversineM(s.lngLat, p), s.name).toBeLessThan(700);
      }
      // No segment of the band crosses land.
      for (const l of lines)
        for (let i = 1; i < l.length; i++)
          for (let k = 1; k < 10; k++) {
            const q: [number, number] = [l[i - 1][0] + ((l[i][0] - l[i - 1][0]) * k) / 10, l[i - 1][1] + ((l[i][1] - l[i - 1][1]) * k) / 10];
            expect(cellAt(land, q[0], q[1]), s.name).not.toBe(1);
          }
    }
  });

  it('every spot pin sits within ~60 m of the sea in the coastline mask (none stranded inland)', () => {
    for (const s of SPOTS) {
      let nearest = Infinity;
      for (let b = 0; b < 360; b += 10)
        for (let m = 0; m <= 200; m += 5)
          if (cellAt(land, ...offset(s.lngLat, b, m)) === 0) {
            nearest = Math.min(nearest, m);
            break;
          }
      expect(nearest, s.name).toBeLessThanOrEqual(60);
    }
  });
});
