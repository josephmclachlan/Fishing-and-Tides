import { describe, expect, it } from 'vitest';
import { depthBand, renderShade } from './seafloor-shade';
import type { Grid } from '../physics/bathy';

describe('depthBand', () => {
  const edges = [5, 10, 20];
  it('puts depths in shallow-to-deep bands', () => {
    expect(depthBand(0, edges)).toBe(0);
    expect(depthBand(5, edges)).toBe(1);
    expect(depthBand(19.9, edges)).toBe(2);
    expect(depthBand(500, edges)).toBe(3);
  });
});

describe('renderShade', () => {
  // West half land (+10 m), east half a flat 30 m deep, 1° cells around the equator.
  const z = new Float32Array([10, -30, -30, 10, -30, -30, 10, -30, -30]);
  const g: Grid = { cols: 3, rows: 3, lon0: 0, lat0: 1, dlon: 1, dlat: 1, z };
  const opts = { width: 30, edges: [10, 50], alphas: [0.5, 0.4, 0.1], rgb: [1, 2, 3] as const };

  it('keeps the Mercator aspect and corner order NW, NE, SE, SW', () => {
    const img = renderShade(g, opts);
    expect(img.coordinates).toEqual([[-0.5, 1.5], [2.5, 1.5], [2.5, -1.5], [-0.5, -1.5]]);
    expect(img.height).toBe(30); // near the equator Mercator is ~square
    expect(img.data.length).toBe(img.width * img.height * 4);
  });

  it('leaves land clear and shades water by band', () => {
    const img = renderShade(g, opts);
    const px = (i: number, j: number) => Array.from(img.data.slice((j * img.width + i) * 4, (j * img.width + i) * 4 + 4));
    expect(px(1, 15)[3]).toBe(0); // land
    expect(px(28, 15)).toEqual([1, 2, 3, Math.round(0.4 * 255)]); // 30 m on the flat: band 1, no relief change
  });

  it('cuts a hole where a finer grid draws', () => {
    const img = renderShade(g, { ...opts, hole: [1.5, -2, 3, 2] });
    expect(img.data[(15 * img.width + 28) * 4 + 3]).toBe(0);
  });

  it('follows the land mask over the coarse grid', () => {
    // Mask: west column water (surf zone the grid calls land), east column land (the grid calls it 30 m deep).
    const land: Grid = { cols: 3, rows: 3, lon0: 0, lat0: 1, dlon: 1, dlat: 1, z: new Uint8Array([0, 0, 1, 0, 0, 1, 0, 0, 1]) };
    const img = renderShade(g, { ...opts, land });
    const alpha = (i: number) => img.data[(15 * img.width + i) * 4 + 3];
    expect(alpha(28)).toBe(0); // masked land
    // Surf zone: shallowest band (0.5) at a third of the shore fade, times the relief from the beach slope.
    expect(alpha(1) / (0.5 * (1 / 3) * 255)).toBeCloseTo(1, 1);
  });
});
