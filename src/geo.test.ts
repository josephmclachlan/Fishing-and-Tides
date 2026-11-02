import { describe, expect, it } from 'vitest';
import { bearingDeg, cameraAltitudeM, graticule, haversineM, metersPerPixel, nearest, toDDM } from './geo';

describe('metersPerPixel', () => {
  it('is the whole equator over one 512 px tile at zoom 0', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo((2 * Math.PI * 6378137) / 512, 6);
  });
  it('halves per zoom level and shrinks with cos(lat)', () => {
    expect(metersPerPixel(0, 10) / metersPerPixel(0, 11)).toBeCloseTo(2, 12);
    expect(metersPerPixel(60, 5) / metersPerPixel(0, 5)).toBeCloseTo(0.5, 12);
  });
});

describe('cameraAltitudeM', () => {
  it('matches distance = (H/2)/tan(fov/2) in ground metres', () => {
    // MapLibre default fov 36.87°: tan(18.435°) = 1/3, so distance = 1.5 H px.
    const alt = cameraAltitudeM(0, 0, 800, 36.8699);
    expect(alt).toBeCloseTo(1.5 * 800 * metersPerPixel(0, 0), -2);
  });
  it('drops with pitch as cos(pitch)', () => {
    expect(cameraAltitudeM(10, 9, 800, 36.87, 60) / cameraAltitudeM(10, 9, 800, 36.87)).toBeCloseTo(0.5, 9);
  });
  it('gives sensible tier altitudes over the region', () => {
    const at = (z: number) => cameraAltitudeM(9.8, z, 800, 36.87);
    expect(at(7)).toBeGreaterThan(200_000); // macro: orbital-ish
    expect(at(12)).toBeLessThan(40_000); // spot: low pass
  });
});

describe('haversineM / bearingDeg', () => {
  it('measures one degree of latitude as ~111.3 km due north', () => {
    expect(haversineM([-83, 9], [-83, 10])).toBeCloseTo(111_319, -1);
    expect(bearingDeg([-83, 9], [-83, 10])).toBeCloseTo(0, 6);
  });
  it('reads due east and due west near the equator', () => {
    expect(bearingDeg([-83, 0], [-82, 0])).toBeCloseTo(90, 6);
    expect(bearingDeg([-82, 0], [-83, 0])).toBeCloseTo(270, 6);
  });
});

describe('nearest', () => {
  const pts = [
    { name: 'A', lngLat: [-83, 10] as [number, number] },
    { name: 'B', lngLat: [-82.7, 9.65] as [number, number] },
  ];
  it('picks the closest point with range and bearing to it', () => {
    const n = nearest([-82.71, 9.65], pts)!;
    expect(n.point.name).toBe('B');
    expect(n.distanceM).toBeCloseTo(haversineM([-82.71, 9.65], [-82.7, 9.65]), 6);
    expect(n.bearingDeg).toBeCloseTo(90, 0);
  });
  it('returns null for no points', () => {
    expect(nearest([0, 0], [])).toBeNull();
  });
});

describe('toDDM', () => {
  it('formats degrees and decimal minutes with hemisphere', () => {
    expect(toDDM(9.79, 'lat')).toBe("09°47.400'N");
    expect(toDDM(-82.83, 'lng')).toBe("082°49.800'W");
  });
  it('rolls 59.9999 minutes up to the next degree', () => {
    expect(toDDM(9.9999999, 'lat')).toBe("10°00.000'N");
  });
});

describe('graticule', () => {
  it('snaps lines to multiples of step without float drift', () => {
    const lines = graticule([[-83.25, 9.45], [-82.4, 10.1]], 0.1);
    const xs = lines.filter((l) => l[0][0] === l[1][0]).map((l) => l[0][0]);
    const ys = lines.filter((l) => l[0][1] === l[1][1]).map((l) => l[0][1]);
    expect(xs[0]).toBe(-83.2);
    expect(xs.at(-1)).toBe(-82.4);
    expect(xs).toHaveLength(9);
    expect(ys[0]).toBe(9.5);
    expect(ys.at(-1)).toBe(10.1);
    expect(ys).toHaveLength(7);
  });
});
