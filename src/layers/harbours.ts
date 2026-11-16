/**
 * Harbour, pier and anchorage markers (PLAN 6.7): green rings with the place name from the coast
 * tier in. Style layer ids start with `an-` (catalog 'anchorages'). Unverified places draw fainter.
 */
import type { Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { firstSymbolId } from '../map';
import { PLACES } from '../data/harbours';
import { addGlyphImages, imageId } from '../icons/map-glyphs';
import { themeVar as cssColour } from './paint';

const { COAST, SPOT } = TIER_ZOOM;


export function mountHarbours(map: Map) {
  const ink = cssColour('--ink', '#0A1626');
  const halo = cssColour('--m-halo', '#ECEADF');
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
    addGlyphImages(map);
    map.addLayer({
      id: 'an-ring', type: 'symbol', source: 'an', minzoom: COAST,
      layout: { 'icon-image': imageId('anchor', 'ink'), 'icon-size': ['interpolate', ['linear'], ['zoom'], COAST, 0.6, SPOT + 2, 0.85], 'icon-allow-overlap': true },
      paint: { 'icon-opacity': ['case', ['get', 'check'], 0.6, 1] },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'an-label', type: 'symbol', source: 'an', minzoom: COAST + 1,
      layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [1.3, 0], 'text-letter-spacing': 0.08 },
      paint: { 'text-color': ink, 'text-halo-color': halo, 'text-halo-width': 1.6 },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
}
