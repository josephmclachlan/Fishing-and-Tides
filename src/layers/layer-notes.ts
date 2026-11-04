/**
 * Empty-layer notes (clarity review CL15 to CL17). A layer switched on that draws nothing in view looked broken: rip
 * risk on a calm day, fishing cells and surf breaks below their zoom, lightning with no strikes. One line under the top
 * bar now says which layers need a closer zoom and which have nothing in view, plus two layer-specific hints: the
 * sargassum hatch is "no clear satellite view", and an even sea temperature gives its value (one flat colour has no
 * isotherms to read). Checked after each move and data load, from what MapLibre actually rendered.
 */
import type { Map } from 'maplibre-gl';
import { t, type Key } from '../i18n';
import { LAYERS, type LayerId, type LayerStore } from './registry';

export interface LayerProbe {
  id: LayerId;
  /** Lowest zoom any of its map layers draws at. */
  minZoom: number;
  /** Features rendered in view, or null when it can't be counted (image layers). */
  rendered: number | null;
}

/** Which switched-on layers need a closer zoom, and which draw nothing in view. Pure. */
export function layerNotes(probes: readonly LayerProbe[], zoom: number): { zoomIn: LayerId[]; empty: LayerId[] } {
  const zoomIn: LayerId[] = [];
  const empty: LayerId[] = [];
  for (const p of probes) {
    if (zoom < p.minZoom) zoomIn.push(p.id);
    else if (p.rendered === 0) empty.push(p.id);
  }
  return { zoomIn, empty };
}

/** Notes show only while at most this many layers are on. */
export const NOTE_MAX_ON = 6;

const COUNTABLE = new Set(['fill', 'line', 'circle', 'symbol', 'fill-extrusion', 'heatmap']);

export function mountLayerNotes(root: HTMLElement, map: Map, store: LayerStore, seaTempC: () => number | null) {
  const el = document.createElement('div');
  el.className = 'lnote';
  el.hidden = true;
  el.setAttribute('role', 'status');
  root.appendChild(el);

  const styleLayers = (prefixes: readonly string[]) => (map.getStyle()?.layers ?? []).filter((l) => prefixes.some((p) => l.id.startsWith(p)));
  const rendered = (ids: string[]) => {
    try {
      return map.queryRenderedFeatures({ layers: ids }).length;
    } catch {
      return null;
    }
  };

  const render = () => {
    const probes: LayerProbe[] = [];
    let sargHatchOnly = false;
    let sstEven = false;
    for (const def of LAYERS) {
      if (!def.mapPrefixes || !store.isOn(def.id)) continue;
      const ls = styleLayers(def.mapPrefixes);
      if (!ls.length) continue;
      const vector = ls.filter((l) => COUNTABLE.has(l.type)).map((l) => l.id);
      const hasImage = vector.length < ls.length;
      const n = vector.length ? rendered(vector) : null;
      if (def.id === 'sargassum') sargHatchOnly = n === 0;
      if (def.id === 'sst') sstEven = n === 0;
      probes.push({ id: def.id, minZoom: Math.min(...ls.map((l) => l.minzoom ?? 0)), rendered: hasImage ? null : n });
    }
    // With most layers on (ALL), a list of the empty ones is clutter; the notes are for a chosen few.
    if (store.onIds().length > NOTE_MAX_ON) return void (el.hidden = true);
    const { zoomIn, empty } = layerNotes(probes, map.getZoom());
    const name = (id: LayerId) => t(`layer.${id}` as Key);
    const parts: string[] = [];
    if (zoomIn.length) parts.push(t('lnote.zoom', { names: zoomIn.map(name).join(', ') }));
    if (empty.length) parts.push(t('lnote.empty', { names: empty.map(name).join(', ') }));
    if (sargHatchOnly) parts.push(t('lnote.sargHatch'));
    const c = seaTempC();
    if (sstEven && c !== null && Number.isFinite(c)) parts.push(t('lnote.sstEven', { c: c.toFixed(1) }));
    el.textContent = parts.join(' · ');
    el.hidden = !parts.length;
  };
  let queued = 0;
  const later = () => {
    clearTimeout(queued);
    queued = window.setTimeout(render, 300);
  };
  // Not 'idle': the animated layers keep the map repainting, so it may never go idle.
  map.on('moveend', later);
  map.on('sourcedata', later);
  store.subscribe(later);
  later();
}
