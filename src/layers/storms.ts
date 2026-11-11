/**
 * Active tropical storm markers (PLAN 7.5): a red ring and the storm's name and category, from NHC via
 * the data build. Style layer ids start with `st-` (catalog 'weather'). The storms are usually far outside
 * the region, so the layer is added once and fed with `setStorms` when the data arrives.
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import { stormCategory, type Storm } from '../adapters/storms';
import { paintColour as cssColour } from './paint';


const toGeoJson = (storms: readonly Storm[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: storms.map((s) => ({
    type: 'Feature',
    properties: { label: `${s.name} ${stormCategory(s.windKt) ? 'CAT ' + stormCategory(s.windKt) : s.classification}` },
    geometry: { type: 'Point', coordinates: s.lngLat },
  })),
});

export function mountStorms(map: Map) {
  const red = cssColour('--red', '#ff3b30');
  let pending: readonly Storm[] = [];
  const add = () => {
    if (map.getSource('st')) return;
    map.addSource('st', { type: 'geojson', data: toGeoJson(pending) });
    map.addLayer({
      id: 'st-ring', type: 'circle', source: 'st',
      paint: { 'circle-radius': 9, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': red, 'circle-stroke-width': 3 },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'st-label', type: 'symbol', source: 'st',
      layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-anchor': 'left', 'text-offset': [1.2, 0], 'text-letter-spacing': 0.08 },
      paint: { 'text-color': red, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setStorms(storms: readonly Storm[]) {
      pending = storms;
      (map.getSource('st') as GeoJSONSource | undefined)?.setData(toGeoJson(storms));
    },
  };
}
