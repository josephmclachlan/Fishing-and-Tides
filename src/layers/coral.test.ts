import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import { reefPoints, reefPolygons, toneOf } from './coral';
import type { CoralData } from '../adapters/coral';

const REEFS = [
  { id: 'a', name: 'A', lngLat: [-82.8, 9.74] as [number, number] },
  { id: 'b', name: 'B', lngLat: [-82.6, 9.62] as [number, number] },
];
const data: CoralData = {
  fetchedAt: '2026-11-04T00:00:00Z', licence: 'x', days: [1, 2],
  reefs: [
    { id: 'a', name: 'A', lngLat: REEFS[0].lngLat, pixel: REEFS[0].lngLat, dhw: [1, 3.14], hotspot: [0.5, 0.9], sstAnomaly: [1, 1], sst: [29, 29], baa: [1, 1] },
    { id: 'b', name: 'B', lngLat: REEFS[1].lngLat, pixel: REEFS[1].lngLat, dhw: [8, 9], hotspot: [2, 2], sstAnomaly: [2, 2], sst: [30, 30], baa: [4, 4] },
  ],
};
const square = (x: number, y: number, props: Record<string, unknown>) => ({ type: 'Feature' as const, properties: props, geometry: { type: 'Polygon' as const, coordinates: [[[x, y], [x + 0.01, y], [x + 0.01, y + 0.01], [x, y]]] } });

describe('coral overlay layer', () => {
  it('tones follow the alert level', () => {
    expect([null, 0, 1, 2, 3, 4].map(toneOf)).toEqual(['dim', 'green', 'amber', 'amber', 'red', 'red']);
  });
  it('labels each reef with its DHW and alert, dim when the feed is missing', () => {
    const fc = reefPoints(data, REEFS);
    expect(fc.features.map((f) => f.properties!.tone)).toEqual(['amber', 'red']);
    expect(fc.features[0].properties!.detail).toMatch(/^A\nDHW 3\.1 · /);
    expect(reefPoints(null, REEFS).features.every((f) => f.properties!.tone === 'dim')).toBe(true);
  });
  it('shades reef polygons by the nearest reef and skips lagoons and bottom cover', () => {
    const osm: FeatureCollection = { type: 'FeatureCollection', features: [square(-82.81, 9.73, { kind: 'reef-area' }), square(-82.81, 9.73, { kind: 'wreck' })] };
    const aca: FeatureCollection = { type: 'FeatureCollection', features: [square(-82.61, 9.61, { layer: 'zone', cls: 'REEF CREST' }), square(-82.61, 9.61, { layer: 'zone', cls: 'SHALLOW LAGOON' }), square(-82.61, 9.61, { layer: 'bottom', cls: 'CORAL/ALGAE' })] };
    const out = reefPolygons(data, [osm, aca]);
    expect(out.features.map((f) => f.properties!.tone)).toEqual(['amber', 'red']);
  });
});
