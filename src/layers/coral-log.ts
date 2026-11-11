/**
 * Your logged coral sites (reef / nursery / garden) as labelled rings. Style ids start with `cs-`; tapping a ring opens the site's folder (coral-panel.ts).
 * Reads the private on-device store only; makes no requests.
 */
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { CoralStore } from '../coral/store';
import { firstSymbolId } from '../map';
import { paintColour as css } from './paint';

/** Style ids start with this; it must not match any registry mapPrefixes (CLARITY owns 'cl-'). */
export const CORAL_LOG_PREFIX = 'cs-';

export function mountCoralLogLayer(map: Map, store: CoralStore) {
  const amber = css('--amber', '#ffb000');
  const green = css('--green', '#39ff7a');
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const data = (): FeatureCollection => ({
    type: 'FeatureCollection',
    features: store.list().map((s) => ({ type: 'Feature', properties: { id: s.id, kind: s.kind, label: s.name }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })),
  });
  let ready = false;
  const refresh = () => ready && (map.getSource(`${CORAL_LOG_PREFIX}sites`) as GeoJSONSource | undefined)?.setData(data());
  const add = () => {
    if (map.getSource(`${CORAL_LOG_PREFIX}sites`)) return;
    map.addSource(`${CORAL_LOG_PREFIX}sites`, { type: 'geojson', data: empty });
    map.addLayer({ id: `${CORAL_LOG_PREFIX}sites`, type: 'circle', source: `${CORAL_LOG_PREFIX}sites`, paint: { 'circle-radius': 7, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ['match', ['get', 'kind'], 'reef', amber, green], 'circle-stroke-width': 2.5 } });
    map.addLayer({
      id: `${CORAL_LOG_PREFIX}label`, type: 'symbol', source: `${CORAL_LOG_PREFIX}sites`, filter: ['!=', ['get', 'label'], ''],
      layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [1, 0], 'text-letter-spacing': 0.08 },
      paint: { 'text-color': green, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    }, firstSymbolId(map));
    ready = true;
    refresh();
  };
  if (map.isStyleLoaded()) add();
  else map.once('style.load', add);
  store.subscribe(refresh);
}
