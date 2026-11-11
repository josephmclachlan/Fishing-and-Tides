/**
 * Surf break markers (PLAN 6.4): the curated catalog as amber rings with the break's name, from the
 * coast tier in; type and shape appear at the spot tier. Style layer ids start with `sb-`
 * (catalog 'surf'). Rings are coloured by the surf model's band (PLAN 6.3): green GOOD/EPIC,
 * amber FAIR, red POOR, dim when FLAT or not yet computed; the spot-tier label adds the score.
 */
import type { ExpressionSpecification, GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { TIER_ZOOM } from '../region';
import { t, type Key } from '../i18n';
import { firstSymbolId } from '../map';
import { SURF_BREAKS } from '../data/surf-breaks';
import type { SurfQuality } from '../surf-quality';
import { paintColour as cssColour } from './paint';

const { COAST, SPOT } = TIER_ZOOM;


export const breakLabel = (b: (typeof SURF_BREAKS)[number], detailed: boolean) =>
  detailed ? `${b.name}\n${t(`surf.type.${b.type}` as Key)} ${t(`surf.shape.${b.shape}` as Key)}` : b.name;

/** Features for the rings and labels, with each break's surf quality where known. */
export function breakFeatures(quality: (name: string) => SurfQuality | undefined): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: SURF_BREAKS.map((b) => {
      const q = quality(b.name);
      const rating = q ? `\n${t(`surf.band.${q.band}` as Key)} ${q.score.toFixed(1)}` : '';
      return {
        type: 'Feature',
        properties: { name: b.name, label: breakLabel(b, false), detail: breakLabel(b, true) + rating, check: b.confidence === 'check', band: q?.band ?? 'NONE' },
        geometry: { type: 'Point', coordinates: b.lngLat },
      };
    }),
  };
}

export function mountSurfBreaks(map: Map) {
  const amber = cssColour('--amber', '#ffb000');
  const green = cssColour('--green', '#39ff7a');
  const red = cssColour('--red', '#ff3b2f');
  let data = breakFeatures(() => undefined);
  const ringColour: ExpressionSpecification = ['match', ['get', 'band'], ['GOOD', 'EPIC'], green, 'POOR', red, amber];
  const add = () => {
    if (map.getSource('sb')) return;
    map.addSource('sb', { type: 'geojson', data });
    map.addLayer({
      id: 'sb-ring', type: 'circle', source: 'sb', minzoom: COAST + 1,
      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], COAST + 1, 5, SPOT + 2, 10], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ringColour, 'circle-stroke-width': ['match', ['get', 'band'], 'EPIC', 3.5, 2], 'circle-stroke-opacity': ['match', ['get', 'band'], ['FLAT', 'NONE'], 0.5, ['case', ['get', 'check'], 0.75, 1]] },
    }, firstSymbolId(map));
    map.addLayer({
      id: 'sb-label', type: 'symbol', source: 'sb', minzoom: COAST + 1.5,
      layout: {
        'text-field': ['step', ['zoom'], ['get', 'label'], SPOT, ['get', 'detail']],
        'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'right', 'text-offset': [-1, 0], 'text-justify': 'right', 'text-letter-spacing': 0.08,
      },
      paint: { 'text-color': ringColour, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
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
