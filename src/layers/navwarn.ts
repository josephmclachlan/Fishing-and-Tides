/**
 * NAVAREA IV warnings on the map (PLAN 7.93, symbol 7.104): each warning in force that carries a position is a warning
 * diamond there, the one shape that means "an official notice to act on". Amber for a notice, red when it closes water
 * (closed areas, firing and other no-go areas). The text stays in BOAT MODE under NAV WARNINGS; the map shows where.
 * Style layer ids start with `sf-marks-` so the SEAMARKS switch carries them (catalog 'seamarks').
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { NavWarning } from '../adapters/navwarn-parse';
import { addGlyphImages, imageId } from '../icons/map-glyphs';
import { themeVar } from './paint';

/** Words that mean the water is closed, not just a notice. */
const CLOSES = /\b(CLOSED|PROHIBITED|PROHIBIDO|FORBIDDEN|FIRING|GUNNERY|NO[- ]GO|KEEP CLEAR|EXCLUSION)\b/i;

/** Warnings with a position as points, `closes` when the text closes water. Pure. */
export const navWarnFeatures = (warnings: readonly NavWarning[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: warnings
    .filter((w) => w.lngLat)
    .map((w) => ({ type: 'Feature', properties: { id: w.id, closes: CLOSES.test(w.text) }, geometry: { type: 'Point', coordinates: w.lngLat! } })),
});

export function mountNavWarnings(map: Map) {
  let data = navWarnFeatures([]);
  const add = () => {
    if (map.getSource('nw')) return;
    addGlyphImages(map);
    map.addSource('nw', { type: 'geojson', data });
    map.addLayer({
      id: 'sf-marks-navwarn', type: 'symbol', source: 'nw',
      layout: {
        'icon-image': ['case', ['get', 'closes'], imageId('warn', 'danger'), imageId('warn', 'caution')],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 12, 0.95],
        'icon-allow-overlap': true, 'icon-ignore-placement': true,
        'text-field': ['step', ['zoom'], '', 10, ['get', 'id']], 'text-font': ['Noto Sans Bold'], 'text-size': 10,
        'text-anchor': 'top', 'text-offset': [0, 1.3], 'text-max-width': 20, 'text-letter-spacing': 0.06, 'text-optional': true,
      },
      paint: { 'text-color': themeVar('--ink', '#0A1626'), 'text-halo-color': themeVar('--m-halo', '#ECEADF'), 'text-halo-width': 1.6 },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    setWarnings(warnings: readonly NavWarning[]) {
      data = navWarnFeatures(warnings);
      (map.getSource('nw') as GeoJSONSource | undefined)?.setData(data);
    },
  };
}
