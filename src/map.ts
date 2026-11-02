import * as maplibregl from 'maplibre-gl';
import type { Map } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(workerUrl);
import 'maplibre-gl/dist/maplibre-gl.css';
import { REGION, SPOTS } from './region';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/** Recolour the base style into the phosphor HUD palette. */
function hudify(map: Map) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    try {
      if (layer.type === 'background') map.setPaintProperty(id, 'background-color', '#070a06');
      else if (layer.type === 'fill') {
        const water = /water|ocean|sea/.test(id);
        map.setPaintProperty(id, 'fill-color', water ? '#03120b' : '#0c0d07');
        map.setPaintProperty(id, 'fill-outline-color', water ? '#1d6b3a' : '#2a2410');
      } else if (layer.type === 'line') {
        const water = /water|river|coast/.test(id);
        map.setPaintProperty(id, 'line-color', water ? '#2fbf66' : '#5a4510');
        map.setPaintProperty(id, 'line-opacity', water ? 0.8 : 0.45);
      } else if (layer.type === 'symbol') {
        map.setPaintProperty(id, 'text-color', '#c98a00');
        map.setPaintProperty(id, 'text-halo-color', '#000');
        map.setPaintProperty(id, 'icon-opacity', 0);
      } else if (layer.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
    } catch {
      /* some layers use data-driven expressions we don't override */
    }
  }
}

function addOverlays(map: Map) {
  const [[w, s], [e, n]] = REGION.bounds;
  map.addSource('region', {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[w, s], [e, s], [e, n], [w, n], [w, s]] } },
  });
  map.addLayer({ id: 'region-box', type: 'line', source: 'region', paint: { 'line-color': '#ffb000', 'line-width': 1, 'line-dasharray': [4, 4], 'line-opacity': 0.6 } });

  map.addSource('spots', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: SPOTS.map((s) => ({ type: 'Feature', properties: { name: s.name }, geometry: { type: 'Point', coordinates: s.lngLat } })),
    },
  });
  map.addLayer({ id: 'spots-ring', type: 'circle', source: 'spots', paint: { 'circle-radius': 6, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#39ff7a', 'circle-stroke-width': 1.5 } });
  map.addLayer({
    id: 'spots-label',
    type: 'symbol',
    source: 'spots',
    minzoom: 8,
    layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0.8, 0], 'text-anchor': 'left', 'text-font': ['Noto Sans Regular'] },
    paint: { 'text-color': '#39ff7a', 'text-halo-color': '#000', 'text-halo-width': 1.5 },
  });
}

export function createMap(container: string): Map {
  const map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    center: REGION.center,
    zoom: REGION.initialZoom,
    maxBounds: REGION.maxBounds,
    attributionControl: { compact: true },
  });
  map.on('style.load', () => {
    hudify(map);
    addOverlays(map);
  });
  return map;
}
