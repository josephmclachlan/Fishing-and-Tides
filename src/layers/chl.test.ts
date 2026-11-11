import { describe, expect, it } from 'vitest';
import { pixelBox, sampleSea } from './chl';
import { drawnCorners } from './sea-image';

describe('chlorophyll layer', () => {
  it('samples the sea between cells and skips empty ones', () => {
    const g = { cols: 2, rows: 2, lon0: 0, lat0: 1, dlon: 1, dlat: 1 };
    expect(sampleSea(g, [0, 2, 4, 6], 0.5, 0.5)).toBeCloseTo(3);
    expect(sampleSea(g, [0, NaN, 4, 6], 0.75, 0.75)).toBeCloseTo(1.375 / 0.4375);
    expect(sampleSea(g, [0, NaN, NaN, NaN], 0.5, 0.5)).toBe(0);
    expect(sampleSea(g, [NaN, NaN, NaN, NaN], 0.5, 0.5)).toBeNaN();
    expect(sampleSea(g, [0, 2, 4, 6], 3, 0.5)).toBeNaN();
  });

  it('snaps the coast box to the macro image pixels, so hole and fine image meet exactly', () => {
    const img = { width: 100, height: 80, coordinates: [[-90, 20], [-80, 20], [-80, 10], [-90, 10]] as [[number, number], [number, number], [number, number], [number, number]] };
    const { box, hole } = pixelBox(img, [[-83.25, 9.45], [-82.42, 10.1]]);
    // Each edge on a 0.1° pixel edge, at or outside the asked box (clamped to the image at the south).
    expect(box[0]).toBeCloseTo(-83.3, 9);
    expect(box[2]).toBeCloseTo(-82.4, 9);
    expect(box[1]).toBeCloseTo(10, 9);
    expect(box[3]).toBeGreaterThanOrEqual(10.1);
    expect(hole[0]).toEqual([box[0], box[3]]);
    expect(hole[2]).toEqual([box[2], box[1]]);
    // Drawn a little east: the box follows where the pixels are drawn, the hole stays on the image's own pixels.
    const moved = img.coordinates.map(([x, y]) => [x + 0.01, y]) as typeof img.coordinates;
    const shifted = pixelBox(img, [[-83.25, 9.45], [-82.42, 10.1]], moved);
    expect(shifted.box[0]).toBeCloseTo(-83.29, 9);
    expect(shifted.hole[0][0]).toBeCloseTo(-83.3, 9);
  });

  it('rounds image corners to the tile grid MapLibre draws them on', () => {
    const big = [[-86, 13.08], [-78.9, 13.08], [-78.9, 7.5], [-86, 7.5]] as [[number, number], [number, number], [number, number], [number, number]];
    const d = drawnCorners(big);
    // A Caribbean-sized image lands in a zoom-5 tile: an 11.25° tile cut 8192 ways, ~0.0014° a step.
    d.forEach((p, i) => {
      expect(Math.abs(p[0] - big[i][0])).toBeLessThanOrEqual(0.0007);
      expect(Math.abs(p[1] - big[i][1])).toBeLessThanOrEqual(0.0007);
    });
    expect(d.some((p, i) => p[0] !== big[i][0])).toBe(true);
    // Already on the grid: unchanged.
    drawnCorners(d).forEach((p, i) => {
      expect(p[0]).toBeCloseTo(d[i][0], 9);
      expect(p[1]).toBeCloseTo(d[i][1], 9);
    });
  });
});
