/**
 * Lightning flash markers (PLAN 7.6): small dots, red for the last 10 minutes and amber for older, from
 * the GLM collector. Style layer ids start with `lt-` (catalog 'lightning').
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import type { Flash } from '../lightning';
import { paintColour as cssColour } from './paint';


const toGeoJson = (flashes: readonly Flash[], now: number): FeatureCollection => ({
  type: 'FeatureCollection',
  features: flashes.map((f) => ({ type: 'Feature', properties: { fresh: now - f[0] <= 10 * 60000 }, geometry: { type: 'Point', coordinates: [f[1], f[2]] } })),
});

export function mountLightning(map: Map) {
  let pending: readonly Flash[] = [];
  const add = () => {
    if (map.getSource('lt')) return;
    map.addSource('lt', { type: 'geojson', data: toGeoJson(pending, Date.now()) });
    map.addLayer({
      id: 'lt-dot', type: 'circle', source: 'lt',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 12, 6],
        'circle-color': ['case', ['get', 'fresh'], cssColour('--red', '#ff3b30'), cssColour('--amber', '#ffb000')],
        'circle-opacity': 0.85, 'circle-stroke-color': '#000', 'circle-stroke-width': 1,
      },
    }, firstSymbolId(map));
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setFlashes(flashes: readonly Flash[]) {
      pending = flashes;
      (map.getSource('lt') as GeoJSONSource | undefined)?.setData(toGeoJson(flashes, Date.now()));
    },
  };
}
