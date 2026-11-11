/**
 * Boat track layer (PLAN 4.6): the recorded track as an amber line, pins as green rings (catches
 * with a label), and the boat's current position. Style layer ids start with `bt-`, controlled
 * by the FISHING toggle (catalog prefix). Reads the store; makes no requests.
 */
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { t, type Key } from '../i18n';
import type { BoatStore } from '../boat/store';
import { firstSymbolId } from '../map';
import { paintColour as cssColour } from './paint';


export function mountBoatLayer(map: Map, store: BoatStore, position: () => [number, number] | null) {
  let routeLine: [number, number][] = [];
  const amber = cssColour('--amber', '#ffb000');
  const green = cssColour('--green', '#39ff7a');
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };

  const data = (): { track: FeatureCollection; pins: FeatureCollection; pos: FeatureCollection } => {
    const s = store.state();
    const track: Feature[] = s.points.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: s.points.map((p) => [p.lng, p.lat]) } }] : [];
    const pins: Feature[] = s.pins.map((p) => ({
      type: 'Feature',
      properties: { kind: p.kind, label: p.kind === 'catch' ? t(`boat.sp.${p.species ?? 'other'}` as Key) : '' },
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    }));
    const at = position();
    const pos: Feature[] = at ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: at } }] : [];
    return { track: { type: 'FeatureCollection', features: track }, pins: { type: 'FeatureCollection', features: pins }, pos: { type: 'FeatureCollection', features: pos } };
  };

  let ready = false;
  let queued = false;
  const refresh = () => {
    queued = false;
    if (!ready) return;
    const d = data();
    (map.getSource('bt-track') as GeoJSONSource | undefined)?.setData(d.track);
    (map.getSource('bt-pins') as GeoJSONSource | undefined)?.setData(d.pins);
    (map.getSource('bt-pos') as GeoJSONSource | undefined)?.setData(d.pos);
    (map.getSource('bt-route') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: routeLine.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeLine } }] : [] });
  };
  const add = () => {
    if (map.getSource('bt-track')) return;
    const before = firstSymbolId(map);
    map.addSource('bt-track', { type: 'geojson', data: empty });
    map.addSource('bt-pins', { type: 'geojson', data: empty });
    map.addSource('bt-pos', { type: 'geojson', data: empty });
    map.addSource('bt-route', { type: 'geojson', data: empty });
    map.addLayer({ id: 'bt-route', type: 'line', source: 'bt-route', paint: { 'line-color': green, 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } });
    map.addLayer({ id: 'bt-track', type: 'line', source: 'bt-track', paint: { 'line-color': amber, 'line-width': 2.5, 'line-opacity': 0.95 }, layout: { 'line-join': 'round' } });
    map.addLayer({ id: 'bt-pins', type: 'circle', source: 'bt-pins', paint: { 'circle-radius': 6, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ['match', ['get', 'kind'], 'catch', green, amber], 'circle-stroke-width': 2 } });
    map.addLayer({
      id: 'bt-pin-label', type: 'symbol', source: 'bt-pins', filter: ['!=', ['get', 'label'], ''],
      layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-letter-spacing': 0.08 },
      paint: { 'text-color': green, 'text-halo-color': '#000', 'text-halo-width': 1.5 },
    }, before);
    map.addLayer({ id: 'bt-pos', type: 'circle', source: 'bt-pos', paint: { 'circle-radius': 6, 'circle-color': green, 'circle-stroke-color': '#000', 'circle-stroke-width': 1.5 } });
    ready = true;
    refresh();
  };
  if (map.isStyleLoaded()) add();
  else map.once('style.load', add);

  const schedule = () => {
    if (!queued) (queued = true), requestAnimationFrame(refresh);
  };
  store.subscribe(schedule);
  return {
    refresh: schedule,
    /** The planned route line (PLAN 7.23 item 8); an empty list clears it. */
    setRoute(points: [number, number][]) {
      routeLine = points;
      schedule();
    },
  };
}
