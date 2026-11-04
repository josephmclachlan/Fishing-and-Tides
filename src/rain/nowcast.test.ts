import { describe, expect, it } from 'vitest';
import { cellOf, compass8, extrapolate, findCells, motion, nearRate, pairShift, townNowcast, type RainFrame, type RainGrid } from './nowcast';
import { parseRainCells } from '../adapters/rain-cells';

const g: RainGrid = { west: -83, north: 10, step: 0.02, nx: 40, ny: 30 };
const T0 = Date.UTC(2026, 10, 4, 18, 0);
const MIN = 60000;

/** A square blob of `mmh` with side `size` cells, top-left at (row, col). Fractional positions are rounded. */
function blob(row: number, col: number, mmh = 8, size = 5): Float32Array {
  const f = new Float32Array(g.nx * g.ny);
  const r0 = Math.round(row), c0 = Math.round(col);
  for (let i = r0; i < r0 + size; i++) for (let j = c0; j < c0 + size; j++) if (i >= 0 && j >= 0 && i < g.ny && j < g.nx) f[i * g.nx + j] = mmh;
  return f;
}
/** Frames every 10 min with the blob moving (dCol, dRow) cells per frame. */
const moving = (n: number, dCol: number, dRow: number, row = 12, col = 2): RainFrame[] =>
  Array.from({ length: n }, (_, k) => ({ t: T0 + k * 10 * MIN, rate: blob(row + k * dRow, col + k * dCol) }));
const lngLatOf = (i: number, j: number): [number, number] => [g.west + (j + 0.5) * g.step, g.north - (i + 0.5) * g.step];

describe('pairShift and motion', () => {
  it('finds a whole-cell shift', () => {
    expect(pairShift(g, blob(10, 5), blob(11, 8))).toMatchObject({ dx: 3, dy: 1 });
  });
  it('is null with too little rain', () => {
    expect(pairShift(g, blob(10, 5, 8, 2), blob(10, 6, 8, 2))).toBeNull();
  });
  it('turns an eastward drift into km/h and a heading', () => {
    const m = motion(g, moving(7, 2, 0))!;
    expect(m.cx).toBeCloseTo(0.2);
    expect(m.cy).toBeCloseTo(0);
    // 2 cells x 0.02° x 111.32 km x cos(9.7°) per 10 min ≈ 26.3 km/h
    expect(m.eastKmh).toBeCloseTo(2 * 0.02 * 111.32 * Math.cos((9.7 * Math.PI) / 180) * 6, 1);
    expect(m.towardsDeg).toBeCloseTo(90);
    expect(compass8(m.towardsDeg)).toBe('E');
  });
  it('averages sub-cell motion across the pairs', () => {
    // 1.5 cells per frame north-west: rounded positions alternate 1 and 2 cell steps.
    const m = motion(g, moving(7, -1.5, -1.5, 22, 30))!;
    expect(m.cx).toBeCloseTo(-0.15, 2);
    expect(m.cy).toBeCloseTo(-0.15, 2);
    expect(compass8(m.towardsDeg)).toBe('NW');
  });
  it('ignores a pair that disagrees with the rest', () => {
    const fr = moving(7, 2, 0);
    fr[4] = { ...fr[4], rate: blob(20, 30) }; // a jump
    const m = motion(g, fr)!;
    expect(m.cx).toBeCloseTo(0.2);
  });
  it('is null on a dry hour', () => {
    expect(motion(g, [{ t: T0, rate: new Float32Array(g.nx * g.ny) }, { t: T0 + 10 * MIN, rate: new Float32Array(g.nx * g.ny) }])).toBeNull();
  });
});

describe('extrapolate', () => {
  it('moves the field along the motion and leaves NaN where the source is off the grid', () => {
    const fr = moving(3, 2, 0);
    const m = motion(g, fr)!;
    const ahead = extrapolate(g, fr[2], m, 30); // 6 more cells east
    expect(ahead[14 * g.nx + 6 + 6]).toBe(8);
    expect(ahead[14 * g.nx + 6]).toBe(0);
    expect(Number.isNaN(ahead[14 * g.nx + 0])).toBe(true);
  });
});

describe('townNowcast', () => {
  const fr = moving(7, 2, 0); // blob cols 14..18 at T0+60, moving 0.2 cells/min east
  const m = motion(g, fr)!;
  const last = fr.at(-1)!.t;
  it('says raining under the blob', () => {
    expect(townNowcast(g, fr, m, lngLatOf(14, 16), last).status).toBe('raining');
  });
  it('gives an ETA downstream', () => {
    // Town at col 26: the leading edge (col 18) plus one neighbour cell reaches col 25 after 7 cells = 35 min.
    const n = townNowcast(g, fr, m, lngLatOf(14, 26), last);
    expect(n.status).toBe('coming');
    expect(n.etaMin).toBe(40);
    expect(n.peakMmH).toBe(8);
  });
  it('counts the age of the newest frame', () => {
    const n = townNowcast(g, fr, m, lngLatOf(14, 26), last + 20 * MIN);
    expect(n.etaMin).toBe(20);
  });
  it('is dry upstream and off the track', () => {
    expect(townNowcast(g, fr, m, lngLatOf(14, 2), last).status).toBe('dry');
    expect(townNowcast(g, fr, m, lngLatOf(2, 30), last).status).toBe('dry');
  });
  it('is unknown when the frames are stale or the town is off the grid', () => {
    expect(townNowcast(g, fr, m, lngLatOf(14, 26), last + 60 * MIN).status).toBe('unknown');
    expect(townNowcast(g, fr, m, [-90, 0], last).status).toBe('unknown');
    expect(townNowcast(g, [], m, lngLatOf(14, 26), last).status).toBe('unknown');
  });
});

describe('cells and helpers', () => {
  it('finds patches with centroid, peak and area', () => {
    const f = blob(5, 5, 4);
    f[5 * g.nx + 5] = 20;
    const two = f.map((v, k) => v + blob(20, 30, 3, 3)[k]);
    const cells = findCells(g, two);
    expect(cells).toHaveLength(2);
    expect(cells[0].peakMmH).toBe(20);
    expect(cells[0].lngLat[0]).toBeCloseTo(g.west + 7.5 * g.step);
    expect(cells[0].areaKm2).toBeGreaterThan(100);
  });
  it('maps points to cells and reads the nearby maximum', () => {
    expect(cellOf(g, g.west + 0.001, g.north - 0.001)).toEqual([0, 0]);
    expect(cellOf(g, g.west - 0.001, g.north)).toBeNull();
    const f = blob(10, 10, 6, 1);
    expect(nearRate(g, f, ...lngLatOf(11, 11))).toBe(6);
    expect(nearRate(g, f, ...lngLatOf(12, 12))).toBe(0);
  });
});

describe('parseRainCells', () => {
  it('decodes the bytes, NaN for 255, oldest frame first', () => {
    const b64 = (xs: number[]) => btoa(String.fromCharCode(...xs));
    const d = parseRainCells({
      fetchedAt: '2026-11-04T18:20:00Z', source: 'ir', quant: 4, grid: { west: -83, north: 10, step: 0.5, nx: 2, ny: 1 },
      frames: [{ t: '2026-11-04T18:10:00Z', rate: b64([4, 255]) }, { t: '2026-11-04T18:00:00Z', rate: b64([0, 10]) }],
    });
    expect(d.frames.map((f) => f.t)).toEqual([Date.UTC(2026, 10, 4, 18, 0), Date.UTC(2026, 10, 4, 18, 10)]);
    expect(d.frames[1].rate[0]).toBe(1);
    expect(Number.isNaN(d.frames[1].rate[1])).toBe(true);
    expect(d.frames[0].rate[1]).toBe(2.5);
  });
  it('rejects a frame of the wrong size', () => {
    expect(() => parseRainCells({ fetchedAt: '2026-11-04T18:20:00Z', quant: 4, grid: { west: 0, north: 0, step: 1, nx: 2, ny: 2 }, frames: [{ t: '2026-11-04T18:10:00Z', rate: 'AA==' }] })).toThrow();
  });
});
