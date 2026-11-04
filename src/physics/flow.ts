/**
 * Vector fields (wind, surface current) and the maths to move particles through them (PLAN 1.4).
 * Pure, no DOM. Velocities in m/s as (u, v): u toward east, v toward north. Positions [lng, lat].
 */

/**
 * Regular lon/lat grid of vectors, cell-centre registered like the bathymetry `Grid`:
 * row 0 is the northern row, cell (r, c) is centred on (lon0 + c·dlon, lat0 − r·dlat).
 * NaN marks no data (e.g. land in a current field).
 */
export interface VectorField {
  cols: number;
  rows: number;
  lon0: number;
  lat0: number;
  dlon: number;
  dlat: number;
  u: Float32Array;
  v: Float32Array;
}

/** Knots per metre per second (1 kt = 1852 m / 3600 s). */
export const KT_PER_MS = 3600 / 1852;

/**
 * Wind under this, knots, is calm: a forecast model's direction at 1 to 2 kt is noise that changes
 * from one grid cell to the next, so the map fades it out and the readout says CALM, not a bearing.
 */
export const CALM_KT = 3;

const RAD = Math.PI / 180;

/** Sample `fn(lng, lat) → [u, v]` on a grid covering `bounds` ([[w, s], [e, n]]) every `step` degrees. */
export function gridField(bounds: [[number, number], [number, number]], step: number, fn: (lng: number, lat: number) => [number, number]): VectorField {
  const [[w, s], [e, n]] = bounds;
  const cols = Math.round((e - w) / step) + 1;
  const rows = Math.round((n - s) / step) + 1;
  const u = new Float32Array(cols * rows);
  const v = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const [a, b] = fn(w + c * step, n - r * step);
      u[r * cols + c] = a;
      v[r * cols + c] = b;
    }
  return { cols, rows, lon0: w, lat0: n, dlon: step, dlat: step, u, v };
}

/**
 * Bilinear vector at a point, written into `out` (so the particle loop allocates nothing).
 * Returns false outside the grid or next to a NaN cell.
 */
export function sampleField(f: VectorField, lng: number, lat: number, out: [number, number]): boolean {
  const fx = (lng - f.lon0) / f.dlon;
  const fy = (f.lat0 - lat) / f.dlat;
  if (!(fx >= 0 && fx <= f.cols - 1 && fy >= 0 && fy <= f.rows - 1)) return false;
  const c = Math.min(Math.floor(fx), f.cols - 2);
  const r = Math.min(Math.floor(fy), f.rows - 2);
  const tx = fx - c;
  const ty = fy - r;
  const i = r * f.cols + c;
  const j = i + f.cols;
  const w00 = (1 - tx) * (1 - ty), w01 = tx * (1 - ty), w10 = (1 - tx) * ty, w11 = tx * ty;
  const u = f.u[i] * w00 + f.u[i + 1] * w01 + f.u[j] * w10 + f.u[j + 1] * w11;
  const v = f.v[i] * w00 + f.v[i + 1] * w01 + f.v[j] * w10 + f.v[j + 1] * w11;
  if (!Number.isFinite(u) || !Number.isFinite(v)) return false;
  out[0] = u;
  out[1] = v;
  return true;
}

/** Vector from a speed and the direction it comes FROM, degrees true (meteorological wind). */
export function fromSpeedDir(speed: number, fromDeg: number): [number, number] {
  return [-speed * Math.sin(fromDeg * RAD), -speed * Math.cos(fromDeg * RAD)];
}

/** Direction the flow goes TOWARD, degrees true 0..360 (oceanographic "set"). */
export function towardDeg(u: number, v: number): number {
  return (Math.atan2(u, v) / RAD + 360) % 360;
}

/** Direction the flow comes FROM, degrees true 0..360 (how wind is reported). */
export function fromDeg(u: number, v: number): number {
  return (towardDeg(u, v) + 180) % 360;
}

/*
 * Web Mercator in world units: x, y in 0..1 over the whole world, y growing southward like
 * screen pixels. MapLibre's world is 512·2^zoom px across, so screen px = world units × that.
 */
export const mercX = (lng: number) => (lng + 180) / 360;
export const mercY = (lat: number) => 0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / (2 * Math.PI);
export const lngOfX = (x: number) => x * 360 - 180;
export const latOfY = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) / RAD;

/** Web Mercator world size in px at `zoom` (MapLibre uses 512 px tiles). */
export const worldPx = (zoom: number) => 512 * 2 ** zoom;

/**
 * Advance a particle at world position (x, y) for `dt` seconds through velocity (u, v),
 * at a screen speed of `pxPerMs` px per m/s, on a map `world` px wide. Returns the new
 * position in `out`.
 *
 * Particles move at a fixed on-screen pace (like Windy) rather than true ground speed, so
 * they read the same at every zoom: Δscreen = k·(u, −v)·dt, Δworld = Δscreen / world.
 * Mercator is conformal, so the direction on screen is the true direction.
 */
export function advect(x: number, y: number, u: number, v: number, dt: number, pxPerMs: number, world: number, out: [number, number]) {
  const k = (pxPerMs * dt) / world;
  out[0] = x + u * k;
  out[1] = y - v * k;
}

/** Distance in km between two nearby points (equirectangular; fine under a few hundred km). */
export function distKm(a: readonly [number, number], b: readonly [number, number]): number {
  const k = Math.cos(((a[1] + b[1]) / 2) * RAD);
  return Math.hypot((b[0] - a[0]) * k, b[1] - a[1]) * 111.2;
}

/**
 * Nearest point on a polyline: distance (km) and the unit tangent (east, north) of the
 * segment it falls on, pointing in the polyline's drawing order.
 */
export function nearestOnLine(p: readonly [number, number], line: readonly (readonly [number, number])[]): { km: number; tangent: [number, number] } {
  const k = Math.cos(p[1] * RAD);
  let best = Infinity;
  let tangent: [number, number] = [1, 0];
  for (let i = 0; i < line.length - 1; i++) {
    // Work in local km-ish units so angles are true.
    const ax = line[i][0] * k, ay = line[i][1];
    const bx = line[i + 1][0] * k, by = line[i + 1][1];
    const px = p[0] * k, py = p[1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (d < best) {
      best = d;
      const len = Math.sqrt(len2) || 1;
      tangent = [dx / len, dy / len];
    }
  }
  return { km: best * 111.2, tangent };
}

/**
 * Tangential speed of a Gaussian-cored vortex at distance r from its centre, radius R
 * (where the speed peaks at `peak`): v(r) = peak · (r/R) · exp((1 − (r/R)²) / 2).
 * Solid-body rotation near the centre, decaying to calm well beyond R.
 */
export function vortexSpeed(r: number, R: number, peak: number): number {
  const q = r / R;
  return peak * q * Math.exp((1 - q * q) / 2);
}
