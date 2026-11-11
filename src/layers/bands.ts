/**
 * Kinetic Plus field painting (mockup G, "posterised bands with hairline isolines"; PLAN 7.79): a continuous sea field
 * (temperature, visibility, chlorophyll) is painted in many flat bands along the theme's ramp (`--r-sst0..5`,
 * `--r-vis0..5`, `--r-chl0..4` in kmap/tokens.css), so a step in the data shows as a step in colour, and a thin ink line
 * runs along each band edge. The same bands drive the map, its key under the layer, and the reading's bar, so a colour
 * on the sea is the colour in the key.
 */
import type { Feature, LineString } from 'geojson';
import { chaikin, clipLines, contour } from '../physics/bathy';
import { rgbaWord, type RegularGrid } from './sea-image';
import { lifted, type Lift } from './paint';

export type Rgb = readonly [number, number, number];
export type FieldKind = 'sst' | 'vis' | 'chl';

/**
 * Band edges per field (mockup G's steps). Below the first edge is band 0, above the last is the last band. The sea
 * temperature's move with the season: the coast runs 26.5 to 30.5 °C over a year but rarely 1.5 °C across the region on
 * one day, so fixed edges would paint the whole sea one or two colours.
 */
export const FIELD_STEPS: Record<FieldKind, readonly number[]> = {
  // Until the satellite map is here; then quarter degrees around the region's own water (setFieldSteps, sstSteps).
  sst: [27, 27.5, 28, 28.5, 29, 29.5, 30],
  vis: [3, 5, 7, 9, 11, 13, 15, 18, 22],
  chl: [0.15, 0.2, 0.3, 0.45, 0.7, 1, 1.5, 2.2],
};
/** Fill opacity (mockup G: 0.5 temperature, 0.66 visibility, 0.62 chlorophyll), before the theme's lift. */
export const FIELD_ALPHA: Record<FieldKind, number> = { sst: 0.5, vis: 0.62, chl: 0.58 };
/** The ramp's tokens: `--${prefix}0` .. `--${prefix}${n - 1}`. */
export const FIELD_RAMP: Record<FieldKind, { prefix: string; n: number }> = { sst: { prefix: 'r-sst', n: 6 }, vis: { prefix: 'r-vis', n: 6 }, chl: { prefix: 'r-chl', n: 5 } };
/** Labelled ticks on the keys (a few of the edges, so they never crowd), and the unit. */
export const FIELD_TICKS: Record<FieldKind, { at: readonly number[]; unit: string }> = {
  sst: { at: [27, 28, 29, 30], unit: '°C' }, // follows the steps (setFieldSteps)
  vis: { at: [3, 9, 15, 22], unit: 'm' },
  chl: { at: [0.15, 0.3, 0.7, 1.5], unit: 'mg/m³' },
};

/** The band (0 .. steps.length) a value falls in. Pure. */
export function bandOf(steps: readonly number[], v: number): number {
  let n = 0;
  while (n < steps.length && v >= steps[n]) n++;
  return n;
}

/** The colour `t` (0..1) along a ramp of stops, mixed in sRGB as CSS color-mix does. Pure. */
export function rampAt(stops: readonly Rgb[], t: number): Rgb {
  const x = Math.min(Math.max(t, 0), 1) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  return [0, 1, 2].map((k) => Math.round(stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f)) as unknown as Rgb;
}

/** Where band k sits along the ramp, 0..1: the first band at the ramp's start, the last at its end. Pure. */
export const bandT = (k: number, bands: number) => (bands > 1 ? k / (bands - 1) : 0);

/** One colour per band along the ramp. Pure. */
export const bandColours = (stops: readonly Rgb[], bands: number): Rgb[] => Array.from({ length: bands }, (_, k) => rampAt(stops, bandT(k, bands)));

const hexRgb = (hex: string, fb: Rgb): Rgb => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fb;
};
/** Fallback stops (the light theme's) for when the tokens are not on the page, e.g. the old map. */
const FALLBACK: Record<FieldKind, Rgb[]> = {
  sst: [[43, 108, 176], [95, 179, 179], [165, 219, 194], [244, 197, 66], [242, 113, 28], [224, 68, 43]],
  vis: [[122, 90, 42], [196, 164, 106], [217, 215, 166], [165, 219, 194], [63, 165, 143], [12, 107, 102]],
  chl: [[228, 239, 216], [183, 217, 142], [111, 179, 74], [42, 138, 30], [20, 82, 20]],
};

/** The theme's ramp stops for a field, read from the page. */
export function fieldStops(kind: FieldKind): Rgb[] {
  const css = getComputedStyle(document.documentElement), { prefix, n } = FIELD_RAMP[kind];
  return Array.from({ length: n }, (_, i) => hexRgb(css.getPropertyValue(`--${prefix}${i}`), FALLBACK[kind][i]));
}

/**
 * The per-pixel colour of a field value: its band's colour at the field's opacity (lifted for the theme), 0 for no
 * data. `stops` default to the page's tokens. The bands are looked up once per call, so this is cheap per pixel.
 */
export function fieldWord(kind: FieldKind, lift: Lift, stops: readonly Rgb[] = fieldStops(kind)): (v: number) => number {
  const steps = FIELD_STEPS[kind], a = Math.round(255 * lifted(FIELD_ALPHA[kind], lift));
  const words = bandColours(stops, steps.length + 1).map((c) => rgbaWord(c[0], c[1], c[2], a));
  return (v) => (v === v ? words[bandOf(steps, v)] : 0);
}

/**
 * The CSS colour of each band for a key: color-mix of the two tokens around it, so it follows the theme without
 * reading the page. Pure.
 */
export function bandCss(kind: FieldKind): string[] {
  const { prefix, n } = FIELD_RAMP[kind], bands = FIELD_STEPS[kind].length + 1;
  return Array.from({ length: bands }, (_, k) => {
    const x = bandT(k, bands) * (n - 1), i = Math.min(n - 2, Math.floor(x)), f = Math.round((x - i) * 100);
    return f === 0 ? `var(--${prefix}${i})` : f === 100 ? `var(--${prefix}${i + 1})` : `color-mix(in srgb, var(--${prefix}${i + 1}) ${f}%, var(--${prefix}${i}))`;
  });
}

/**
 * The band edges of a grid as smoothed lines (the hairline isolines), GeoJSON with { v } (the edge's value). With
 * `water`, lines are cut where they cross land, tested every `clipStep` degrees. Pure.
 */
export function bandLines(g: RegularGrid, z: ArrayLike<number>, steps: readonly number[], water?: (lng: number, lat: number) => boolean, clipStep = 0.005): Feature<LineString>[] {
  const grid = { ...g, z: Float32Array.from(z) };
  const out: Feature<LineString>[] = [];
  for (const v of steps)
    for (const raw of contour(grid, v)) {
      if (raw.length < 4) continue; // single-cell blips
      const smooth = chaikin(raw, 2);
      for (const piece of water ? clipLines([smooth], (p) => water(p[0], p[1]), clipStep) : [smooth]) {
        if (piece.length < 2) continue;
        const coordinates = piece.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
        out.push({ type: 'Feature', properties: { v }, geometry: { type: 'LineString', coordinates } });
      }
    }
  return out;
}

/**
 * Where a value sits on a key of equal-width bands, 0..bands: its band plus how far it is between that band's edges
 * (the open end bands are as wide as their neighbour). For the pointer on a reading's bar. Pure.
 */
export function fieldIndex(kind: FieldKind, v: number): number {
  const s = FIELD_STEPS[kind], n = s.length, k = bandOf(s, v);
  const lo = k === 0 ? s[0] - (s[1] - s[0]) : s[k - 1], hi = k === n ? s[n - 1] + (s[n - 1] - s[n - 2]) : s[k];
  return Math.min(n + 1, Math.max(0, k + (v - lo) / (hi - lo)));
}

const stepListeners = new Set<() => void>();
/** Moves a field's band edges (and its key's ticks: every other edge); the keys listening redraw. */
export function setFieldSteps(kind: FieldKind, steps: readonly number[]) {
  FIELD_STEPS[kind] = steps;
  FIELD_TICKS[kind] = { ...FIELD_TICKS[kind], at: steps.filter((_, i) => i % 2 === 1) };
  for (const f of stepListeners) f();
}
/** Calls `f` whenever a field's band edges move. */
export function onFieldSteps(f: () => void) {
  stepListeners.add(f);
  return () => void stepListeners.delete(f);
}

/**
 * The sea temperature's band edges for one day: every `step` °C, `count` edges centred on the median of the values
 * inside `box` ([[w, s], [e, n]]), so the region's warmest and coolest water land at the two ends of the ramp. Null when
 * the box holds no value. Pure.
 */
export function sstSteps(g: RegularGrid, z: ArrayLike<number>, box: readonly [readonly [number, number], readonly [number, number]], step = 0.25, count = 8): number[] | null {
  const vs: number[] = [];
  for (let r = 0; r < g.rows; r++) {
    const lat = g.lat0 - r * g.dlat;
    if (lat < box[0][1] || lat > box[1][1]) continue;
    for (let c = 0; c < g.cols; c++) {
      const lng = g.lon0 + c * g.dlon, v = z[r * g.cols + c];
      if (lng >= box[0][0] && lng <= box[1][0] && v === v) vs.push(v);
    }
  }
  if (!vs.length) return null;
  vs.sort((a, b) => a - b);
  const mid = Math.round(vs[vs.length >> 1] / step) * step;
  return Array.from({ length: count }, (_, i) => Math.round((mid + (i - count / 2) * step) * 100) / 100);
}

/**
 * A copy of a grid with each value the mean of itself and its finite neighbours (3 × 3), `passes` times; empty cells
 * stay empty. Satellite nests upsampled from coarser data come in flat blocks, and a band edge through a nearly flat
 * field traces those blocks as boxes; a light blur turns them back into the soft shapes the water has. Pure.
 */
export function smoothField(z: ArrayLike<number>, cols: number, rows: number, passes = 2): Float32Array {
  let cur = Float32Array.from(z);
  for (let p = 0; p < passes; p++) {
    const next = cur.slice();
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (!(cur[i] === cur[i])) continue;
        let sum = 0, n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr, cc = c + dc;
            if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
            const v = cur[rr * cols + cc];
            if (v === v) (sum += v), n++;
          }
        next[i] = sum / n;
      }
    cur = next;
  }
  return cur;
}
