import * as maplibregl from 'maplibre-gl';
import type { ExpressionSpecification, Map } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

maplibregl.setWorkerUrl(workerUrl);
import 'maplibre-gl/dist/maplibre-gl.css';
import { GRATICULE_STEP, REGION, SPOTS, TIER_ZOOM } from './region';
import { graticule, toDDM } from './geo';
import { hemispheres } from './i18n';

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

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

const { COAST, SPOT } = TIER_ZOOM;
/** Paint value that eases between tiers: `macro` below COAST, `coast` across COAST, `spot` from SPOT. */
export const byTier = (macro: number, coast: number, spot: number): ExpressionSpecification =>
  ['interpolate', ['linear'], ['zoom'], COAST - 0.5, macro, COAST + 0.5, coast, SPOT - 0.5, coast, SPOT + 0.5, spot];

/**
 * Tier-specific map detail (DESIGN.md §5). Macro: 1° grid, bold region box. Coast: 0.1° grid,
 * glowing coastline, spot labels. Spot: 0.01° grid, brighter coastline halo, spot coordinates.
 */
function addTierLayers(map: Map) {
  const grid = (id: string, bounds: typeof REGION.bounds, step: number, opacity: ExpressionSpecification, minzoom = 0, maxzoom = 24) => {
    map.addSource(id, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: graticule(bounds, step) } },
    });
    map.addLayer({ id, type: 'line', source: id, minzoom, maxzoom, paint: { 'line-color': '#ffb000', 'line-width': 0.6, 'line-opacity': opacity } }, firstSymbolId(map));
  };
  grid('grat-macro', REGION.viewBounds, GRATICULE_STEP.MACRO, byTier(0.3, 0, 0), 0, COAST + 0.5);
  grid('grat-coast', REGION.maxBounds, GRATICULE_STEP.COAST, byTier(0, 0.16, 0), COAST - 0.5, SPOT + 0.5);
  grid('grat-spot', REGION.bounds, GRATICULE_STEP.SPOT, byTier(0, 0, 0.2), SPOT - 0.5);

  // Coastline traced from the water polygons; sharpens and brightens as you zoom in.
  if (map.getSource('openmaptiles')) {
    const coast = { type: 'line', source: 'openmaptiles', 'source-layer': 'water', minzoom: COAST - 0.5 } as const;
    map.addLayer({ ...coast, id: 'coastline-halo', minzoom: SPOT - 1, paint: { 'line-color': '#39ff7a', 'line-width': 7, 'line-blur': 6, 'line-opacity': byTier(0, 0, 0.3) } }, firstSymbolId(map));
    map.addLayer(
      { ...coast, id: 'coastline', paint: { 'line-color': '#39ff7a', 'line-width': byTier(0, 0.8, 1.8), 'line-opacity': byTier(0, 0.55, 0.95) } },
      firstSymbolId(map),
    );
  }
}

export function firstSymbolId(map: Map) {
  return map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;
}

function addOverlays(map: Map) {
  const [[w, s], [e, n]] = REGION.bounds;
  map.addSource('region', {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[w, s], [e, s], [e, n], [w, n], [w, s]] } },
  });
  map.addLayer({
    id: 'region-box',
    type: 'line',
    source: 'region',
    paint: { 'line-color': '#ffb000', 'line-width': byTier(1.5, 1, 1), 'line-dasharray': [4, 4], 'line-opacity': byTier(0.85, 0.5, 0.15) },
  });

  map.addSource('spots', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: SPOTS.map((s) => ({
        type: 'Feature',
        properties: { name: s.name, ddm: `${toDDM(s.lngLat[1], 'lat', hemispheres())} ${toDDM(s.lngLat[0], 'lng', hemispheres())}` },
        geometry: { type: 'Point', coordinates: s.lngLat } })),
    },
  });
  map.addLayer({
    id: 'spots-ring',
    type: 'circle',
    source: 'spots',
    paint: { 'circle-radius': byTier(3, 6, 11), 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#39ff7a', 'circle-stroke-width': byTier(1, 1.5, 2) },
  });
  map.addLayer({ id: 'spots-core', type: 'circle', source: 'spots', minzoom: SPOT - 0.5, paint: { 'circle-radius': 2, 'circle-color': '#39ff7a' } });
  map.addLayer({
    id: 'spots-label',
    type: 'symbol',
    source: 'spots',
    minzoom: COAST,
    layout: {
      // Spot tier adds the GPS coordinates under the name.
      'text-field': ['step', ['zoom'], ['get', 'name'], SPOT, ['concat', ['get', 'name'], '\n', ['get', 'ddm']]],
      'text-justify': 'left',
      'text-size': 11,
      'text-offset': [0.8, 0],
      'text-anchor': 'left',
      'text-font': ['Noto Sans Regular'],
    },
    paint: { 'text-color': '#39ff7a', 'text-halo-color': '#000', 'text-halo-width': 1.5 },
  });
}

/** `view` restores the camera after a language change; otherwise the map opens on the region. */
export function createMap(container: string, view?: { center: [number, number]; zoom: number } | null): Map {
  const map = new maplibregl.Map({
    container,
    style: STYLE_URL,
    center: view?.center ?? REGION.center,
    zoom: view?.zoom ?? REGION.initialZoom,
    maxBounds: REGION.viewBounds,
    attributionControl: { compact: true },
    // North-up, top-down only: a satellite sensor view. Also keeps an accidental two-finger
    // twist from skewing the grid and the enhance box.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: 0,
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  // Compact credits open themselves when the first source brings its credits (after 'load', so folding once at load
  // missed it) and cover a third of a phone's map. Keep them folded to the (i) button until the user taps it.
  const a = map.getContainer().querySelector('.maplibregl-ctrl-attrib');
  if (a) {
    let userOpened = false;
    a.addEventListener('click', () => { userOpened = true; }, { capture: true });
    const fold = () => { if (!userOpened && a.classList.contains('maplibregl-compact-show')) a.classList.remove('maplibregl-compact-show'); };
    new MutationObserver(fold).observe(a, { attributes: true, attributeFilter: ['class'] });
    fold();
  }
  map.on('style.load', () => {
    hudify(map);
    addTierLayers(map);
    addOverlays(map);
  });
  return map;
}
