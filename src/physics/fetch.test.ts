import { describe, expect, it } from 'vitest';
import type { Grid } from './bathy';
import { shelterClass, windFetchM } from './fetch';

/** 0.2° square world, 0.0003° cells: land for lng < 0.05 (a coast facing east), sea elsewhere. */
const n = 667;
const d = 0.0003;
const land: Grid = { cols: n, rows: n, lon0: 0, lat0: 0.2, dlon: d, dlat: d, z: Float32Array.from({ length: n * n }, (_, i) => ((i % n) * d < 0.05 ? 1 : 0)) };

describe('windFetchM', () => {
  it('is the distance to land upwind', () => {
    // 0.1° east of the coast = ~11 km; wind from the west blows across the land, from the east across the sea.
    const west = windFetchM(land, 0.15, 0.1, 270);
    expect(west).toBeGreaterThan(10_000);
    expect(west).toBeLessThan(11_300);
    expect(windFetchM(land, 0.15, 0.1, 90, 30_000)).toBe(30_000);
  });
  it('is short right behind the coast and 0 on land', () => {
    expect(windFetchM(land, 0.0505, 0.1, 270)).toBeLessThan(200);
    expect(windFetchM(land, 0.01, 0.1, 90)).toBe(0);
  });
  it('follows the bearing', () => {
    expect(windFetchM(land, 0.0505, 0.1, 0)).toBe(30_000); // along the coast: nothing blocks
  });
});

describe('shelterClass', () => {
  it('bands the fetch', () => {
    expect(shelterClass(500)).toBe('sheltered');
    expect(shelterClass(5000)).toBe('partial');
    expect(shelterClass(20_000)).toBe('exposed');
  });
});
