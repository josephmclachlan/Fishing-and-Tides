import { describe, expect, it } from 'vitest';
import macroUrl from '../../public/data/seafloor/gebco-macro.i16?inline';
import regionUrl from '../../public/data/seafloor/gebco-region.i16?inline';
import landUrl from '../../public/data/seafloor/land-mask.rle16?inline';
import manifest from '../../public/data/seafloor/manifest.json';
import { unRle } from '../adapters/seafloor';
import { SPOTS } from '../region';
import { M_PER_DEG_LNG, type Grid } from './bathy';
import { _speedAndSlope, nearshorePoint, refractAt, seafloorDepth, spreading, traceRay, type DepthFn } from './refraction';
import { kinematics, shoalingCoefficient } from './waves';

const RAD = Math.PI / 180;
const LNG0 = -82.8;
const LAT0 = 9.7;
const mx = M_PER_DEG_LNG * Math.cos(LAT0 * RAD);
/** East of LNG0 is sea, deepening 1 m per 100 m offshore; straight north–south contours. */
const planar: DepthFn = (lng) => 0.01 * (lng - LNG0) * mx;
const at = (xMetres: number): [number, number] => [LNG0 + xMetres / mx, LAT0];

describe('ray equations', () => {
  it('dc/dh matches a finite difference of c', () => {
    for (const h of [1, 5, 20, 60]) {
      const [, dcdh] = _speedAndSlope(10, h);
      const fd = (kinematics(10, h + 1e-4).c - kinematics(10, h - 1e-4).c) / 2e-4;
      expect(dcdh).toBeCloseTo(fd, 6);
    }
  });

  it("obeys Snell's law over straight contours: sin θ / c is constant", () => {
    // Shore-normal is east–west, so θ (from the normal) = heading − 270 for a ray heading in toward the beach.
    const T = 10;
    const start = at(7000);
    const r = traceRay(planar, start, 240, T, { minDepth: 3 });
    expect(r.end).toBe('land');
    const h0 = planar(...start);
    const inv = Math.sin(30 * RAD) / kinematics(T, h0).c;
    const thetaEnd = (r.endDir - 270) * RAD;
    expect(r.endDepth).toBeGreaterThan(1.5);
    expect(Math.sin(-thetaEnd) / kinematics(T, r.endDepth).c).toBeCloseTo(inv, 4);
    // Bent toward the shore normal.
    expect(Math.abs(r.endDir - 270)).toBeLessThan(30);
  });

  it('a ray heading straight in does not bend', () => {
    const r = traceRay(planar, at(5000), 270, 10);
    expect(r.endDir).toBeCloseTo(270, 6);
  });
});

describe('spreading', () => {
  it('integrates to 1 and peaks at zero offset', () => {
    let s = 0;
    for (let a = -180; a < 180; a += 0.25) s += spreading(a * RAD, 20 * RAD) * 0.25 * RAD;
    expect(s).toBeCloseTo(1, 4);
    expect(spreading(0, 0.2)).toBeGreaterThan(spreading(0.1, 0.2));
  });
});

describe('backward spectral refraction', () => {
  const T = 10;
  const point = at(500); // 5 m of water
  const h = planar(...point);
  const narrow = { spreadDeg: 1.5 };
  const opts = { fanStepDeg: 0.05 };

  it('shore-normal swell: no refraction, K = Ks', () => {
    const r = refractAt(planar, point, T, { fromDeg: 90, ...narrow }, opts);
    expect(r.Ks).toBeCloseTo(shoalingCoefficient(T, h), 9);
    expect(r.Kr).toBeCloseTo(1, 2);
    expect(r.fromDeg).toBeCloseTo(90, 0);
  });

  it('oblique swell matches Ks·√(cos θ0 / cos θ) and turns toward the normal', () => {
    const theta0 = 30 * RAD;
    const sinTheta = (Math.sin(theta0) * kinematics(T, h).c) / kinematics(T, Infinity).c;
    const expectedKr = Math.sqrt(Math.cos(theta0) / Math.cos(Math.asin(sinTheta)));
    const r = refractAt(planar, point, T, { fromDeg: 60, ...narrow }, opts);
    expect(r.Kr).toBeCloseTo(expectedKr, 2);
    expect(r.fromDeg).toBeCloseTo(90 - Math.asin(sinTheta) / RAD, 0);
  });

  it('swell from the land side never arrives', () => {
    const r = refractAt(planar, point, T, { fromDeg: 270, spreadDeg: 15 });
    expect(r.K).toBeLessThan(1e-3);
  });

  it('an island offshore shelters the point', () => {
    const island: DepthFn = (lng, lat) => {
      const dx = (lng - point[0]) * mx - 2000;
      const dy = (lat - point[1]) * 110574;
      return Math.hypot(dx, dy) < 700 ? 0 : planar(lng, lat);
    };
    const open = refractAt(planar, point, T, { fromDeg: 90, spreadDeg: 10 });
    const lee = refractAt(island, point, T, { fromDeg: 90, spreadDeg: 10 });
    expect(lee.K).toBeLessThan(0.6 * open.K);
  });

  it('dry or unknown points give zero', () => {
    expect(refractAt(planar, at(-100), T, { fromDeg: 90, spreadDeg: 15 }).K).toBe(0);
  });

  it('finds the nearest point with enough water off a shoreline pin', () => {
    const p = nearshorePoint(planar, at(-50), 10)!;
    expect(planar(...p)).toBeGreaterThanOrEqual(10);
    expect((p[0] - LNG0) * mx).toBeCloseTo(1000, -2);
  });
});

describe('on the real GEBCO grid', () => {
  // Vite inlines the packed grids as base64 data URLs.
  const bytes = (dataUrl: string) => Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (ch) => ch.charCodeAt(0)).buffer;
  const g = manifest.grids;
  const region: Grid = { ...g.region, z: new Int16Array(bytes(regionUrl)) };
  const macro: Grid = { ...g.macro, z: new Int16Array(bytes(macroUrl)) };
  const land: Grid = { ...g.land, z: unRle(new Uint16Array(bytes(landUrl)), g.land.cols, g.land.rows) };
  const depth = seafloorDepth(region, macro, land);

  it('gives every spot a finite, plausible coefficient for a north-east trade swell', () => {
    for (const s of SPOTS) {
      const p = nearshorePoint(depth, s.lngLat, 10);
      expect(p, s.name).not.toBeNull();
      const r = refractAt(depth, p!, 10, { fromDeg: 45, spreadDeg: 15 }, { fanStepDeg: 1 });
      expect(r.K, s.name).toBeGreaterThan(0.2);
      expect(r.K, s.name).toBeLessThan(1.6);
      expect(r.reachedDeep, s.name).toBeGreaterThan(10);
    }
  }, 20_000);
});
