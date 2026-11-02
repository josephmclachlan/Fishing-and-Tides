/**
 * Surf break markers (PLAN 6.4): the curated catalog as amber rings with the break's name, from the
 * coast tier in; type and shape appear at the spot tier. Style layer ids start with `sb-`
 * (catalog 'surf'). The quality colouring comes with the surf model (PLAN 6.3).
 */
import type { Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import { SURF_BREAKS } from '../data/surf-breaks';

const { COAST, SPOT } = TIER_ZOOM;

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export const breakLabel = (b: (typeof SURF_BREAKS)[number], detailed: boolean) =>
  detailed ? `${b.name}\n${t(`surf.type.${b.type}` as Key)} ${t(`surf.shape.${b.shape}` as Key)}` : b.name;

export function mountSurfBreaks(map: Map) {
  const amber = cssColour('--amber', '#ffb000');
  const data: FeatureCollection = {
    type: 'FeatureCollection',
    features: SURF_BREAKS.map((b) => ({
      type: 'Feature',
      properties: { name: b.name, label: breakLabel(b, false), detail: breakLabel(b, true), check: b.confidence === 'check' },
      geometry: { type: 'Point', coordinates: b.lngLat },
    })),
  };
  const add = () => {
    if (map.getSource('sb')) return;
    map.addSource('sb', { type: 'geojson', data });
    map.addLayer({
      id: 'sb-ring', type: 'circle', source: 'sb', minzoom: COAST + 1,
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], COAST + 1, 5, SPOT + 2, 10], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': amber, 'circle-stroke-width': 2, 'circle-stroke-opacity': ['case', ['get', 'check'], 0.7, 1] },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'sb-label', type: 'symbol', source: 'sb', minzoom: COAST + 1.5,
      layout: {
        'text-field': ['step', ['zoom'], ['get', 'label'], SPOT, ['get', 'detail']],
        'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'right', 'text-offset': [-1, 0], 'text-justify': 'right', 'text-letter-spacing': 0.08,
      },
      paint: { 'text-color': amber, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
}
