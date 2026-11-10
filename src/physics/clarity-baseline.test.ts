import { describe, expect, it } from 'vitest';
import { landOf, monthlyQuantile, offshoreFill, quantile, touchesLand } from './clarity-baseline';

describe('quantile', () => {
  it('interpolates between sorted values and skips NaN', () => {
    expect(quantile([4, 1, NaN, 3, 2], 0)).toBe(1);
    expect(quantile([4, 1, NaN, 3, 2], 1)).toBe(4);
    expect(quantile([4, 1, 3, 2], 0.5)).toBeCloseTo(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.2)).toBeCloseTo(1.8);
    expect(quantile([NaN], 0.2)).toBeNaN();
  });
});

describe('monthlyQuantile', () => {
  it('groups days by UTC calendar month, per pixel', () => {
    const t = [Date.UTC(2020, 10, 1), Date.UTC(2021, 10, 5), Date.UTC(2022, 10, 9), Date.UTC(2020, 0, 1)];
    const frames = [Float32Array.of(0.1, NaN), Float32Array.of(0.3, NaN), Float32Array.of(0.2, NaN), Float32Array.of(0.9, 1)];
    const m = monthlyQuantile(t, frames, 0.5);
    expect(m).toHaveLength(12);
    expect(m[10][0]).toBeCloseTo(0.2); // November: median of 0.1, 0.3, 0.2
    expect(m[10][1]).toBeNaN(); // no November values at this pixel
    expect(m[0][0]).toBeCloseTo(0.9);
    expect(m[5][0]).toBeNaN(); // no June days at all
  });
});

describe('shoreline pixels', () => {
  // 5 × 3 grid, land (NaN in every frame) down the west column: column 1 touches it.
  const cols = 5, rows = 3;
  const frame = Float32Array.from([NaN, 2, 0.3, 0.2, 0.1, NaN, 2, 0.3, 0.2, 0.1, NaN, 2, 0.3, 0.2, 0.1]);
  const land = landOf([frame]);
  const coast = touchesLand(land, cols, rows);

  it('finds land and the sea pixels next to it', () => {
    expect(Array.from(land)).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0]);
    expect(Array.from(coast)).toEqual([0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]);
  });

  it('gives a land-touching pixel the nearest value offshore, keeps the rest', () => {
    const out = offshoreFill(frame, coast, cols, rows);
    expect(out[1]).toBeCloseTo(0.3);
    expect(out[6]).toBeCloseTo(0.3);
    expect(out[2]).toBeCloseTo(0.3);
    expect(out[4]).toBeCloseTo(0.1);
    expect(out[0]).toBeNaN();
  });

  it('averages ties and keeps its own value with nothing in reach', () => {
    // 5 × 5 of 1s, land at (2,0) and (2,2): (2,1) sits between them; the nearest pixels clear of land are (0,1) and (4,1), 2 px away.
    const f = new Float32Array(25).fill(1);
    f[10] = f[12] = NaN;
    f[1] = 0.2;
    f[21] = 0.4;
    const c = touchesLand(landOf([f]), 5, 5);
    expect([c[1], c[21], c[11]]).toEqual([0, 0, 1]);
    expect(offshoreFill(f, c, 5, 5)[11]).toBeCloseTo(0.3);
    const g = Float32Array.from([0.5, 0.5, 0.2, NaN, 1, NaN, 0.5, 0.5, 0.4]); // land on both sides of the middle row
    const cg = touchesLand(landOf([g]), 3, 3);
    expect(offshoreFill(g, cg, 3, 3)[4]).toBe(1); // every sea pixel touches land: nothing to take
    const h = Float32Array.from([NaN, 1, 0.2, 0, 0, 0, 0, 0, 0, NaN, NaN, 0.6]); // 3 × 4: (0,1) touches land; (0,2) at 1 px
    const ch = touchesLand(landOf([h]), 3, 4);
    expect(offshoreFill(h, ch, 3, 4)[1]).toBeCloseTo(0.2);
  });
});
