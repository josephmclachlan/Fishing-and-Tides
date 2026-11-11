import { describe, expect, it } from 'vitest';
import { crestField, crestStride, headingAt } from './crest-field';
import { deepWavelength, kinematics } from './waves';
import { M_PER_DEG_LAT } from './bathy';

const BOX = [[-82.8, 9.6], [-82.7, 9.7]] as const;

describe('swell crest field (PLAN 7.86)', () => {
  it('in deep water the crests are straight, a deep-water wavelength apart, square to the travel', () => {
    const f = crestField(() => 2000, BOX, 0.002, 11, 0); // from the north: travels south
    expect(f.toDeg).toBe(180);
    const c = 25;
    // One period further south each wavelength: U grows by 1 per L0.
    const perCell = f.u[11 * f.cols + c] - f.u[10 * f.cols + c];
    expect(perCell * deepWavelength(11)).toBeCloseTo(0.002 * M_PER_DEG_LAT, 0);
    // No change along a crest (east-west).
    expect(f.u[10 * f.cols + 30]).toBeCloseTo(f.u[10 * f.cols + 20], 6);
    expect(headingAt(f, 25, 25)).toBeCloseTo(180, 3);
  });

  it('slows and bends the crests toward the beach in shallow water (refraction, Snell)', () => {
    // A plane beach facing north: depth grows 10 m per km northward from the shore at 9.6 N.
    const depth = (_lng: number, lat: number) => (lat - 9.6) * M_PER_DEG_LAT * 0.01;
    const f = crestField(depth, BOX, 0.001, 10, 45); // from the NE, travelling SW
    const at = (lat: number) => Math.round((f.lat0 - lat) / f.step);
    const deep = headingAt(f, 50, at(9.69))!; // ~100 m deep
    const shallow = headingAt(f, 50, at(9.605))!; // ~5 m deep
    const offNormal = (h: number) => Math.abs(h - 180); // the shore normal points south (toward the beach)
    expect(offNormal(shallow)).toBeLessThan(offNormal(deep));
    // Snell: sin θ / c is the same along the ray.
    const c = (h: number) => kinematics(10, h).c;
    const d1 = depth(0, f.lat0 - at(9.69) * f.step), d2 = depth(0, f.lat0 - at(9.605) * f.step);
    const want = (Math.asin((Math.sin((offNormal(deep) * Math.PI) / 180) * c(d2)) / c(d1)) * 180) / Math.PI;
    // First-order upwind sweeping smears an oblique front a little: within 3°.
    expect(Math.abs(offNormal(shallow) - want)).toBeLessThan(3);
    // Shoaling makes the shallow crests taller.
    expect(f.ks[at(9.602) * f.cols + 50]).toBeGreaterThan(1);
  });

  it('leaves land out', () => {
    const f = crestField((lng) => (lng < -82.75 ? -5 : 100), BOX, 0.002, 9, 90);
    expect(Number.isNaN(f.u[10 * f.cols + 5])).toBe(true);
    expect(Number.isFinite(f.u[10 * f.cols + 40])).toBe(true);
  });

  it('thins the crests drawn as the map zooms out, in powers of two', () => {
    expect(crestStride(189, 1)).toBe(1); // 189 px apart
    expect(crestStride(189, 9.5)).toBe(4); // 20 px apart: every 4th
    expect(crestStride(189, 150)).toBe(64);
  });
});
