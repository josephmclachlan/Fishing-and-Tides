/**
 * FISHING BOATS map layer (PLAN 7.19): where AIS-tracked fishing boats worked over the last year,
 * from Global Fishing Watch (adapters/effort.ts). One square per 0.1° cell, amber, firmer for
 * busier cells (thirds by rank), cut at the coastline. Style layer ids start with `ef-` (catalog 'effort').
 */
import type { ImageSource, Map } from 'maplibre-gl';
import { paintSea, rgbaWord, type CoastTest } from './sea-image';
import { firstSymbolId } from '../map';
import type { EffortCell } from '../adapters/effort';

const rgbOf = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 176, 0];
};

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export interface EffortLayer {
  setCells(cells: readonly EffortCell[], step: number): void;
  /** Redraw if the coastline has loaded since the last draw. */
  refresh(): void;
}

/** Image pixel, degrees (~220 m): fine enough to cut the 0.1° squares at the coastline. */
const EFFORT_PIXEL_DEG = 0.002;
/** Fill opacity per level (thirds by rank), as the squares had. */
const ALPHA: Record<number, number> = { 1: 0.1, 2: 0.22, 3: 0.38 };

/**
 * `coast` is where the sea is (sea-image.ts): an 11 km square on the shore keeps only its sea part.
 * Drawn as one image, so the squares have no outlines (an outline would cross the land).
 */
export function mountEffort(map: Map, coast: () => CoastTest | null = () => null): EffortLayer {
  const amber = rgbOf(cssColour('--amber', '#ffb000'));
  const words = Object.fromEntries(Object.entries(ALPHA).map(([k, a]) => [k, rgbaWord(...amber, Math.round(255 * a))])) as Record<number, number>;
  const canvas = document.createElement('canvas');
  let last: { cells: readonly EffortCell[]; step: number } | null = null;
  let drawnCoast: CoastTest | null | undefined;
  const draw = () => {
    if (!last || !last.cells.length || !(map.getLayer('grat-macro') || map.isStyleLoaded())) return;
    const { cells, step } = last;
    const h = step / 2;
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (const c of cells) (w = Math.min(w, c.lng - h)), (e = Math.max(e, c.lng + h)), (s = Math.min(s, c.lat - h)), (n = Math.max(n, c.lat + h));
    const cols = Math.round((e - w) / step), byCell = new globalThis.Map<number, number>();
    for (const c of cells) byCell.set(Math.floor((n - c.lat) / step) * cols + Math.floor((c.lng - w) / step), c.level);
    drawnCoast = coast();
    const img = paintSea([w, s, e, n], EFFORT_PIXEL_DEG, drawnCoast, (lng, lat) => {
      const level = byCell.get(Math.floor((n - lat) / step) * cols + Math.floor((lng - w) / step));
      return level ? words[level] ?? 0 : 0;
    });
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d')!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.width, img.height), 0, 0);
    const url = canvas.toDataURL('image/png');
    const src = map.getSource('ef') as ImageSource | undefined;
    if (src) src.updateImage({ url, coordinates: img.coordinates });
    else {
      map.addSource('ef', { type: 'image', url, coordinates: img.coordinates });
      const below = map.getLayer('sf-contour-deep') ? 'sf-contour-deep' : firstSymbolId(map);
      map.addLayer({ id: 'ef-fill', type: 'raster', source: 'ef', paint: { 'raster-opacity': 1, 'raster-fade-duration': 0, 'raster-resampling': 'nearest' } }, below);
    }
  };
  map.once('style.load', draw);
  return {
    setCells(cells, step) {
      last = { cells, step };
      draw();
    },
    refresh() {
      if (drawnCoast !== coast()) draw();
    },
  };
}
