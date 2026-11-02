import { describe, expect, it } from 'vitest';
import type { Grid } from '../physics/bathy';
import { buildCells, cellIndexAt, coastDistanceM, mouthKm, STEP } from './cells';

/** 0.1° x 0.1° test world: land for lng < 0.02, sea deepening eastward, one reef square. */
const mk = (fn: (lng: number, lat: number) => number, d: number, n: number): Grid => ({
  cols: n, rows: n, lon0: 0, lat0: 0.1, dlon: d, dlat: d,
  z: Float32Array.from({ length: n * n }, (_, i) => fn((i % n) * d, 0.1 - Math.floor(i / n) * d)),
});
const land = mk((lng) => (lng < 0.02 ? 1 : 0), 0.0002, 501);
const region = mk((lng) => (lng < 0.02 ? 5 : -(lng - 0.02) * 1000), 0.004, 26);
const reefs = { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: { layer: 'zone', cls: 'REEF CREST' }, geometry: { type: 'Polygon' as const, coordinates: [[[0.03, 0.04], [0.04, 0.04], [0.04, 0.06], [0.03, 0.06], [0.03, 0.04]]] } }] };
const mouths = [{ name: 'Río X', rank: 1, at: [0.02, 0.05] as [number, number] }];
const built = buildCells({ region, land, reefs, mouths, bounds: [0, 0, 0.1, 0.1] });

describe('fishing cells', () => {
  it('keeps only open water within reach of the coast', () => {
    expect(built.cells.length).toBeGreaterThan(50);
    for (const c of built.cells) {
      expect(c.lng).toBeGreaterThan(0.02);
      expect(c.f.depthM).toBeGreaterThan(0);
      expect(c.lng).toBeLessThan(0.02 + 0.0140 + STEP); // 1.5 km ≈ 0.0135°
    }
  });
  it('measures distance to coast and to the mouth', () => {
    expect(coastDistanceM(land, 0.0301, 0.05)).toBeGreaterThan(900);
    expect(coastDistanceM(land, 0.0301, 0.05)).toBeLessThanOrEqual(1200);
    expect(coastDistanceM(land, 0.09, 0.05)).toBe(Infinity);
    expect(mouthKm(mouths, 0.02, 0.05)).toBe(0);
    expect(mouthKm([{ ...mouths[0], rank: 0.5 }], 0.03, 0.05)).toBeCloseTo(2 * mouthKm(mouths, 0.03, 0.05));
  });
  it('flags reef cover and finds a cell by position', () => {
    const i = cellIndexAt(built.lattice, built.index, 0.0311, 0.05);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(built.cells[i].f.reef).toBeGreaterThan(0.5);
    expect(built.cells[cellIndexAt(built.lattice, built.index, 0.0251, 0.08)].f.reef).toBe(0);
    expect(cellIndexAt(built.lattice, built.index, 0.5, 0.5)).toBe(-1);
  });
  it('reads slope from the depth grid', () => {
    expect(built.cells[0].f.slopeMPerKm).toBeGreaterThan(5);
  });
});
