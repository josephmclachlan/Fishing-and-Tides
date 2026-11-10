import { describe, expect, it } from 'vitest';
import { SPOTS } from './region';
import { SNORKEL_SPOTS } from './data/snorkel-spots';
import { SURF_BREAKS } from './data/surf-breaks';
import { haversineM } from './geo';
import { seaDepthAt } from './layers/clarity';
import { land, realDepth, region } from './physics/fixtures/seafloor';
import { shoreNormal } from './physics/surf-zone';

const off = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const bearing = (from: [number, number], to: [number, number]) => {
  const dx = (to[0] - from[0]) * Math.cos((from[1] * Math.PI) / 180), dy = to[1] - from[1];
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
};

describe('named spots (Joseph, 2026-11-10)', () => {
  it("are Joseph's list after the coastline review (PLAN 7.61), north to south", () => {
    expect(SPOTS.map((s) => s.name)).toEqual([
      'PLAYA NEGRA CAHUITA', 'PLAYA BLANCA', 'PUNTA CAHUITA', 'PLAYA NEGRA', 'SALSA BRAVA', 'PLAYA COCLES',
      'PLAYA CHIQUITA WEST', 'PLAYA CHIQUITA EAST', 'PUNTA UVA', 'PLAYA GRANDE', 'MANZANILLO', 'PUNTA MONA', 'GANDOCA',
    ]);
    for (let i = 1; i < SPOTS.length; i++) expect(SPOTS[i].lngLat[0], SPOTS[i].name).toBeGreaterThan(SPOTS[i - 1].lngLat[0]);
  });

  it('sit at the shore, facing the way the coastline does', () => {
    const R = Math.PI / 180;
    for (const s of SPOTS) {
      // The pins are on land in OpenStreetMap; the app's ~33 m land mask can put the waterline up to 40 m inland of it.
      const inland = [0, 10, 20, 30, 40, 50].some((m) => {
        const b = (s.facing + 180) * R;
        return seaDepthAt({ elevation: region, land }, s.lngLat[0] + (m * Math.sin(b)) / (111320 * Math.cos(s.lngLat[1] * R)), s.lngLat[1] + (m * Math.cos(b)) / 110574) === null;
      });
      expect(inland, `${s.name} is more than 50 m out to sea`).toBe(true);
      const n = shoreNormal(realDepth, s.lngLat)!;
      expect(off(n, s.facing), `${s.name}: land mask ${n.toFixed(0)}° vs ${s.facing}°`).toBeLessThan(30);
    }
  });

  it('read the sea in front of their own beach, in real water', () => {
    for (const s of SPOTS) {
      const m = haversineM(s.lngLat, s.sea);
      expect(m, s.name).toBeGreaterThanOrEqual(290);
      expect(m, s.name).toBeLessThanOrEqual(1500);
      expect(off(bearing(s.lngLat, s.sea), s.facing), s.name).toBeLessThan(5);
      expect(seaDepthAt({ elevation: region, land }, ...s.sea)!, s.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('carry their surf break and snorkel entries at the same pin and facing', () => {
    for (const b of SURF_BREAKS) {
      const s = SPOTS.find((x) => x.name === b.name);
      expect(s, b.name).toBeDefined();
      expect(b.lngLat).toEqual(s!.lngLat);
      expect(off(b.facing, s!.facing), b.name).toBeLessThanOrEqual(5);
    }
    for (const k of SNORKEL_SPOTS) {
      const s = SPOTS.find((x) => x.name === k.spot)!;
      expect(k.lngLat, k.id).toEqual(s.lngLat);
      expect(k.facing, k.id).toBe(s.facing);
    }
  });
});
