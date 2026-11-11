/**
 * Harbour, pier and anchorage markers (PLAN 6.7): green rings with the place name from the coast
 * tier in. Style layer ids start with `an-` (catalog 'anchorages'). Unverified places draw fainter.
 */
import type { Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { firstSymbolId } from '../map';
import { PLACES } from '../data/harbours';
import { paintColour as cssColour } from './paint';

const { COAST, SPOT } = TIER_ZOOM;


export function mountHarbours(map: Map) {
  const green = cssColour('--green', '#3cff8c');
  const data: FeatureCollection = {
    type: 'FeatureCollection',
    features: PLACES.map((p) => ({
      type: 'Feature',
      properties: { name: p.name, check: p.confidence === 'check' },
      geometry: { type: 'Point', coordinates: p.lngLat },
    })),
  };
  const add = () => {
    if (map.getSource('an')) return;
    map.addSource('an', { type: 'geojson', data });
    map.addLayer({
      id: 'an-ring', type: 'circle', source: 'an', minzoom: COAST,
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], COAST, 4, SPOT + 2, 9], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': green, 'circle-stroke-width': 2, 'circle-stroke-opacity': ['case', ['get', 'check'], 0.7, 1] },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'an-label', type: 'symbol', source: 'an', minzoom: COAST + 1,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [1, 0], 'text-letter-spacing': 0.08 },
      paint: { 'text-color': green, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
}
