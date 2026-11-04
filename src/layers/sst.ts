/**
 * WATER TEMP map layer (PLAN 2.4): isotherms from the newest satellite SST map (MUR, via
 * adapters/satellite.ts). Tight bunches of lines are temperature fronts, where bait and
 * pelagics gather. Every 0.5 °C over the macro view from the 0.05° grid, every 0.25 °C from the
 * 0.01° coast nest at the coast tier. Style layer ids start with `ss-`, which the catalog's
 * 'sst' layer binds to (layers/registry.ts).
 *
 * Under the lines, a tinted fill shows the temperature itself (sstTone): the nearshore sea is often
 * within half a degree everywhere, which gives one or two isotherms or none, so lines alone can
 * leave the layer looking empty.
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

/** Fill bands, °C: green below COOL, amber up to WARM, red from WARM (the coast runs about 26.5 to 30.5 °C over a year). */
export const SST_BANDS = { COOL: 27.5, WARM: 29.5 } as const;
/** Fill opacity at the cool and warm ends of each band; warmer water within a band shows stronger. */
const ALPHA_LO = 0.07, ALPHA_HI = 0.24;

/**
 * Fill tone and opacity for a sea temperature (°C), or null for no data. Within each band the
 * opacity ramps with temperature, so a gradient (a front) shows as shading even inside one band.
 * The two open bands ramp over 2 °C beyond their edge.
 */
export function sstTone(c: number): { tone: 'green' | 'amber' | 'red'; alpha: number } | null {
  if (!Number.isFinite(c)) return null;
  const { COOL, WARM } = SST_BANDS;
  const [tone, lo, hi] = c < COOL ? (['green', COOL - 2, COOL] as const) : c < WARM ? (['amber', COOL, WARM] as const) : (['red', WARM, WARM + 2] as const);
  const f = Math.min(Math.max((c - lo) / (hi - lo), 0), 1);
  return { tone, alpha: Math.round((ALPHA_LO + f * (ALPHA_HI - ALPHA_LO)) * 1000) / 1000 };
}

type Corners = [[number, number], [number, number], [number, number], [number, number]];

/**
 * RGBA pixels (row 0 north) of the newest frame's fill, and the image corners for a MapLibre image
 * source. Cells whose centre falls inside `hole` (corners as returned) are left clear, so the
 * macro fill can sit around the coast nest without doubling up over it.
 */
export function sstImage(s: GridSeries, colours: Record<'green' | 'amber' | 'red', readonly [number, number, number]>, hole?: Corners) {
  const g = s.meta.grid;
  const inHole = (i: number) => {
    if (!hole) return false;
    const lng = g.lon0 + (i % g.cols) * g.dlon, lat = g.lat0 - Math.floor(i / g.cols) * g.dlat;
    return lng > hole[0][0] && lng < hole[1][0] && lat < hole[0][1] && lat > hole[2][1];
  };
  const z = s.values.sst?.[s.values.sst.length - 1];
  const px = new Uint8ClampedArray(g.cols * g.rows * 4);
  if (z)
    for (let i = 0; i < z.length; i++) {
      const t = sstTone(z[i]);
      if (t && !inHole(i)) px.set([...colours[t.tone], Math.round(255 * t.alpha)], i * 4);
    }
  const w = g.lon0 - g.dlon / 2, n = g.lat0 + g.dlat / 2;
  const e = g.lon0 + (g.cols - 0.5) * g.dlon, so = g.lat0 - (g.rows - 0.5) * g.dlat;
  const coordinates: Corners = [[w, n], [e, n], [e, so], [w, so]];
  return { width: g.cols, height: g.rows, px, coordinates };
}

function cssColour(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const rgb = (hex: string, fb: [number, number, number]): [number, number, number] => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fb;
};

/** The fill as a PNG data URL for an image source. */
function fillUrl(img: ReturnType<typeof sstImage>) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext('2d')!.putImageData(new ImageData(img.px, img.width, img.height), 0, 0);
  return canvas.toDataURL('image/png');
}

export function mountSst(map: Map, d: SatelliteData) {
  const data: FeatureCollection = {
    type: 'FeatureCollection',
    features: [...(d.sst ? isotherms(d.sst, 0.5, 'macro') : []), ...(d.sstCoast ? isotherms(d.sstCoast, 0.25, 'coast') : [])],
  };
  const amber = cssColour('--amber', '#ffb000');
  const COAST = TIER_ZOOM.COAST;
  const colours = {
    green: rgb(cssColour('--green', '#39ff7a'), [57, 255, 122]),
    amber: rgb(amber, [255, 176, 0]),
    red: rgb(cssColour('--red', '#ff3b2f'), [255, 59, 47]),
  };
  // Macro tier: the whole 0.05° map. Coast tier: the 0.01° nest, with the 0.05° map around it
  // (holed where the nest is) so the tint doesn't stop at the nest's edge. Hard switch at the tier
  // edge: a cross-fade of two translucent fills shows the nest as a box.
  const coast = d.sstCoast ? sstImage(d.sstCoast, colours) : null;
  const fills: { k: string; img: ReturnType<typeof sstImage>; zoom: { minzoom?: number; maxzoom?: number } }[] = [];
  if (d.sst) fills.push({ k: 'macro', img: sstImage(d.sst, colours), zoom: coast ? { maxzoom: COAST } : {} });
  if (d.sst && coast) fills.push({ k: 'outer', img: sstImage(d.sst, colours, coast.coordinates), zoom: { minzoom: COAST } });
  if (coast) fills.push({ k: 'coast', img: coast, zoom: d.sst ? { minzoom: COAST } : {} });
  const isGrid = (g: string) => ['==', ['get', 'grid'], g] as ['==', ['get', string], string];
  const add = () => {
    if (map.getSource('ss')) return;
    // Fills go under the depth contours and labels, like the other area fills.
    const below = map.getLayer('sf-contour-deep') ? 'sf-contour-deep' : map.getLayer('grat-macro') ? 'grat-macro' : undefined;
    for (const { k, img, zoom } of fills) {
      map.addSource(`ss-fill-${k}`, { type: 'image', url: fillUrl(img), coordinates: img.coordinates });
      map.addLayer({ id: `ss-fill-${k}`, type: 'raster', source: `ss-fill-${k}`, ...zoom,
        paint: { 'raster-opacity': 1, 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, below);
    }
    map.addSource('ss', { type: 'geojson', data, attribution: 'MUR SST, NASA JPL via NOAA CoastWatch' });
    // Macro lines fade out as the finer coast lines fade in across the tier edge.
    map.addLayer({ id: 'ss-macro', type: 'line', source: 'ss', filter: isGrid('macro'), maxzoom: COAST + 0.5,
      paint: { 'line-color': amber, 'line-width': 1.2, 'line-dasharray': [2, 1.5], 'line-opacity': ['interpolate', ['linear'], ['zoom'], COAST - 0.5, 0.85, COAST + 0.5, 0] } });
    map.addLayer({ id: 'ss-coast', type: 'line', source: 'ss', filter: isGrid('coast'), minzoom: COAST - 0.5,
      paint: { 'line-color': amber, 'line-width': 1.2, 'line-dasharray': [2, 1.5], 'line-opacity': ['interpolate', ['linear'], ['zoom'], COAST - 0.5, 0, COAST + 0.5, 0.85, TIER_ZOOM.SPOT, 0.6] } });
    map.addLayer({ id: 'ss-label', type: 'symbol', source: 'ss',
      layout: { 'symbol-placement': 'line', 'symbol-spacing': 280, 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 11, 'text-max-angle': 30, 'text-padding': 16 },
      paint: { 'text-color': amber, 'text-halo-color': '#000', 'text-halo-width': 1.5,
        'text-opacity': ['step', ['zoom'], ['case', isGrid('macro'), 0.9, 0], COAST, ['case', isGrid('coast'), 0.95, 0]] } });
  };
  if (map.getLayer('grat-macro') || map.isStyleLoaded()) add();
  else map.once('style.load', add);
}
