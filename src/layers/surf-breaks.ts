/**
 * Surf break markers (PLAN 6.4): the curated catalog with the break's name, from the coast tier in; type and shape
 * appear at the spot tier. Style layer ids start with `sb-` (catalog 'surf'). Each break is the surf curl on a rating
 * square (PLAN 7.104 grammar: rated places keep the square), the square in the rating colour of the surf model's band
 * (PLAN 6.3): EPIC great, GOOD good, FAIR fair, POOR poor, grey when FLAT or not yet computed; the spot-tier label adds
 * the score.
 */
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { SPOTS, TIER_ZOOM } from '../region';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import { SURF_BREAKS } from '../data/surf-breaks';
import type { SurfQuality } from '../surf-quality';
import { themeVar } from './paint';
import { addGlyphImages, squareId } from '../icons/map-glyphs';

const { COAST, SPOT } = TIER_ZOOM;

/** A break that shares a spot's name is already named by the spot's box, so it gets no name of its own until the spot zoom. */
const SPOT_NAMES = new Set(SPOTS.map((s) => s.name.toUpperCase()));


export const breakLabel = (b: (typeof SURF_BREAKS)[number], detailed: boolean) =>
  detailed ? `${b.name}\n${t(`surf.type.${b.type}` as Key)} ${t(`surf.shape.${b.shape}` as Key)}` : b.name;

/** Features for the rings and labels, with each break's surf quality where known. */
export function breakFeatures(quality: (name: string) => SurfQuality | undefined): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: SURF_BREAKS.map((b) => {
      const q = quality(b.name);
      const rating = q ? `\n${t(`surf.band.${q.band}` as Key)} ${Math.round(q.score * 10)}/100` : '';
      return {
        type: 'Feature',
        properties: { name: b.name, label: SPOT_NAMES.has(b.name.toUpperCase()) ? '' : breakLabel(b, false), detail: breakLabel(b, true) + rating, check: b.confidence === 'check', band: q?.band ?? 'NONE' },
        geometry: { type: 'Point', coordinates: b.lngLat },
      };
    }),
  };
}

export function mountSurfBreaks(map: Map) {
  let data = breakFeatures(() => undefined);
  const add = () => {
    if (map.getSource('sb')) return;
    addGlyphImages(map);
    map.addSource('sb', { type: 'geojson', data });
    map.addLayer({
      id: 'sb-mark', type: 'symbol', source: 'sb', minzoom: COAST + 1,
      layout: {
        'icon-image': ['match', ['get', 'band'], 'EPIC', squareId('curl', '4'), 'GOOD', squareId('curl', '3'), 'FAIR', squareId('curl', '2'), 'POOR', squareId('curl', '1'), squareId('curl', 'n')],
        'icon-size': ['interpolate', ['linear'], ['zoom'], COAST + 1, 0.6, SPOT + 2, 0.95],
        'icon-allow-overlap': true,
      },
      paint: { 'icon-opacity': ['case', ['get', 'check'], 0.8, 1] },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'sb-label', type: 'symbol', source: 'sb', minzoom: COAST + 1.5,
      layout: {
        'text-field': ['step', ['zoom'], ['get', 'label'], SPOT, ['get', 'detail']],
        'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'right', 'text-offset': [-1.2, 0], 'text-justify': 'right', 'text-letter-spacing': 0.08,
      },
      paint: { 'text-color': themeVar('--ink', '#0A1626'), 'text-halo-color': themeVar('--m-halo', '#ECEADF'), 'text-halo-width': 1.6 },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  return {
    /** Recolour and relabel from the latest surf model run. */
    update(quality: (name: string) => SurfQuality | undefined) {
      data = breakFeatures(quality);
      (map.getSource('sb') as GeoJSONSource | undefined)?.setData(data);
    },
  };
}
