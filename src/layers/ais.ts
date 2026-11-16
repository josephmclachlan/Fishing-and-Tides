/**
 * AIS ships (PLAN 7.97): last known positions from the data build, as dots with a short label (name and speed).
 * Colour by size class: green passenger and cargo, amber the rest, dim when the fix is over 3 h old.
 * Style layer ids start with `ai-` (catalog 'ais').
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import { shipClass, type Vessel } from '../adapters/ais-parse';
import { paintColour as cssColour } from './paint';

const FONT = ['Noto Sans Regular'];

const toGeoJson = (vessels: readonly Vessel[], now: number): FeatureCollection => ({
  type: 'FeatureCollection',
  features: vessels.map((v) => {
    const cls = shipClass(v.type);
    const age = now - v.seenMs;
    const kt = Number.isFinite(v.sogKt) && v.sogKt >= 0.5 ? ` ${v.sogKt.toFixed(1)} KT` : '';
    return {
      type: 'Feature',
      properties: { label: `${v.name || v.mmsi}${kt}`, big: cls === 'cargo' || cls === 'tanker' || cls === 'passenger', old: age > 3 * 3.6e6 },
      geometry: { type: 'Point', coordinates: v.lngLat },
    };
  }),
});

export function mountAis(map: Map) {
  let pending: readonly Vessel[] = [];
  const add = () => {
    if (map.getSource('ai')) return;
    const green = cssColour('--green', '#39ff7a');
    const amber = cssColour('--amber', '#ffb000');
    map.addSource('ai', { type: 'geojson', data: toGeoJson(pending, Date.now()) });
    map.addLayer({
      id: 'ai-dot', type: 'circle', source: 'ai',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 12, 6],
        'circle-color': ['case', ['get', 'big'], green, amber],
        'circle-opacity': ['case', ['get', 'old'], 0.4, 0.95], 'circle-stroke-color': '#000', 'circle-stroke-width': 1,
      },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'ai-label', type: 'symbol', source: 'ai', minzoom: 9,
      layout: { 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 10, 'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-letter-spacing': 0.06 },
      paint: { 'text-color': ['case', ['get', 'big'], green, amber], 'text-halo-color': '#000', 'text-halo-width': 1.5 },
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
