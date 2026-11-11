/**
 * The Kinetic Plus base map (PLAN 7.70): OpenFreeMap's vector tiles repainted in the map's tokens, so the base reads
 * like the mockup in both schemes. Sea in two blues, land a soft stone in light (never white: Joseph 2026-11-11),
 * roads as faint hairlines, places in the ink's second tone on a halo, and the old HUD's graticules, region box and
 * spot rings hidden: the coast ribbon and the rating tiles say where the spots are.
 */
import type { Map as MlMap } from 'maplibre-gl';
import { hex, rgba, tok } from './dom';

/** The old map's own lines the modern map does without. */
const HIDE = ['grat-macro', 'grat-coast', 'grat-spot', 'region-box', 'spots-ring', 'spots-core', 'spots-label', 'coastline-halo'];

export function styleBaseMap(map: MlMap) {
  const st = map.getStyle?.();
  if (!st?.layers) return;
  const C = (n: string) => hex(tok(n));
  const set = (id: string, k: string, v: unknown) => {
    try {
      map.setPaintProperty(id, k as never, v as never);
    } catch {
      /* a property this layer type does not have */
    }
  };
  const z = (a: number, b: number) => ['interpolate', ['linear'], ['zoom'], 8, a, 14, b];
  for (const l of st.layers) {
    const id = l.id, sl = (l as { 'source-layer'?: string })['source-layer'] ?? '';
    if (HIDE.includes(id)) {
      map.setLayoutProperty(id, 'visibility', 'none');
      continue;
    }
    if ((l as { source?: string }).source !== 'openmaptiles' && l.type !== 'background') continue;
    if (l.type === 'background') set(id, 'background-color', C('m-land'));
    else if (id === 'coastline') {
      set(id, 'line-color', C('m-coast'));
      set(id, 'line-opacity', z(0.35, 0.7));
      set(id, 'line-width', z(0.6, 1.2));
    } else if (l.type === 'fill') {
      if (sl === 'water') {
        set(id, 'fill-color', C('m-sea-a'));
        set(id, 'fill-outline-color', C('m-sea-a'));
      } else if (sl === 'building') set(id, 'fill-color', rgba(tok('m-topo'), 0.55));
      else {
        set(id, 'fill-color', C('m-land-b'));
        set(id, 'fill-opacity', 0.6);
        set(id, 'fill-outline-color', 'rgba(0,0,0,0)');
      }
    } else if (l.type === 'line') {
      if (sl === 'waterway') {
        set(id, 'line-color', C('m-sea-b'));
        set(id, 'line-opacity', 0.55);
      } else if (sl === 'boundary') {
        set(id, 'line-color', C('m-lab'));
        set(id, 'line-opacity', 0.35);
      } else {
        const major = /major|motorway/.test(id);
        set(id, 'line-color', C(major ? 'm-lab' : 'm-topo'));
        set(id, 'line-opacity', major ? z(0.25, 0.45) : z(0.3, 0.6));
      }
    } else if (l.type === 'symbol') {
      const sea = sl === 'water_name';
      set(id, 'text-color', C(sea ? 'm-sealab' : 'm-lab'));
      set(id, 'text-halo-color', C('m-halo'));
      set(id, 'text-halo-width', 1.6);
      set(id, 'icon-opacity', 0);
      if (id.startsWith('road_oneway')) map.setLayoutProperty(id, 'visibility', 'none');
    } else if (l.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
  }
}

/**
 * The old overlays label on a black halo (made for the amber screen); on this map their labels sit on the map's own
 * halo in the ink, so they read on the light sea and land, while the marks and washes beside them keep the vivid paint
 * colours (layers/paint.ts). Overlays arrive over the first seconds: run on each style change.
 */
export function haloOverlays(map: MlMap) {
  const st = map.getStyle?.();
  if (!st?.layers) return;
  const halo = hex(tok('m-halo')), ink = hex(tok('ink'));
  for (const l of st.layers) {
    if (l.type !== 'symbol' || (l as { source?: string }).source === 'openmaptiles') continue;
    try {
      if (map.getPaintProperty(l.id, 'text-halo-color') === '#000') {
        map.setPaintProperty(l.id, 'text-halo-color', halo);
        map.setPaintProperty(l.id, 'text-halo-width', 1.8);
        map.setPaintProperty(l.id, 'text-color', ink);
      }
    } catch {
      /* layer gone mid-change */
    }
  }
}
