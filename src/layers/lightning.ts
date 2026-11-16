/**
 * Lightning flashes (PLAN 7.6, symbols 2026-11-16): a bolt per flash from the GLM collector, red for the last
 * 10 minutes and amber for older, fading as it ages. While a flash in the alert window lies inside the alert radius
 * of the crosshair, a dashed red ring shows that radius, so the map says why the LIGHTNING reading turned red.
 * Style layer ids start with `lt-` (catalog 'lightning').
 */
import type { Map, GeoJSONSource } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { firstSymbolId } from '../map';
import { nearestFlash, STRIKE_ALERT_KM, type Flash } from '../lightning';
import { addGlyphImages, imageId } from '../icons/map-glyphs';
import { themeVar } from './paint';

/** Minutes after which a flash turns from danger to caution. */
export const FRESH_MIN = 10;

/** Flashes as points with their age in minutes, oldest first so the newest draw on top. Pure. */
export const toGeoJson = (flashes: readonly Flash[], now: number): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [...flashes]
    .sort((a, b) => a[0] - b[0])
    .map((f) => ({ type: 'Feature', properties: { age: Math.max(0, (now - f[0]) / 60000) }, geometry: { type: 'Point', coordinates: [f[1], f[2]] } })),
});

/** A circle of `km` around a point, as a closed line. Pure. */
export function ringAround(lng: number, lat: number, km: number, n = 72): Feature {
  const dLat = km / 111.32;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    pts.push([lng + dLng * Math.sin(a), lat + dLat * Math.cos(a)]);
  }
  return { type: 'Feature', properties: { label: `${STRIKE_ALERT_KM} km` }, geometry: { type: 'LineString', coordinates: pts } };
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

export function mountLightning(map: Map) {
  let pending: readonly Flash[] = [];
  const ring = () => {
    const src = map.getSource('lt-ring') as GeoJSONSource | undefined;
    if (!src) return;
    const c = map.getCenter();
    const near = pending.length ? nearestFlash(pending, c.lng, c.lat, Date.now()) : null;
    src.setData(near && near.km <= STRIKE_ALERT_KM ? { type: 'FeatureCollection', features: [ringAround(c.lng, c.lat, STRIKE_ALERT_KM)] } : EMPTY);
  };
  const add = () => {
    if (map.getSource('lt')) return;
    addGlyphImages(map);
    const danger = themeVar('--sev-danger', '#E23B26');
    const halo = themeVar('--m-halo', '#ECEADF');
    const before = firstSymbolId(map);
    map.addSource('lt-ring', { type: 'geojson', data: EMPTY });
    map.addLayer({ id: 'lt-ring', type: 'line', source: 'lt-ring', paint: { 'line-color': danger, 'line-width': 2, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } }, before);
    map.addLayer({
      id: 'lt-ring-label', type: 'symbol', source: 'lt-ring',
      layout: { 'symbol-placement': 'line', 'symbol-spacing': 400, 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-letter-spacing': 0.08 },
      paint: { 'text-color': danger, 'text-halo-color': halo, 'text-halo-width': 1.6 },
    });
    map.addSource('lt', { type: 'geojson', data: toGeoJson(pending, Date.now()) });
    map.addLayer({
      id: 'lt-bolt', type: 'symbol', source: 'lt',
      layout: {
        'icon-image': ['case', ['<=', ['get', 'age'], FRESH_MIN], imageId('bolt', 'danger'), imageId('bolt', 'caution')],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 10, 0.7, 13, 0.9],
        'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': ['-', 0, ['get', 'age']],
      },
      // Fresh flashes at full strength; older ones fade to a third over the 30-minute window.
      paint: { 'icon-opacity': ['interpolate', ['linear'], ['get', 'age'], FRESH_MIN, 1, 30, 0.35] },
    });
    ring();
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
  map.on('moveend', ring);
  return {
    setFlashes(flashes: readonly Flash[]) {
      pending = flashes;
      (map.getSource('lt') as GeoJSONSource | undefined)?.setData(toGeoJson(flashes, Date.now()));
      ring();
    },
  };
}
