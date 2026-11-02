/**
 * WATER TEMP map layer (PLAN 2.4): isotherms from the newest satellite SST map (MUR, via
 * adapters/satellite.ts). Tight bunches of lines are temperature fronts, where bait and
 * pelagics gather. Every 0.5 °C over the macro view from the 0.05° grid, every 0.25 °C from the
 * 0.01° coast nest at the coast tier. Style layer ids start with `ss-`, which the catalog's
 * 'sst' layer binds to (layers/registry.ts).
 */
import type { Map } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { TIER_ZOOM } from '../region';
import { chaikin, contour } from '../physics/bathy';
import type { GridSeries } from '../adapters/pack';
import type { SatelliteData } from '../adapters/satellite';

const FONT = ['Noto Sans Regular'];

/** Isotherms of the newest frame every `step` °C, smoothed, as GeoJSON lines with { c, grid }. */
export function isotherms(s: GridSeries, step: number, grid: 'macro' | 'coast'): Feature<LineString>[] {
  const z = s.values.sst?.[s.values.sst.length - 1];
  if (!z) return [];
  let lo = Infinity, hi = -Infinity;
  for (const x of z) if (Number.isFinite(x)) (lo = Math.min(lo, x)), (hi = Math.max(hi, x));
  const out: Feature<LineString>[] = [];
  if (!(lo <= hi)) return out;
  const g = { ...s.meta.grid, z };
  for (let k = Math.ceil(lo / step); k * step <= hi; k++) {
    const c = Math.round(k * step * 100) / 100;
    for (const raw of contour(g, c)) {
      if (raw.length < 4) continue; // single-cell blips
      const coordinates = chaikin(raw, 2).map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]);
      out.push({ type: 'Feature', properties: { c, label: `${c.toFixed(step < 0.5 ? 2 : 1)}°`, grid }, geometry: { type: 'LineString', coordinates } });
    }
  }
  return out;
}

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function mountSst(map: Map, d: SatelliteData) {
  const data: FeatureCollection = {
    type: 'FeatureCollection',
    features: [...(d.sst ? isotherms(d.sst, 0.5, 'macro') : []), ...(d.sstCoast ? isotherms(d.sstCoast, 0.25, 'coast') : [])],
  };
  const amber = cssColour('--amber', '#ffb000');
  const COAST = TIER_ZOOM.COAST;
  const isGrid = (g: string) => ['==', ['get', 'grid'], g] as ['==', ['get', string], string];
  const add = () => {
    if (map.getSource('ss')) return;
    map.addSource('ss', { type: 'geojson', data, attribution: 'MUR SST, NASA JPL via NOAA CoastWatch' });
    // Macro lines fade out as the finer coast lines fade in across the tier edge.
    map.addLayer({ id: 'ss-macro', type: 'line', source: 'ss', filter: isGrid('macro'), maxzoom: COAST + 0.5,
      paint: { 'line-color': amber, 'line-width': 1, 'line-dasharray': [1, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], COAST - 0.5, 0.6, COAST + 0.5, 0] } });
    map.addLayer({ id: 'ss-coast', type: 'line', source: 'ss', filter: isGrid('coast'), minzoom: COAST - 0.5,
      paint: { 'line-color': amber, 'line-width': 1, 'line-dasharray': [1, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], COAST - 0.5, 0, COAST + 0.5, 0.6, TIER_ZOOM.SPOT, 0.35] } });
    map.addLayer({ id: 'ss-label', type: 'symbol', source: 'ss',
      layout: { 'symbol-placement': 'line', 'symbol-spacing': 360, 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 10, 'text-max-angle': 30, 'text-padding': 16 },
      paint: { 'text-color': amber, 'text-halo-color': '#000', 'text-halo-width': 1.5,
        'text-opacity': ['step', ['zoom'], ['case', isGrid('macro'), 0.75, 0], COAST, ['case', isGrid('coast'), 0.8, 0]] } });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
}
