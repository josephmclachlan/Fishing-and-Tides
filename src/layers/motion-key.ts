/**
 * On-map key for the moving layers (clarity review CL5). Wave crests, wind streaks and current streaks can be on at
 * once, two of them in amber, and a newcomer cannot tell which is which without opening LAYERS. While two or more are
 * on, a one-line key sits in the map's top-left corner: a swatch and a word for each. Tapping it opens LAYERS.
 * It also names every layer colouring areas of the sea at this zoom (FILLS, persona review J10).
 */
import { t, type Key } from '../i18n';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { LAYERS, type LayerId, type LayerStore } from './registry';

export const MOVING: readonly { id: LayerId; tone: 'amber' | 'green'; key: Key }[] = [
  { id: 'waves', tone: 'amber', key: 'mkey.waves' },
  { id: 'wind', tone: 'amber', key: 'mkey.wind' },
  { id: 'currents', tone: 'green', key: 'mkey.currents' },
];

/** The moving layers that are on, or none when fewer than two are (one alone needs no telling apart). */
export const movingShown = (isOn: (id: LayerId) => boolean) => {
  const on = MOVING.filter((m) => isOn(m.id));
  return on.length >= 2 ? on : [];
};

/**
 * Layers that colour areas of the sea, and how their swatch reads: a green-amber-red scale (good to bad), or one
 * colour getting stronger (amber ramp). Persona review J10: a newcomer met a stepped brown-yellow fill with no key.
 */
export const FILLS: readonly { id: LayerId; scale: 'gar' | 'ramp'; key: Key }[] = [
  { id: 'sst', scale: 'gar', key: 'mkey.sst' },
  { id: 'clarity', scale: 'gar', key: 'mkey.clarity' },
  { id: 'sargassum', scale: 'ramp', key: 'mkey.sargassum' },
  { id: 'weather', scale: 'gar', key: 'mkey.weather' },
  { id: 'rip', scale: 'ramp', key: 'mkey.rip' },
  { id: 'fishing', scale: 'ramp', key: 'mkey.fishing' },
  { id: 'depth', scale: 'ramp', key: 'mkey.depth' },
];

/** What a style layer looks like to the key: its id, type, whether it is shown, and its zoom range. */
export interface StyleLayerInfo { id: string; type: string; visible: boolean; minzoom: number; maxzoom: number }
const AREA_TYPES = new Set(['fill', 'raster', 'heatmap', 'fill-extrusion']);

/** The fill layers actually painting areas at `zoom`: switched on, with a visible fill-type style layer in range. */
export function fillsShown(isOn: (id: LayerId) => boolean, style: readonly StyleLayerInfo[], zoom: number) {
  return FILLS.filter((f) => {
    if (!isOn(f.id)) return false;
    const prefixes = LAYERS.find((l) => l.id === f.id)?.mapPrefixes ?? [];
    return style.some((s) => s.visible && AREA_TYPES.has(s.type) && zoom >= s.minzoom && zoom < s.maxzoom && prefixes.some((p) => s.id.startsWith(p)));
  });
}

export function mountMotionKey(container: HTMLElement, store: LayerStore, openLayers: () => void, map?: MapLibreMap) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'mkey';
  el.setAttribute('aria-label', t('mkey.aria'));
  el.addEventListener('click', openLayers);
  container.appendChild(el);
  const render = () => {
    const on = movingShown(store.isOn);
    const style: StyleLayerInfo[] = map?.isStyleLoaded()
      ? (map.getStyle().layers ?? []).map((l) => ({
          id: l.id,
          type: l.type,
          visible: (l.layout as { visibility?: string } | undefined)?.visibility !== 'none',
          minzoom: l.minzoom ?? 0,
          maxzoom: l.maxzoom ?? 24,
        }))
      : [];
    const fills = map ? fillsShown(store.isOn, style, map.getZoom()) : [];
    el.hidden = !on.length && !fills.length;
    // Wave crests are short lines across the swell; wind and current are streaks along the flow; fills are a colour scale.
    const html =
      on.map((m) => `<span class="mk-item"><i class="mk-sw mk-${m.id} sw-${m.tone}"></i>${t(m.key)}</span>`).join('') +
      fills.map((f) => `<span class="mk-item"><i class="mk-sw mk-fill mk-${f.scale}"></i>${t(f.key)}</span>`).join('');
    if (el.innerHTML !== html) el.innerHTML = html;
  };
  store.subscribe(render);
  // Fills come and go with the zoom (some only paint close in) and as their data lands.
  map?.on('zoomend', render);
  map?.on('idle', render);
  render();
}
