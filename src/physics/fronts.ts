/**
 * Ocean fronts from satellite maps (PLAN 7.17): where sea temperature or chlorophyll changes fast
 * over a short distance. Bait gathers on these edges and pelagic fish (mahi, tuna, wahoo, kingfish)
 * hunt along them. Pure: no DOM; distances in km, gradients per km.
 *
 *   |∇f| = √((∂f/∂x)² + (∂f/∂y)²), central differences on the grid, x scaled by cos(lat)
 *          (one-sided at a missing neighbour; NaN where both sides are missing)
 *
 * SST uses °C per km; chlorophyll uses log10(mg/m³) per km, because chlorophyll spans decades and a
 * front is a ratio, not a difference. A cell is a front when its gradient is above both a floor
 * (SST 0.05 °C/km, chl 0.05 decades/km: MUR is smooth, so real fronts here are a few tenths of a
 * degree over a few km; the 9 km chlorophyll map has many gentle ramps, so its floor is a decade per
 * 20 km) and the scene's 95th percentile (so a flat day draws nothing). Thresholds
 * are rule-of-thumb starting points, not validated against fishing results here.
 */
import type { GridGeom } from '../adapters/pack';

const KM_PER_DEG = 111.32;
const RAD = Math.PI / 180;

/** Gradient magnitude per km at each cell (row 0 north, `lat0` the north edge row). */
export function gradient(z: ArrayLike<number>, g: GridGeom, transform: (x: number) => number = (x) => x): Float32Array {
  const { cols, rows } = g;
  const v = (c: number, r: number) => (c < 0 || r < 0 || c >= cols || r >= rows ? NaN : transform(z[r * cols + c]));
  const out = new Float32Array(cols * rows).fill(NaN);
  const dy = g.dlat * KM_PER_DEG;
  for (let r = 0; r < rows; r++) {
    const dx = g.dlon * KM_PER_DEG * Math.cos((g.lat0 - r * g.dlat) * RAD);
    for (let c = 0; c < cols; c++) {
      const here = v(c, r);
      if (!Number.isFinite(here)) continue;
      const d = (a: number, b: number, step: number) => (Number.isFinite(a) && Number.isFinite(b) ? (b - a) / (2 * step) : Number.isFinite(b) ? (b - here) / step : Number.isFinite(a) ? (here - a) / step : NaN);
      const gx = d(v(c - 1, r), v(c + 1, r), dx);
      const gy = d(v(c, r + 1), v(c, r - 1), dy);
      if (Number.isFinite(gx) || Number.isFinite(gy)) out[r * cols + c] = Math.hypot(Number.isFinite(gx) ? gx : 0, Number.isFinite(gy) ? gy : 0);
    }
  }
  return out;
}

export type FrontKind = 'sst' | 'chl';
/** Gradient floors per km: SST °C, chlorophyll decades (log10). */
export const FRONT_FLOOR: Record<FrontKind, number> = { sst: 0.05, chl: 0.05 };
export const FRONT_PERCENTILE = 0.95;

export interface FrontCell {
  lng: number;
  lat: number;
  /** Gradient per km. */
  strength: number;
  kind: FrontKind;
}

/** The p-quantile of the finite values (0..1). */
export function quantile(xs: ArrayLike<number>, p: number): number {
  const a = Array.from(xs).filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN;
}

/** Front cells of one map: gradient above the floor and the scene's percentile. */
export function frontCells(z: ArrayLike<number>, g: GridGeom, kind: FrontKind): FrontCell[] {
  const grad = gradient(z, g, kind === 'chl' ? (x) => (x > 0 ? Math.log10(x) : NaN) : undefined);
  const cut = Math.max(FRONT_FLOOR[kind], quantile(grad, FRONT_PERCENTILE));
  const out: FrontCell[] = [];
  for (let k = 0; k < grad.length; k++) {
    if (!(grad[k] >= cut)) continue;
    out.push({ lng: g.lon0 + (k % g.cols) * g.dlon, lat: g.lat0 - Math.floor(k / g.cols) * g.dlat, strength: grad[k], kind });
  }
  return out;
}

export interface NearestFront { km: number; bearingDeg: number; front: FrontCell }

/** The closest front cell to a point (flat-earth distance, fine at these ranges), or null with none. */
export function nearestFront(cells: readonly FrontCell[], lng: number, lat: number): NearestFront | null {
  let best: NearestFront | null = null;
  const k = Math.cos(lat * RAD);
  for (const f of cells) {
    const dx = (f.lng - lng) * k * KM_PER_DEG, dy = (f.lat - lat) * KM_PER_DEG;
    const km = Math.hypot(dx, dy);
    if (!best || km < best.km) best = { km, bearingDeg: (Math.atan2(dx, dy) / RAD + 360) % 360, front: f };
  }
  return best;
}
