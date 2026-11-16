/**
 * AIS ships (PLAN 7.97, symbol 7.104): last known positions from the data build, each a ship pointing along its course
 * over ground, with a short label (name and speed). Ships are neutral, so ink (colour is kept for rating and danger):
 * cargo, tanker and passenger ships draw larger than the rest; faint when the fix is over 3 h old; a ship with no
 * course (anchored, or not reported) sits upright.
 * Style layer ids start with `ai-` (catalog 'ais').
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import { shipClass, type Vessel } from '../adapters/ais-parse';
import { themeVar } from './paint';
import { addGlyphImages, imageId } from '../icons/map-glyphs';

const FONT = ['Noto Sans Regular'];

const toGeoJson = (vessels: readonly Vessel[], now: number): FeatureCollection => ({
  type: 'FeatureCollection',
  features: vessels.map((v) => {
    const cls = shipClass(v.type);
    const age = now - v.seenMs;
    const kt = Number.isFinite(v.sogKt) && v.sogKt >= 0.5 ? ` ${v.sogKt.toFixed(1)} KT` : '';
    return {
      type: 'Feature',
      properties: { label: `${v.name || v.mmsi}${kt}`, cog: Number.isFinite(v.cogDeg) && v.sogKt >= 0.5 ? Math.round(v.cogDeg) : -1, big: cls === 'cargo' || cls === 'tanker' || cls === 'passenger', old: age > 3 * 3.6e6 },
      geometry: { type: 'Point', coordinates: v.lngLat },
    };
  }),
});

export function mountAis(map: Map) {
  let pending: readonly Vessel[] = [];
  const add = () => {
    if (map.getSource('ai')) return;
    addGlyphImages(map);
    map.addSource('ai', { type: 'geojson', data: toGeoJson(pending, Date.now()) });
    map.addLayer({
      id: 'ai-ship', type: 'symbol', source: 'ai',
      layout: {
        'icon-image': imageId('ship', 'ink'),
        'icon-rotate': ['case', ['>=', ['get', 'cog'], 0], ['get', 'cog'], 0], 'icon-rotation-alignment': 'map',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['get', 'big'], 0.6, 0.45], 12, ['case', ['get', 'big'], 1.1, 0.8]],
        'icon-allow-overlap': true, 'icon-ignore-placement': true,
      },
      paint: { 'icon-opacity': ['case', ['get', 'old'], 0.4, 1] },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'ai-label', type: 'symbol', source: 'ai', minzoom: 9,
      layout: { 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 10, 'text-anchor': 'left', 'text-offset': [1.1, 0], 'text-letter-spacing': 0.06, 'text-max-width': 16 },
      paint: { 'text-color': themeVar('--ink', '#0A1626'), 'text-halo-color': themeVar('--m-halo', '#ECEADF'), 'text-halo-width': 1.6, 'text-opacity': ['case', ['get', 'old'], 0.6, 1] },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setVessels(vessels: readonly Vessel[]) {
      pending = vessels;
      (map.getSource('ai') as GeoJSONSource | undefined)?.setData(toGeoJson(vessels, Date.now()));
    },
  };
}
