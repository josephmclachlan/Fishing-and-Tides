import { describe, expect, it } from 'vitest';
import { FAR_ZONES, zoneTextSize, NEAR_ZONES, fishZones, levelOf, nearlyZones, speciesZones, zoneLabel, zoneRing, type ZoneCell } from './zones';

const STEP = 0.002;
/** A patch of cells around (lng, lat): `cols` east by `rows` north, all with the same scores. */
function patch(lng: number, lat: number, cols: number, rows: number, s: Record<'a' | 'b' | 'c', number>, why: ZoneCell['why'] = [], depthM = 6): ZoneCell<'a' | 'b' | 'c'>[] {
  const out: ZoneCell<'a' | 'b' | 'c'>[] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) out.push({ lng: lng + i * STEP, lat: lat + j * STEP, s, why, depthM: depthM + i });
  return out;
}

describe('fishing zones', () => {
  it('gathers each patch of good water into one zone and leaves poor water out', () => {
    const cells = [
      ...patch(-82.9, 9.8, 4, 3, { a: 0.9, b: 0.5, c: 0.1 }, ['mouth']),
      ...patch(-82.7, 9.67, 5, 2, { a: 0.2, b: 0.66, c: 0.62 }, ['reef', 'drop']),
      ...patch(-82.6, 9.6, 6, 6, { a: 0.3, b: 0.4, c: 0.5 }),
    ];
    const z = fishZones(cells);
    expect(z).toHaveLength(2);
    const [mouth, reef] = z;
    expect(mouth.species).toEqual(['a']);
    expect(mouth.level).toBe(3);
    expect(mouth.why).toBe('mouth');
    expect(mouth.lng).toBeCloseTo(-82.9 + 1.5 * STEP, 5);
    expect(mouth.lat).toBeCloseTo(9.8 + STEP, 5);
    expect(reef.species).toEqual(['b', 'c']);
    expect(reef.level).toBe(1);
    expect(reef.why).toBe('reef');
  });

  it('lays the oval along the patch, longer than wide', () => {
    const [z] = fishZones(patch(-82.8, 9.7, 8, 2, { a: 0.8, b: 0, c: 0 }));
    expect(Math.abs(z.rotDeg) % 180).toBeLessThan(5);
    expect(z.rxM).toBeGreaterThan(2 * z.ryM);
    expect(z.ryM).toBeGreaterThanOrEqual(280);
  });

  it('drops scraps too small to circle and keeps zones apart', () => {
    expect(fishZones(patch(-82.8, 9.7, 1, 2, { a: 0.9, b: 0, c: 0 }))).toHaveLength(0);
    const near = fishZones([...patch(-82.8, 9.7, 3, 3, { a: 0.9, b: 0, c: 0 }), ...patch(-82.8 + 0.012, 9.7, 3, 3, { a: 0.8, b: 0, c: 0 })], { radiusKm: 0.5 });
    expect(near).toHaveLength(1);
    expect(near[0].score).toBeCloseTo(0.9);
  });

  it('caps the count, best first', () => {
    const cells = Array.from({ length: 20 }, (_, i) => patch(-83 + i * 0.03, 9.7, 3, 3, { a: 0.6 + i * 0.01, b: 0, c: 0 })).flat();
    const z = fishZones(cells, { max: 5 });
    expect(z).toHaveLength(5);
    expect(z[0].score).toBeGreaterThan(z[4].score);
  });

  it('grades the level from the mean best score', () => {
    expect([0.6, 0.69, 0.7, 0.79, 0.8, 0.95].map(levelOf)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('draws a closed ring that stays in the sea when told where land is', () => {
    const [z] = fishZones(patch(-82.8, 9.7, 6, 3, { a: 0.8, b: 0, c: 0 }));
    const ring = zoneRing(z, 32);
    expect(ring).toHaveLength(33);
    expect(ring[0]).toEqual(ring[32]);
    const north = Math.max(...ring.map((p) => p[1]));
    const shore = z.lat + (0.5 * z.ryM) / 110574;
    expect(north).toBeGreaterThan(shore);
    const wet = zoneRing(z, 32, (_, lat) => lat < shore);
    expect(Math.max(...wet.map((p) => p[1]))).toBeLessThan(shore);
  });

  it('puts the name just outside the oval on the open-sea side', () => {
    const [z] = fishZones(patch(-82.8, 9.7, 6, 3, { a: 0.8, b: 0, c: 0 }));
    const ring = zoneRing(z, 32);
    const top = Math.max(...ring.map((p) => p[1])), bottom = Math.min(...ring.map((p) => p[1]));
    // Land to the south: the name goes above the oval.
    const north = zoneLabel(z, ring, (_, lat) => lat > z.lat - 0.004);
    expect(north.anchor).toBe('bottom');
    expect(north.at[1]).toBeCloseTo(top, 4);
    // Land to the east: to the west of it.
    const west = zoneLabel(z, ring, (lng) => lng < z.lng + 0.004);
    expect(west.anchor).toBe('right');
    expect(west.at[0]).toBeLessThan(z.lng);
    // Land to the north-west: down and to the right.
    expect(zoneLabel(z, ring, (lng, lat) => lat - z.lat < lng - z.lng).anchor).toBe('top-left');
    // Open sea all round: above.
    expect(zoneLabel(z, ring, () => true).anchor).toBe('bottom');
    expect(zoneLabel(z, ring).at[1]).toBeGreaterThan(bottom);
  });

  it('sizes the zone names by zoom as the style does', () => {
    expect([8, 9, 10, 11, 12, 13, 15].map(zoneTextSize)).toEqual([9.5, 9.5, 10, 10.5, 11.25, 12, 12]);
  });

  describe('per species', () => {
    const ids = ['a', 'b', 'c'] as const;
    it('gives each species its own zones, only where it earns them', () => {
      const cells = [
        ...patch(-82.9, 9.8, 4, 3, { a: 0.85, b: 0.1, c: 0 }, ['mouth']),
        ...patch(-82.7, 9.67, 4, 3, { a: 0, b: 0.75, c: 0 }, ['reef']),
        // c reaches the cell threshold but not the zone mean: no zone.
        ...patch(-82.6, 9.6, 4, 3, { a: 0, b: 0, c: 0.62 }),
      ];
      const z = speciesZones(cells, ids, NEAR_ZONES);
      expect(z.map((x) => x.species)).toEqual([['a'], ['b']]);
      expect(z.map((x) => x.level)).toEqual([3, 2]);
    });
    it('puts species that share water on one oval, best first, and caps zones per species', () => {
      const shared = patch(-82.8, 9.7, 4, 3, { a: 0.7, b: 0.9, c: 0.66 });
      const many = Array.from({ length: 6 }, (_, i) => patch(-83 + i * 0.05, 9.9, 3, 3, { a: 0.8, b: 0, c: 0 })).flat();
      const z = speciesZones([...shared, ...many], ids, NEAR_ZONES);
      // b leads the shared water and c joins it; a's three best zones are elsewhere, so the shared water is not a's.
      const one = z.find((x) => x.species.length > 1)!;
      expect(one.species).toEqual(['b', 'c']);
      expect(z.filter((x) => x.species.includes('a'))).toHaveLength(3);
      // Without the cap, a joins the shared oval too.
      const all = speciesZones([...shared, ...many], ids, { ...NEAR_ZONES, perSpecies: 9 });
      expect(all.find((x) => x.species.length > 1)!.species).toEqual(['b', 'a', 'c']);
    });
    it('outlines water that nearly earned a zone, never beside a kept one (PLAN 7.85)', () => {
      const cells = [
        ...patch(-82.9, 9.8, 4, 3, { a: 0.85, b: 0, c: 0 }),
        // b just misses the zone mean (the Playa Negra drop-off case).
        ...patch(-82.7, 9.67, 4, 3, { a: 0, b: 0.61, c: 0 }),
        // c misses beside a's kept zone: no dotted ring on top of a circled one.
        ...patch(-82.9, 9.8, 4, 3, { a: 0, b: 0, c: 0.6 }).map((x) => ({ ...x, lat: x.lat + 0.0005 })),
        // Poor water stays bare.
        ...patch(-82.5, 9.6, 4, 3, { a: 0.4, b: 0.4, c: 0.4 }),
      ];
      const kept = speciesZones(cells, ids, NEAR_ZONES);
      expect(kept.map((x) => x.species)).toEqual([['a']]);
      const nearly = nearlyZones(cells, ids, kept);
      expect(nearly.map((x) => x.species)).toEqual([['b']]);
      expect(nearly[0].lng).toBeCloseTo(-82.697, 2);
    });
    it('gathers boat water over kilometres', () => {
      const STEP2 = 0.02;
      const grid: ZoneCell<'a' | 'b' | 'c'>[] = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) grid.push({ lng: -82.5 + i * STEP2, lat: 9.8 + j * STEP2, s: { a: 0.8, b: 0, c: 0 }, why: ['front'], depthM: 400 });
      const [z] = speciesZones(grid, ids, FAR_ZONES);
      expect(z.species).toEqual(['a']);
      expect(z.why).toBe('front');
      expect(z.rxM).toBeGreaterThan(2000);
    });
  });
});
