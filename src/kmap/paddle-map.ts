/** PADDLE on the map (PLAN 7.158): MapLibre layers for the range half-circle, the wind arrow and the range label (geometry in paddle-geo.ts). */
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { hex, tok } from './dom';
import { paddleFeatures, type PaddleMark } from './paddle-geo';

const SRC = 'km-paddle';
const IDS = ['km-paddle-fill', 'km-paddle-line', 'km-paddle-push', 'km-paddle-head', 'km-paddle-label'];

export function mountPaddleMap(map: MlMap) {
  let marks: PaddleMark[] = [];
  let visible = false;
  const ensure = () => {
    if (!map.isStyleLoaded()) return false;
    if (map.getSource(SRC)) return true;
    map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const lbl = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;
    const only = (k: string) => ['==', ['get', 'kind'], k] as never;
    map.addLayer({ id: 'km-paddle-fill', type: 'fill', source: SRC, filter: only('range'), paint: { 'fill-color': ['get', 'col'], 'fill-opacity': 0.14 } }, lbl);
    map.addLayer({ id: 'km-paddle-line', type: 'line', source: SRC, filter: only('range'), paint: { 'line-color': ['get', 'col'], 'line-width': 2, 'line-dasharray': [3, 2] } }, lbl);
    map.addLayer({ id: 'km-paddle-push', type: 'line', source: SRC, filter: only('push'), layout: { 'line-cap': 'round' }, paint: { 'line-color': ['get', 'col'], 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 13, 4] } }, lbl);
    map.addLayer({ id: 'km-paddle-head', type: 'fill', source: SRC, filter: only('head'), paint: { 'fill-color': ['get', 'col'], 'fill-opacity': 1 } }, lbl);
    map.addLayer({
      id: 'km-paddle-label', type: 'symbol', source: SRC, filter: only('label'),
      layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [0.4, 0], 'text-allow-overlap': true },
      paint: { 'text-color': hex(tok('ink')), 'text-halo-color': hex(tok('m-halo')), 'text-halo-width': 2 },
    });
    return true;
  };
  const draw = () => {
    if (!ensure()) return;
    (map.getSource(SRC) as GeoJSONSource).setData({ type: 'FeatureCollection', features: visible ? paddleFeatures(marks) : [] });
    for (const id of IDS) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  };
  map.on('styledata', () => {
    if (map.isStyleLoaded() && !map.getSource(SRC)) draw();
  });
  return {
    set(m: readonly PaddleMark[], on: boolean) {
      marks = [...m];
      visible = on;
      draw();
    },
    recolour() {
      if (!map.getLayer('km-paddle-label')) return;
      map.setPaintProperty('km-paddle-label', 'text-color', hex(tok('ink')));
      map.setPaintProperty('km-paddle-label', 'text-halo-color', hex(tok('m-halo')));
      draw();
    },
  };
}
