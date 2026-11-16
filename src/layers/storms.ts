/**
 * Active tropical storm markers (PLAN 7.5): a red ring and the storm's name and category, from NHC via
 * the data build. Style layer ids start with `st-` (catalog 'weather'). The storms are usually far outside
 * the region, so the layer is added once and fed with `setStorms` when the data arrives.
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import { stormCategory, type Storm } from '../adapters/storms';
import { addGlyphImages, imageId } from '../icons/map-glyphs';
import { themeVar as cssColour } from './paint';


const toGeoJson = (storms: readonly Storm[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: storms.map((s) => ({
    type: 'Feature',
    properties: { label: `${s.name} ${stormCategory(s.windKt) ? 'CAT ' + stormCategory(s.windKt) : s.classification}`, hurricane: stormCategory(s.windKt) > 0 },
    geometry: { type: 'Point', coordinates: s.lngLat },
  })),
});

export function mountStorms(map: Map) {
  const ink = cssColour('--ink', '#0A1626');
  const halo = cssColour('--m-halo', '#ECEADF');
  let pending: readonly Storm[] = [];
  const add = () => {
    if (map.getSource('st')) return;
    map.addSource('st', { type: 'geojson', data: toGeoJson(pending) });
    addGlyphImages(map);
    // The WMO storm sign: red for a hurricane, amber for a tropical storm or depression.
    map.addLayer({
      id: 'st-ring', type: 'symbol', source: 'st',
      layout: { 'icon-image': ['case', ['get', 'hurricane'], imageId('storm', 'danger'), imageId('storm', 'caution')], 'icon-size': 1.1, 'icon-allow-overlap': true },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'st-label', type: 'symbol', source: 'st',
      layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-anchor': 'left', 'text-offset': [1.4, 0], 'text-letter-spacing': 0.08 },
      paint: { 'text-color': ink, 'text-halo-color': halo, 'text-halo-width': 1.6 },
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
