/**
 * FRONTS map layer (PLAN 7.17): where the newest satellite map shows sea temperature (amber) or
 * chlorophyll (green) changing fast, from physics/fronts.ts. Offshore boat fish (mahi, tuna, wahoo,
 * kingfish) hunt along these edges. Dots sized by strength, drawn at every tier; style layer ids
 * start with `fr-` (catalog 'fronts').
 */
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import { FRONT_FLOOR, frontCells, type FrontCell } from '../physics/fronts';
import type { SatelliteData } from '../adapters/satellite';
import type { GridSeries } from '../adapters/pack';

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** Fronts in the newest frame of each satellite map: SST from the macro grid and the coast nest, chlorophyll from its grid. */
export function satelliteFronts(d: SatelliteData): FrontCell[] {
  const newest = (s: GridSeries | null, v: string) => {
    const f = s?.values[v];
    return s && f?.length ? frontCells(f[f.length - 1], s.meta.grid, v === 'chl' ? 'chl' : 'sst') : [];
  };
  return [...newest(d.sst, 'sst'), ...newest(d.sstCoast, 'sst'), ...newest(d.chl, 'chl')];
}

export interface FrontsLayer {
  setFronts(cells: readonly FrontCell[]): void;
}

export function mountFronts(map: Map): FrontsLayer {
  const amber = cssColour('--amber', '#ffb000');
  const green = cssColour('--green', '#39ff7a');
  const data: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const add = () => {
    if (map.getSource('fr')) return;
    map.addSource('fr', { type: 'geojson', data, attribution: 'Fronts from MUR SST and VIIRS chlorophyll, NOAA CoastWatch' });
    map.addLayer({
      id: 'fr-dots', type: 'circle', source: 'fr',
      paint: {
        'circle-color': ['match', ['get', 'kind'], 'chl', green, amber],
        // Radius grows with strength as a multiple of the floor (1x to 4x), and with zoom.
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, ['interpolate', ['linear'], ['get', 'x'], 1, 1.2, 4, 3], 12, ['interpolate', ['linear'], ['get', 'x'], 1, 2.5, 4, 6]],
        'circle-opacity': 0.75,
        'circle-blur': 0.4,
      },
    }, firstSymbolId(map));
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setFronts(cells) {
      data.features = cells.map((c) => ({
        type: 'Feature' as const,
        properties: { kind: c.kind, x: Math.round((c.strength / FRONT_FLOOR[c.kind]) * 10) / 10 },
        geometry: { type: 'Point' as const, coordinates: [Math.round(c.lng * 1e4) / 1e4, Math.round(c.lat * 1e4) / 1e4] },
      }));
      (map.getSource('fr') as GeoJSONSource | undefined)?.setData(data);
    },
  };
}
