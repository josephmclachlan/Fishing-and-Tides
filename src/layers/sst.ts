/**
 * WATER TEMP map layer (PLAN 2.4): isotherms from the newest satellite SST map (MUR, via
 * adapters/satellite.ts). Tight bunches of lines are temperature fronts, where bait and
 * pelagics gather. Every 0.5 °C over the macro view from the 0.05° grid, every 0.25 °C from the
 * 0.01° coast nest at the coast tier. Style layer ids start with `ss-`, which the catalog's
 * 'sst' layer binds to (layers/registry.ts).
 */
import type { GeoJSONSource, Map } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { TIER_ZOOM } from '../region';
import { chaikin, clipLines, contour } from '../physics/bathy';
import type { GridSeries } from '../adapters/pack';
import type { SatelliteData } from '../adapters/satellite';

const FONT = ['Noto Sans Regular'];

/** Sea or land at a point (true = sea), e.g. the coastline mask. */
export type WaterTest = (lng: number, lat: number) => boolean;
/** How finely isotherms are tested against the coastline, degrees: about the fine mask's cell, and a third of the macro depth grid's. */
const CLIP_STEP: Record<'macro' | 'coast', number> = { macro: 0.005, coast: 0.0004 };

/**
 * Isotherms of the newest frame every `step` °C, smoothed, as GeoJSON lines with { c, grid }. The
 * satellite grid's land cells are 1 to 5 km wide and smoothing rounds corners, so a line can cut
 * across a headland or run up the beach: with `water`, lines are cut where they cross land.
 */
export function isotherms(s: GridSeries, step: number, grid: 'macro' | 'coast', water?: WaterTest): Feature<LineString>[] {
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
      const smooth = chaikin(raw, 2);
      for (const piece of water ? clipLines([smooth], (p) => water(p[0], p[1]), CLIP_STEP[grid]) : [smooth]) {
        if (piece.length < 2) continue;
        // 1e-5° (~1 m): coarser rounding could nudge a clipped end back over the shore.
        const coordinates = piece.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
        out.push({ type: 'Feature', properties: { c, label: `${c.toFixed(step < 0.5 ? 2 : 1)}°`, grid }, geometry: { type: 'LineString', coordinates } });
      }
    }
  }
  return out;
}

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const features = (d: SatelliteData, water?: WaterTest): FeatureCollection => ({
  type: 'FeatureCollection',
  features: [...(d.sst ? isotherms(d.sst, 0.5, 'macro', water) : []), ...(d.sstCoast ? isotherms(d.sstCoast, 0.25, 'coast', water) : [])],
});

/** Mounts the isotherms; `water` cuts them at the coastline, and `setWater` re-cuts them once the coastline mask loads. */
export function mountSst(map: Map, d: SatelliteData, water?: WaterTest) {
  let data = features(d, water);
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
  return {
    setWater(next: WaterTest) {
      data = features(d, next);
      (map.getSource('ss') as GeoJSONSource | undefined)?.setData(data);
    },
  };
}
