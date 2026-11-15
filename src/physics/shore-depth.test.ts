import { describe, expect, it } from 'vitest';
import { coastDistance, deanA, deanDepth, nearshoreDepth, SWASH_DEPTH_M } from './shore-depth';
import { cellAt, type Grid } from './bathy';
import { land } from './fixtures/seafloor';
import { SPOTS } from '../region';
import { haversineM } from '../geo';

describe('Dean beach profile', () => {
  it('has A ≈ 0.12 m^(1/3) for 0.25 mm sand (Dean 1987 table: 0.11 to 0.12)', () => {
    expect(deanA()).toBeGreaterThan(0.105);
    expect(deanA()).toBeLessThan(0.13);
  });
  it('gives h = A·x^(2/3): about 1.6 m at 50 m and 5.4 m at 300 m', () => {
    expect(deanDepth(50)).toBeCloseTo(deanA() * 50 ** (2 / 3), 9);
    expect(deanDepth(50)).toBeGreaterThan(1.4);
    expect(deanDepth(50)).toBeLessThan(1.8);
    expect(deanDepth(300)).toBeGreaterThan(4.8);
    expect(deanDepth(300)).toBeLessThan(6);
    expect(deanDepth(-5)).toBe(0);
  });
  it('only ever makes the grid shallower, never below the swash', () => {
    expect(nearshoreDepth(13, 50)).toBeCloseTo(deanDepth(50), 9);
    expect(nearshoreDepth(1, 300)).toBe(1);
    expect(nearshoreDepth(13, 0)).toBe(SWASH_DEPTH_M);
    expect(nearshoreDepth(NaN, 100)).toBeCloseTo(deanDepth(100), 9);
  });
});

describe('coastDistance', () => {
  const grid = (cols: number, rows: number, isLand: (c: number, r: number) => boolean): Grid => ({
    cols, rows, lon0: -82.7, lat0: 9.7, dlon: 0.0003, dlat: 0.0003,
    z: Uint8Array.from({ length: cols * rows }, (_, i) => (isLand(i % cols, Math.floor(i / cols)) ? 1 : 0)),
  });
  it('measures from the edge of the land along rows, columns and diagonals', () => {
    // Land is the west column; a cell is ~32.9 m east-west.
    const d = coastDistance(grid(20, 5, (c) => c === 0));
    const ex = 0.0003 * 111320 * Math.cos((9.7 - 2.5 * 0.0003) * Math.PI / 180);
    expect(d.z[0]).toBe(0);
    expect(Math.abs(d.z[1] - (ex - (ex + 0.0003 * 110574) / 4))).toBeLessThan(1);
    expect(Math.abs(d.z[2 * 20 + 10] - 9.5 * ex)).toBeLessThan(2);
  });
  it('is within 9% of the straight line off a single land cell', () => {
    const d = coastDistance(grid(41, 41, (c, r) => c === 0 && r === 0));
    const ex = 0.0003 * 111320 * Math.cos((9.7 - 20.5 * 0.0003) * Math.PI / 180), ny = 0.0003 * 110574;
    for (const [c, r] of [[30, 0], [0, 30], [20, 20], [30, 12], [7, 33]]) {
      const truth = Math.hypot(c * ex, r * ny) - (ex + ny) / 4;
      expect(Math.abs(d.z[r * 41 + c] - truth) / truth, `${c},${r}`).toBeLessThan(0.09);
    }
  });
  it('puts the spot pins at the waterline and their sea points 250 m to 1.5 km out on the real mask', () => {
    const d = coastDistance(land);
    for (const s of SPOTS) {
      const x = cellAt(d, ...s.sea);
      expect(x, s.name).toBeGreaterThan(200);
      expect(x, s.name).toBeLessThanOrEqual(haversineM(s.lngLat, s.sea) + 50);
    }
  });
});
