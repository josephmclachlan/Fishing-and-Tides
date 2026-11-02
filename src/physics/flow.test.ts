import { describe, expect, it } from 'vitest';
import {
  KT_PER_MS, advect, distKm, fromDeg, fromSpeedDir, gridField, latOfY, lngOfX, mercX, mercY,
  nearestOnLine, sampleField, towardDeg, vortexSpeed, worldPx,
} from './flow';

describe('vector field grid', () => {
  // u = lng, v = 2·lat: bilinear sampling of a linear field is exact.
  const f = gridField([[-84, 9], [-82, 11]], 0.5, (lng, lat) => [lng, 2 * lat]);
  const out: [number, number] = [0, 0];

  it('covers the bounds, row 0 north', () => {
    expect([f.cols, f.rows]).toEqual([5, 5]);
    expect([f.u[0], f.v[0]]).toEqual([-84, 22]);
  });
  it('samples bilinearly', () => {
    expect(sampleField(f, -83.3, 9.8, out)).toBe(true);
    expect(out[0]).toBeCloseTo(-83.3, 5);
    expect(out[1]).toBeCloseTo(19.6, 5);
  });
  it('edges are inside, beyond is not', () => {
    expect(sampleField(f, -82, 9, out)).toBe(true);
    expect(sampleField(f, -81.9, 10, out)).toBe(false);
    expect(sampleField(f, -83, 11.01, out)).toBe(false);
  });
  it('refuses points next to missing data', () => {
    const g = gridField([[0, 0], [2, 2]], 1, (lng) => (lng === 0 ? [NaN, NaN] : [1, 1]));
    expect(sampleField(g, 0.5, 1, out)).toBe(false);
    expect(sampleField(g, 1.5, 1, out)).toBe(true);
  });
});

describe('directions', () => {
  it('wind from 070° blows toward 250°', () => {
    const [u, v] = fromSpeedDir(10, 70);
    expect(u).toBeLessThan(0);
    expect(v).toBeLessThan(0);
    expect(towardDeg(u, v)).toBeCloseTo(250, 6);
    expect(fromDeg(u, v)).toBeCloseTo(70, 6);
    expect(Math.hypot(u, v)).toBeCloseTo(10, 9);
  });
  it('cardinal sets', () => {
    expect(towardDeg(0, 1)).toBeCloseTo(0);
    expect(towardDeg(1, 0)).toBeCloseTo(90);
    expect(towardDeg(0, -1)).toBeCloseTo(180);
    expect(towardDeg(-1, 0)).toBeCloseTo(270);
  });
  it('1 m/s is 1.944 kt', () => expect(KT_PER_MS).toBeCloseTo(1.9438, 4));
});

describe('web mercator', () => {
  it('equator and prime meridian sit mid-world', () => {
    expect(mercX(0)).toBe(0.5);
    expect(mercY(0)).toBeCloseTo(0.5, 12);
    expect(mercY(10)).toBeLessThan(0.5); // north is up (smaller y)
  });
  it('round-trips', () => {
    expect(lngOfX(mercX(-82.83))).toBeCloseTo(-82.83, 9);
    expect(latOfY(mercY(9.79))).toBeCloseTo(9.79, 9);
  });
  it('world is 512 px at zoom 0, doubling per level', () => {
    expect(worldPx(0)).toBe(512);
    expect(worldPx(3)).toBe(4096);
  });
});

describe('advect', () => {
  const out: [number, number] = [0, 0];
  it('moves at pxPerMs px per second for each m/s, on screen', () => {
    const world = worldPx(10);
    advect(0.3, 0.4, 2, 0, 0.5, 10, world, out); // 2 m/s east for 0.5 s at 10 px/(m/s·s): 10 px
    expect((out[0] - 0.3) * world).toBeCloseTo(10, 9);
    expect(out[1]).toBe(0.4);
  });
  it('northward flow moves up the screen (smaller y)', () => {
    advect(0.3, 0.4, 0, 1, 1, 5, 1000, out);
    expect(out[1]).toBeCloseTo(0.4 - 0.005, 12);
  });
  it('same on-screen pace at every zoom', () => {
    const px = (z: number) => {
      advect(0, 0, 3, 4, 1, 7, worldPx(z), out);
      return Math.hypot(out[0], out[1]) * worldPx(z);
    };
    expect(px(6)).toBeCloseTo(35, 9);
    expect(px(14)).toBeCloseTo(35, 9);
  });
});

describe('geometry helpers', () => {
  it('distKm: 0.1° of latitude is ~11 km', () => expect(distKm([-83, 9.7], [-83, 9.8])).toBeCloseTo(11.12, 1));
  it('nearestOnLine gives distance and drawing-order tangent', () => {
    const line: [number, number][] = [[0, 1], [0, -1]]; // drawn north to south
    const { km, tangent } = nearestOnLine([0.1, 0], line);
    expect(km).toBeCloseTo(11.12, 1);
    expect(tangent[0]).toBeCloseTo(0);
    expect(tangent[1]).toBeCloseTo(-1);
  });
  it('vortex: calm at the centre, peak at R, fading beyond', () => {
    expect(vortexSpeed(0, 1, 0.3)).toBe(0);
    expect(vortexSpeed(1, 1, 0.3)).toBeCloseTo(0.3, 12);
    expect(vortexSpeed(0.5, 1, 0.3)).toBeLessThan(0.3);
    expect(vortexSpeed(4, 1, 0.3)).toBeLessThan(0.01);
  });
});
