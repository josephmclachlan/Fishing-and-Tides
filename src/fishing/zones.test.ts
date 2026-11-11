import { describe, expect, it } from 'vitest';
import { fishZones, levelOf, zoneLabel, zoneRing, type ZoneCell } from './zones';

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
    expect(reef.level).toBe(2);
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
    expect([0.55, 0.6, 0.74, 0.75, 0.95].map(levelOf)).toEqual([1, 2, 2, 3, 3]);
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
});
