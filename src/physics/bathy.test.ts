import { describe, expect, it } from 'vitest';
import { NODATA, cellAt, chaikin, clipLines, contour, gridBounds, hillshade, isWater, sample, tidLabel, tidMeasured, type Grid } from './bathy';

/** Grid of f(lng, lat) on a `n`×`n` lattice with 0.01° cells, NW cell centre at (0, 0). */
function grid(n: number, f: (lng: number, lat: number) => number, cell = 0.01): Grid {
  const z = new Float32Array(n * n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) z[r * n + c] = f(c * cell, -r * cell);
  return { cols: n, rows: n, lon0: 0, lat0: 0, dlon: cell, dlat: cell, z };
}

describe('sample', () => {
  const g = grid(5, (x, y) => 100 * x - 300 * y + 2); // a plane: bilinear is exact

  it('reproduces a plane between cell centres', () => {
    expect(sample(g, 0.013, -0.027)).toBeCloseTo(100 * 0.013 + 300 * 0.027 + 2, 6);
  });
  it('clamps in the outer half cell and is NaN beyond it', () => {
    expect(sample(g, -0.004, 0)).toBeCloseTo(2, 6);
    expect(sample(g, -0.006, 0)).toBeNaN();
    expect(sample(g, 0, 0.006)).toBeNaN();
  });
  it('is NaN next to a missing cell', () => {
    const z = Float32Array.from(g.z);
    z[6] = NODATA;
    expect(sample({ ...g, z }, 0.015, -0.015)).toBeNaN();
  });
  it('reports bounds as cell edges', () => {
    expect(gridBounds(g)).toEqual([-0.005, -0.045, 0.045, 0.005].map((v) => expect.closeTo(v, 9)));
  });
  it('cellAt picks the nearest cell centre', () => {
    expect(cellAt(g, 0.021, -0.009)).toBe(g.z[1 * 5 + 2]);
    expect(cellAt(g, 1, 1)).toBeNaN();
  });
});

describe('contour', () => {
  it('traces a closed ring round a pit at the right radius', () => {
    // A cone 30 m deep at the centre, rising 1 m per 0.001°: the -20 m contour is a circle r = 0.01°.
    const g = grid(41, (x, y) => -30 + Math.hypot(x - 0.2, y + 0.2) * 1000);
    const lines = contour(g, -20);
    expect(lines).toHaveLength(1);
    const ring = lines[0];
    expect(ring[0]).toEqual(ring.at(-1));
    for (const [x, y] of ring) expect(Math.hypot(x - 0.2, y + 0.2)).toBeCloseTo(0.01, 3);
  });

  it('gives one open line across a slope, along the level', () => {
    const g = grid(10, (x) => -x * 1000); // deepens eastward: -25 m at x = 0.025
    const lines = contour(g, -25);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toHaveLength(10);
    for (const [x] of lines[0]) expect(x).toBeCloseTo(0.025, 9);
  });

  it('resolves saddles into separate lines without crashing', () => {
    const z = new Float32Array([0, -10, -10, 0]); // diagonal highs/lows
    const lines = contour({ cols: 2, rows: 2, lon0: 0, lat0: 0, dlon: 1, dlat: 1, z }, -5);
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.length === 2)).toBe(true);
  });

  it('skips cells with missing data', () => {
    const g = grid(4, (x) => -x * 1000);
    const z = Float32Array.from(g.z).fill(NODATA, 0, 16);
    expect(contour({ ...g, z }, -10)).toEqual([]);
  });
});

describe('chaikin', () => {
  it('keeps the ends of an open line', () => {
    const out = chaikin([[0, 0], [1, 0], [1, 1]], 2);
    expect(out[0]).toEqual([0, 0]);
    expect(out.at(-1)).toEqual([1, 1]);
    expect(out.length).toBeGreaterThan(3);
  });
  it('keeps a ring closed', () => {
    const out = chaikin([[0, 0], [1, 0], [1, 1], [0, 0]], 1);
    expect(out[0]).toEqual(out.at(-1));
  });
});

describe('hillshade', () => {
  it('returns sin(altitude) on the flat', () => {
    const hs = hillshade(grid(4, () => -50), 315, 45);
    for (const v of hs) expect(v).toBeCloseTo(Math.SQRT1_2, 6);
  });
  it('lights slopes that face the sun and darkens the lee', () => {
    // Rises to the east, so its face looks west, towards a sun in the west.
    const g = grid(5, (x) => x * 50000, 0.001);
    expect(hillshade(g, 270, 45)[12]).toBeGreaterThan(Math.SQRT1_2);
    expect(hillshade(g, 90, 45)[12]).toBeLessThan(Math.SQRT1_2);
  });
});

describe('tid', () => {
  it('labels GEBCO source types', () => {
    expect(tidLabel(16)).toBe('SAT OPTICAL');
    expect(tidLabel(40)).toBe('SAT GRAVITY');
    expect(tidLabel(99)).toBe('--');
    expect(tidMeasured(11)).toBe(true);
    expect(tidMeasured(40)).toBe(false);
  });
});

describe('clipLines', () => {
  const water = (p: [number, number]) => !(p[0] > 4 && p[0] < 6); // a 2°-wide headland across x = 4..6

  it('splits a line where it crosses land, even between vertices', () => {
    const out = clipLines([[[0, 0], [10, 0]]], water, 0.5);
    expect(out).toHaveLength(2);
    expect(out[0][0]).toEqual([0, 0]);
    expect(out[0].at(-1)![0]).toBeLessThanOrEqual(4);
    expect(out[1][0][0]).toBeGreaterThanOrEqual(6);
    expect(out[1].at(-1)).toEqual([10, 0]);
  });
  it('leaves an all-water line whole and drops an all-land one', () => {
    expect(clipLines([[[0, 0], [1, 1], [2, 0]]], water, 0.5)).toHaveLength(1);
    expect(clipLines([[[4.5, 0], [5.5, 0]]], water, 0.1)).toEqual([]);
  });
});

describe('isWater', () => {
  // Fine mask over 0..0.04°: land (1) west of 0.02°. Coarse elevation: land above 0 m north of −0.1°.
  const land = grid(5, (x) => (x < 0.02 ? 1 : 0));
  const elev: Grid = { cols: 3, rows: 3, lon0: -0.1, lat0: 0.1, dlon: 0.1, dlat: 0.1, z: Float32Array.from([10, 10, 10, -50, -50, -50, -50, -50, -50]) };
  it('uses the fine mask where it covers', () => {
    expect(isWater(land, elev, 0.0, -0.01)).toBe(false);
    expect(isWater(land, elev, 0.03, -0.01)).toBe(true);
  });
  it('falls back to the elevation grid, and counts unknown as sea', () => {
    expect(isWater(land, elev, -0.1, 0.1)).toBe(false);
    expect(isWater(land, elev, -0.1, -0.1)).toBe(true);
    expect(isWater(land, elev, 5, 5)).toBe(true);
  });
});
