/**
 * Your logged coral sites (reef / nursery / garden) as labelled rings. Style ids start with `cl-`.
 * Reads the private on-device store only; makes no requests.
 */
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { CoralStore } from '../coral/store';
import { firstSymbolId } from '../map';

const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export function mountCoralLogLayer(map: Map, store: CoralStore) {
  const amber = css('--amber', '#ffb000');
  const green = css('--green', '#39ff7a');
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
  const data = (): FeatureCollection => ({
    type: 'FeatureCollection',
    features: store.list().map((s) => ({ type: 'Feature', properties: { kind: s.kind, label: s.name }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })),
  });
  let ready = false;
  const refresh = () => ready && (map.getSource('cl-sites') as GeoJSONSource | undefined)?.setData(data());
  const add = () => {
    if (map.getSource('cl-sites')) return;
    map.addSource('cl-sites', { type: 'geojson', data: empty });
    map.addLayer({ id: 'cl-sites', type: 'circle', source: 'cl-sites', paint: { 'circle-radius': 7, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ['match', ['get', 'kind'], 'reef', amber, green], 'circle-stroke-width': 2.5 } });
    map.addLayer({
      id: 'cl-label', type: 'symbol', source: 'cl-sites', filter: ['!=', ['get', 'label'], ''],
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
