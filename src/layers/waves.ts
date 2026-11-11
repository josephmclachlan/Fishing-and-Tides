/**
 * Wave crest lines on the map (PLAN 6.9): short lines across the swell's direction of travel, thicker for
 * bigger waves, red from 2.5 m. Static and cheap (a MapLibre line layer, redrawn only when the slider
 * moves or data arrives), unlike the particle layers. Style layer ids start with `wv-` (catalog 'waves').
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import type { Crest } from '../waves-lines';
import { paintColour as cssColour } from './paint';


export const HIGH_SEA_M = 2.5;

const toGeoJson = (crests: readonly Crest[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: crests.map((c) => ({
    type: 'Feature',
    properties: { hs: c.hs, high: c.hs >= HIGH_SEA_M },
    geometry: { type: 'LineString', coordinates: c.line },
  })),
});

export function mountWavesLayer(map: Map) {
  let pending: readonly Crest[] = [];
  const add = () => {
    if (map.getSource('wv')) return;
    map.addSource('wv', { type: 'geojson', data: toGeoJson(pending) });
    map.addLayer({
      id: 'wv-crest', type: 'line', source: 'wv', minzoom: 6,
      layout: { 'line-cap': 'round' },
      paint: {
        'line-color': ['case', ['get', 'high'], cssColour('--red', '#ff3b30'), cssColour('--amber', '#ffb000')],
        'line-width': ['interpolate', ['linear'], ['get', 'hs'], 0.3, 1, 1.5, 2, 3, 3.5],
        'line-opacity': 0.75,
      },
    }, firstSymbolId(map));
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setCrests(crests: readonly Crest[]) {
      pending = crests;
      (map.getSource('wv') as GeoJSONSource | undefined)?.setData(toGeoJson(crests));
    },
  };
}
