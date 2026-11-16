/**
 * The coast is the answer (mockup G, note 3): a ribbon along each beach in the rating colour of that spot for the
 * chosen activity and hour, and a small number chip on each spot with its headline value on the same colour (the name
 * only on the chosen spot's chip; Joseph 2026-11-16 chose these over the old named boxes with leader lines). A chip
 * that would touch a better one or sit under a panel shows as a dot (model.ts placeChips). Ribbons are MapLibre lines (traced from
 * the land mask, model.ts coastNear); chips are HTML over the map, placed each frame the camera moves. Also the CORAL mode's private-site cells (never the sites).
 */
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import { coastNear, placeChips, privateCells, type Mask, type Rect, CELL_DEG } from './model';
import { esc, hex, L2, tok } from './dom';
import { addGlyphImages, imageId } from '../icons/map-glyphs';
import type { Level } from '../forecast/model';

export interface PinData {
  id: string;
  name: string;
  lngLat: [number, number];
  level: Level | null;
  value: string;
  unit: string;
  /** Rank for placement: the better spot keeps its chip when two would touch. */
  rank: number;
}

const RIBBON_M = 650;
/** Below this zoom the spots are dots only: the beaches sit too close together for their numbers. */
const CHIP_Z = 9.6;

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
    // The lock says "private" (PLAN 7.104); the hatch is kept for "unknown" only.
    addGlyphImages(map);
    map.addLayer({
      id: 'km-cells-label', type: 'symbol', source: 'km-cells',
      layout: {
        'icon-image': imageId('lock', 'ink'), 'icon-size': 0.75, 'icon-anchor': 'right', 'icon-offset': [-2, 0], 'icon-allow-overlap': true,
        'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-anchor': 'left', 'text-offset': [0.2, 0], 'text-allow-overlap': true,
      },
      paint: { 'text-color': hex(tok('ink')), 'text-halo-color': hex(tok('m-halo')), 'text-halo-width': 2 },
    });
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

  // Chips: rebuilt when the pins change, placed on every camera move.
  const els = new Map<string, HTMLElement>();
  // Chip sizes, measured while the chips show: a chip dropped to its dot is display:none and measures 0.
  const sizes = new Map<string, { w: number; h: number }>();
  const measure = () => {
    // Shown for the measure; place() hides again what it must, before the frame paints.
    for (const [id, el] of els) {
      el.hidden = false;
      el.classList.remove('dot');
      el.classList.toggle('sel', id === selected); // the chosen spot's chip carries its name: measure it that way
      const chip = el.querySelector<HTMLElement>('.k-pin-chip')!;
      if (chip.offsetWidth) sizes.set(id, { w: chip.offsetWidth, h: chip.offsetHeight });
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
  /** The number alone on the chip: "/100" is dropped (every score is out of 100), metres and knots stay. */
  const chipHTML = (p: PinData) => `<b>${esc(p.value)}${p.unit && p.unit !== '/100' ? `<small>${esc(p.unit)}</small>` : ''}</b>`;
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
      el.innerHTML = `<i class="k-pin-dot"></i><span class="k-pin-chip"><span class="k-pin-n">${esc(p.name)}</span>${chipHTML(p)}</span>`;
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
      const sz = sizes.get(p.id) ?? { w: 28, h: 18 };
      return { id: p.id, x: pt.x + mr.left - off.left, y: pt.y + mr.top - off.top, w: sz.w, h: sz.h, rank: p.rank };
    });
    const inView = (b: { x: number; y: number }) => b.x > -20 && b.y > -20 && b.x < W + 20 && b.y < H + 20;
    const { chips, covered } = z >= CHIP_Z ? placeChips(boxes.filter(inView), { w: W, h: H }, obstacles(off), selected) : { chips: new Set<string>(), covered: new Set<string>() };
    for (const b of boxes) {
      const el = els.get(b.id)!;
      const on = inView(b) && z >= 9 && !covered.has(b.id);
      el.hidden = !on;
      if (!on) continue;
      el.style.transform = `translate(${b.x}px, ${b.y}px)`;
      el.classList.toggle('sel', b.id === selected);
      el.classList.toggle('dot', !chips.has(b.id));
    }
  };
  const queue = () => {
    if (!queued) (queued = true), requestAnimationFrame(place);
  };
  map.on('move', queue);
  void document.fonts?.ready.then(() => (measure(), place())); // the chips' widths change when their fonts arrive
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
          el.querySelector('b')!.outerHTML = chipHTML(p);
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
    /** A light/dark switch: the ribbon, cell and label colours are read from the tokens when the layers are made. */
    recolour() {
      if (!map.getLayer('km-coast')) return;
      const P = (id: string, k: string, v: unknown) => map.setPaintProperty(id, k as never, v as never);
      P('km-coast-case', 'line-color', hex(tok('m-coast')));
      P('km-cells-fill', 'fill-color', hex(tok('t-coral')));
      P('km-cells-line', 'line-color', hex(tok('t-coral')));
      P('km-cells-label', 'text-color', hex(tok('ink')));
      P('km-cells-label', 'text-halo-color', hex(tok('m-halo')));
      drawRibbons();
    },
    setCellsVisible(on: boolean) {
      if (!ensure()) return;
      for (const id of ['km-cells-fill', 'km-cells-line', 'km-cells-label']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    },
    place,
  };
}
