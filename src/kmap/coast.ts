/**
 * The coast is the answer (mockup G, note 3): a ribbon along each beach in the rating colour of that spot for the
 * chosen activity and hour, and a rating tile pinned to each spot with its headline value on the same colour.
 * Ribbons are MapLibre lines (traced from the land mask, model.ts coastNear); tiles are HTML over the map, placed
 * without overlap each frame the camera moves. Also the CORAL mode's private-site cells (never the sites).
 */
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { coastNear, labelRect, placePins, privateCells, type Mask, type Rect, CELL_DEG } from './model';
import { ZONE_LABEL, zoneTextSize } from '../fishing/zones';
import { esc, hex, L2, tok } from './dom';
import type { Level } from '../forecast/model';

export interface PinData {
  id: string;
  name: string;
  lngLat: [number, number];
  level: Level | null;
  value: string;
  unit: string;
  /** Rank for placement: the better spot keeps its tile when two would overlap. */
  rank: number;
}

const RIBBON_M = 650;

export function mountCoast(map: MlMap, stage: HTMLElement, onPick: (id: string) => void) {
  const layer = document.createElement('div');
  layer.className = 'k-pins';
  stage.appendChild(layer);
  let pins: PinData[] = [];
  let selected: string | null = null;
  let visible = true;
  let mask: Mask | null = null;
  const ribbons = new Map<string, [number, number][]>();

  const ensure = () => {
    if (!map.isStyleLoaded() || map.getSource('km-coast')) return !!map.getSource('km-coast');
    map.addSource('km-coast', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('km-cells', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const lbl = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;
    map.addLayer({ id: 'km-coast-case', type: 'line', source: 'km-coast', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': hex(tok('m-coast')), 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 4, 12, 9, 15, 16], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 8.5, 0, 9.5, 0.9] } }, lbl);
    map.addLayer({ id: 'km-coast', type: 'line', source: 'km-coast', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'col'], 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 12, 6.5, 15, 13], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 8.5, 0, 9.5, 1] } }, lbl);
    map.addLayer({ id: 'km-cells-fill', type: 'fill', source: 'km-cells', paint: { 'fill-color': hex(tok('t-coral')), 'fill-opacity': 0.14 } }, lbl);
    map.addLayer({ id: 'km-cells-line', type: 'line', source: 'km-cells', paint: { 'line-color': hex(tok('t-coral')), 'line-width': 2, 'line-dasharray': [3, 2] } }, lbl);
    map.addLayer({ id: 'km-cells-label', type: 'symbol', source: 'km-cells', layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': hex(tok('ink')), 'text-halo-color': hex(tok('m-halo')), 'text-halo-width': 2 } });
    return true;
  };

  const colour = (l: Level | null) => hex(tok(l === null ? 'lvn' : `lv${l}`));
  const drawRibbons = () => {
    if (!ensure()) return;
    const features = visible
      ? pins
          .map((p) => {
            let line = ribbons.get(p.id);
            if (!line && mask) ribbons.set(p.id, (line = coastNear(mask, p.lngLat, RIBBON_M)));
            return line && line.length > 1 ? { type: 'Feature' as const, properties: { col: colour(p.level) }, geometry: { type: 'LineString' as const, coordinates: line } } : null;
          })
          .filter((f): f is NonNullable<typeof f> => !!f)
      : [];
    (map.getSource('km-coast') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
  };

  // Tiles: rebuilt when the pins change, placed on every camera move.
  const els = new Map<string, HTMLElement>();
  // Tile sizes, measured while the tiles show: a tile dropped to its square is display:none and measures 0.
  const sizes = new Map<string, { w: number; h: number }>();
  const measure = () => {
    // Shown for the measure; place() hides again what it must, before the frame paints.
    for (const [id, el] of els) {
      el.hidden = false;
      el.classList.remove('dot');
      const tile = el.querySelector<HTMLElement>('.k-pin-tile')!;
      if (tile.offsetWidth) sizes.set(id, { w: tile.offsetWidth, h: tile.offsetHeight });
    }
  };
  /** The map's own panels and buttons over the stage (readings, key, views, find/layers, zoom), in stage px. */
  const SKIP = ['k-pins', 'k-xh', 'k-confveil'];
  const obstacles = (off: DOMRect): Rect[] => {
    const out: Rect[] = [];
    for (const el of stage.children) {
      if (!(el instanceof HTMLElement) || el.hidden || SKIP.some((c) => el.classList.contains(c))) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) out.push({ x: r.left - off.left, y: r.top - off.top, w: r.width, h: r.height });
    }
    return out;
  };
  /** The fish zone names on screen (PLAN 7.85), estimated as boxes in stage px: the tiles step around them where they can. */
  const zoneNames = (dx: number, dy: number): Rect[] => {
    const z = map.getZoom();
    if (z < ZONE_LABEL.nameZ || !map.getLayer('fh-zone-label') || map.getLayoutProperty('fh-zone-label', 'visibility') === 'none') return [];
    const size = zoneTextSize(z);
    const out: Rect[] = [];
    for (const f of map.queryRenderedFeatures({ layers: ['fh-zone-label'] })) {
      const p = f.properties as { sp?: string; where?: string; nearly?: number; anchor?: string; off?: string | [number, number] };
      if (f.geometry.type !== 'Point' || !p.sp) continue;
      const pt = map.project(f.geometry.coordinates as [number, number]);
      const second = z >= ZONE_LABEL.whereZ ? p.where : p.nearly ? 'NEARLY A ZONE' : '';
      const lines = [{ text: p.sp, size }, ...(second ? [{ text: second, size: size * ZONE_LABEL.whereScale }] : [])];
      const off = typeof p.off === 'string' ? (JSON.parse(p.off) as [number, number]) : (p.off ?? [0, 0]);
      const r = labelRect({ x: pt.x + dx, y: pt.y + dy }, lines, p.anchor ?? 'center', off);
      out.push(r);
    }
    return out;
  };
  const build = () => {
    layer.innerHTML = '';
    els.clear();
    sizes.clear();
    for (const p of pins) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `k-pin k-lv${p.level ?? 'n'}`;
      el.dataset.id = p.id;
      el.setAttribute('aria-label', `${p.name}: ${p.value} ${p.unit}`);
      el.innerHTML = `<svg class="k-pin-leg" aria-hidden="true"><line/></svg><i class="k-pin-dot"></i><span class="k-pin-tile"><span class="k-pin-n">${esc(p.name)}</span><b>${esc(p.value)}<small>${esc(p.unit)}</small></b></span>`;
      el.addEventListener('click', (e) => (e.stopPropagation(), onPick(p.id)));
      layer.appendChild(el);
      els.set(p.id, el);
    }
    measure();
    place();
  };
  let queued = false;
  const place = () => {
    queued = false;
    layer.hidden = !visible;
    if (!visible) return;
    if (sizes.size < els.size) measure(); // built while hidden
    const W = stage.clientWidth, H = stage.clientHeight;
    const off = stage.getBoundingClientRect(), mr = map.getContainer().getBoundingClientRect();
    const z = map.getZoom();
    const boxes = pins.map((p) => {
      const pt = map.project(p.lngLat);
      const sz = sizes.get(p.id) ?? { w: 120, h: 44 };
      return { id: p.id, x: pt.x + mr.left - off.left, y: pt.y + mr.top - off.top, w: sz.w, h: sz.h, rank: p.rank + (p.id === selected ? 1e6 : 0) };
    });
    const at = z >= 9.6 ? placePins(boxes.filter((b) => b.x > -20 && b.y > -20 && b.x < W + 20 && b.y < H + 20), { w: W, h: H }, 4, obstacles(off), zoneNames(mr.left - off.left, mr.top - off.top)) : new Map();
    for (const b of boxes) {
      const el = els.get(b.id)!;
      const on = b.x > -20 && b.y > -20 && b.x < W + 20 && b.y < H + 20 && z >= 9;
      el.hidden = !on;
      if (!on) continue;
      el.style.transform = `translate(${b.x}px, ${b.y}px)`;
      el.classList.toggle('sel', b.id === selected);
      const p = at.get(b.id);
      el.classList.toggle('dot', !p);
      const tile = el.querySelector<HTMLElement>('.k-pin-tile')!;
      const leg = el.querySelector<SVGSVGElement>('.k-pin-leg')!;
      if (p) {
        tile.style.transform = `translate(${p.dx}px, ${p.dy}px)`;
        // Leader from the spot to the nearest point of the tile's edge.
        const cx = Math.min(Math.max(0, p.dx), p.dx + b.w), cy = Math.min(Math.max(0, p.dy), p.dy + b.h);
        const l = leg.querySelector('line')!;
        l.setAttribute('x1', '0');
        l.setAttribute('y1', '0');
        l.setAttribute('x2', String(cx));
        l.setAttribute('y2', String(cy));
      }
    }
  };
  const queue = () => {
    if (!queued) (queued = true), requestAnimationFrame(place);
  };
  map.on('move', queue);
  map.on('idle', queue); // the zone names settle after the move: step the tiles around where they ended up
  void document.fonts?.ready.then(() => (measure(), place())); // the tiles' widths change when their fonts arrive
  map.on('resize', queue);
  map.on('styledata', () => ensure() && (drawRibbons(), setCells(cells)));

  let cells: readonly { lng: number; lat: number }[] = [];
  const setCells = (sites: readonly { lng: number; lat: number }[]) => {
    cells = sites;
    if (!ensure()) return;
    const features = privateCells(sites).map((c) => ({
      type: 'Feature' as const,
      properties: { label: `${L2('PRIVATE', 'PRIVADO')} · ${c.n}` },
      geometry: { type: 'Polygon' as const, coordinates: [[[c.lng, c.lat], [c.lng + CELL_DEG, c.lat], [c.lng + CELL_DEG, c.lat + CELL_DEG], [c.lng, c.lat + CELL_DEG], [c.lng, c.lat]]] },
    }));
    (map.getSource('km-cells') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
  };

  return {
    set(next: PinData[], sel: string | null) {
      const same = next.length === pins.length && next.every((p, i) => p.id === pins[i].id);
      pins = next;
      selected = sel;
      if (!same) build();
      else
        for (const p of pins) {
          const el = els.get(p.id)!;
          el.className = `k-pin k-lv${p.level ?? 'n'}`;
          el.querySelector('b')!.innerHTML = `${esc(p.value)}<small>${esc(p.unit)}</small>`;
          el.setAttribute('aria-label', `${p.name}: ${p.value} ${p.unit}`);
        }
      measure();
      drawRibbons();
      place();
    },
    setMask(m: Mask) {
      mask = m;
      ribbons.clear();
      drawRibbons();
    },
    setVisible(on: boolean) {
      visible = on;
      drawRibbons();
      place();
      if (map.getLayer('km-coast')) for (const id of ['km-coast', 'km-coast-case']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    },
    setCells,
    setCellsVisible(on: boolean) {
      if (!ensure()) return;
      for (const id of ['km-cells-fill', 'km-cells-line', 'km-cells-label']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    },
    place,
  };
}
