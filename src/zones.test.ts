import { describe, expect, it } from 'vitest';
import { stitchRings, type LngLat } from './zones';
import { zoneAt } from './zone-lookup';

import raw from '../public/data/zones/zones.geojson?raw';

const zones = JSON.parse(raw);

describe('stitchRings', () => {
  const sq: LngLat[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  it('joins shuffled and reversed ways into one closed ring', () => {
    const a: LngLat[] = [sq[0], sq[1]];
    const b: LngLat[] = [sq[2], sq[1]]; // reversed
    const c: LngLat[] = [sq[2], sq[3], sq[0]];
    const rings = stitchRings([c, a, b]);
    expect(rings).toHaveLength(1);
    expect(rings[0][0]).toEqual(rings[0].at(-1));
    expect(rings[0]).toHaveLength(5);
  });
  it('drops fragments that never close', () => {
    expect(stitchRings([[[0, 0], [1, 1]]])).toEqual([]);
  });
  it('keeps separate rings', () => {
    const r2: LngLat[] = [[5, 5], [6, 5], [6, 6], [5, 5]];
    expect(stitchRings([[...sq, sq[0]], r2])).toHaveLength(2);
  });
});

describe('shipped zones', () => {
  const polys = zones.features.map((f: any) => ({ props: f.properties, rings: f.geometry.coordinates.map((p: any) => p[0]) }));
  it('finds Cahuita (offshore) and Gandoca-Manzanillo, and nothing at Limón', () => {
    expect(zoneAt(polys, [-82.8, 9.74])?.id).toBe('cahuita');
    expect(zoneAt(polys, [-82.62, 9.62])?.id).toBe('gandoca');
    expect(zoneAt(polys, [-83.02, 9.99])).toBeNull();
  });
  it('has every zone name and status in the English text', async () => {
    const { en } = await import('./i18n/en');
    for (const p of polys) {
      expect(`zone.${p.props.id}.name` in en).toBe(true);
      expect(`zone.status.${p.props.status}` in en).toBe(true);
    }
  });
});
