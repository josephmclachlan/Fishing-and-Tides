/**
 * FISHING BOATS map layer (PLAN 7.19): where AIS-tracked fishing boats worked over the last year,
 * from Global Fishing Watch (adapters/effort.ts). One square per 0.1° cell, amber, firmer for
 * busier cells (thirds by rank). Style layer ids start with `ef-` (catalog 'effort').
 */
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import type { EffortCell } from '../adapters/effort';

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export interface EffortLayer {
  setCells(cells: readonly EffortCell[], step: number): void;
}

export function mountEffort(map: Map): EffortLayer {
  const amber = cssColour('--amber', '#ffb000');
  const data: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const add = () => {
    if (map.getSource('ef')) return;
    map.addSource('ef', { type: 'geojson', data, attribution: 'Fishing effort: Global Fishing Watch (CC BY-NC 4.0)' });
    const below = map.getLayer('sf-contour-deep') ? 'sf-contour-deep' : firstSymbolId(map);
    map.addLayer({ id: 'ef-fill', type: 'fill', source: 'ef', paint: { 'fill-color': amber, 'fill-opacity': ['match', ['get', 'level'], 3, 0.38, 2, 0.22, 0.1] } }, below);
    map.addLayer({ id: 'ef-line', type: 'line', source: 'ef', minzoom: 8, paint: { 'line-color': amber, 'line-width': 0.6, 'line-opacity': 0.35 } }, below);
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setCells(cells, step) {
      const h = step / 2;
      const r = (x: number) => Math.round(x * 1e4) / 1e4;
      data.features = cells.map((c) => ({
        type: 'Feature' as const,
        properties: { level: c.level, hours: Math.round(c.hours) },
        geometry: { type: 'Polygon' as const, coordinates: [[[r(c.lng - h), r(c.lat - h)], [r(c.lng + h), r(c.lat - h)], [r(c.lng + h), r(c.lat + h)], [r(c.lng - h), r(c.lat + h)], [r(c.lng - h), r(c.lat - h)]]] },
      }));
      (map.getSource('ef') as GeoJSONSource | undefined)?.setData(data);
    },
  };
}
