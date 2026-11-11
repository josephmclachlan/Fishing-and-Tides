/**
 * Swell crests over the real seafloor (PLAN 7.86, the motion pass). Pure, no DOM, SI units.
 *
 * A swell train of period T arrives from deep water heading `toDeg` (compass). Its crests are the level sets of the
 * travel time τ(x, y): a crest passes a point every T seconds, so with U = τ / T (in wave periods) the crests are
 * where U is a whole number, and they move as the phase does. τ solves the eikonal equation
 *
 *   |∇τ| = 1 / c(h)                     c the phase speed at depth h for period T (dispersion, physics/waves.ts)
 *
 * which bends the crests toward the slower, shallower water: refraction (the wave-front form of the ray equations
 * in physics/refraction.ts; Dean & Dalrymple 1991, §4.4). Deep water (kh > π) is set to the plane wave
 * τ = (r · u) / c0, and the rest is solved by fast sweeping (Zhao 2005) with the Godunov upwind update on a
 * lat-lon grid of east-west spacing hx and north-south hy (m). Each cell also keeps its depth and the shoaling
 * coefficient Ks = √(Cg0 / Cg) (no refraction spreading: that needs ray spacing, physics/refraction.ts does it per spot),
 * for how bold its crest is drawn.
 *
 * Land (depth ≤ 0 or unknown) is NaN; so is water the front never reaches (behind a headland in the grid's view).
 */
import { M_PER_DEG_LAT, M_PER_DEG_LNG } from './bathy';
import { deepWavelength, kinematics, shoalingCoefficient } from './waves';
import type { DepthFn } from './refraction';

const RAD = Math.PI / 180;
/** Shallowest depth used, m: the swash zone, where linear theory stops anyway. */
const MIN_DEPTH_M = 0.5;
/** Sweeps over the grid (each in all four orders): three converge for fronts this smooth. */
const ITERATIONS = 3;
const TABLE_PER_M = 20;

export interface CrestField {
  cols: number;
  rows: number;
  /** West edge and north edge of the first cell's centre, degrees; `step` degrees between cell centres. */
  lon0: number;
  lat0: number;
  step: number;
  periodS: number;
  /** Compass heading the swell travels toward, degrees. */
  toDeg: number;
  /** Travel time in wave periods (crests at whole numbers), row-major from the north-west; NaN on land. */
  u: Float32Array;
  /** Depth, m (0 on land). */
  depth: Float32Array;
  /** Shoaling coefficient (1 in deep water); NaN on land. */
  ks: Float32Array;
}

/**
 * Crest field over `box` ([[west, south], [east, north]]) at `stepDeg` for a swell of period `periodS` coming FROM
 * `fromDeg`. `depth` gives metres, positive down (≤ 0 or NaN is land).
 */
export function crestField(depth: DepthFn, box: readonly [readonly [number, number], readonly [number, number]], stepDeg: number, periodS: number, fromDeg: number): CrestField {
  const [[w, s], [e, n]] = box;
  const cols = Math.max(2, Math.round((e - w) / stepDeg) + 1);
  const rows = Math.max(2, Math.round((n - s) / stepDeg) + 1);
  const N = cols * rows;
  const midLat = (s + n) / 2;
  const hx = stepDeg * M_PER_DEG_LNG * Math.cos(midLat * RAD);
  const hy = stepDeg * M_PER_DEG_LAT;
  const toDeg = (fromDeg + 180) % 360;
  const ux = Math.sin(toDeg * RAD), uy = Math.cos(toDeg * RAD);
  const c0 = deepWavelength(periodS) / periodS;
  const deepH = deepWavelength(periodS) / 2; // kh > π: the bottom no longer matters

  // Speed and shoaling by depth to the nearest 5 cm: a few hundred dispersion solves instead of one per cell.
  const table = new Map<number, [number, number]>();
  const t = new Float64Array(N).fill(Infinity);
  const slow = new Float64Array(N);
  const fixed = new Uint8Array(N); // 1 deep (plane wave), 2 land
  const dep = new Float32Array(N);
  const ks = new Float32Array(N).fill(NaN);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      const lng = w + c * stepDeg, lat = n - r * stepDeg;
      const d = depth(lng, lat);
      if (!(d > 0)) {
        fixed[k] = 2;
        continue;
      }
      const h = Math.max(MIN_DEPTH_M, d);
      dep[k] = h;
      if (h >= deepH) {
        fixed[k] = 1;
        // Metres east and north of the grid's north-west corner, along the travel direction.
        t[k] = (c * hx * ux - r * hy * uy) / c0;
        slow[k] = 1 / c0;
        ks[k] = 1;
        continue;
      }
      const j = Math.round(h * TABLE_PER_M);
      if (!table.has(j)) table.set(j, [1 / kinematics(periodS, j / TABLE_PER_M).c, shoalingCoefficient(periodS, j / TABLE_PER_M)]);
      const [sl, kk] = table.get(j)!;
      slow[k] = sl;
      ks[k] = kk;
    }

  const hx2 = hx * hx, hy2 = hy * hy, hh = hx2 + hy2;
  const update = (k: number, c: number, r: number) => {
    const a = Math.min(c > 0 ? t[k - 1] : Infinity, c < cols - 1 ? t[k + 1] : Infinity);
    const b = Math.min(r > 0 ? t[k - cols] : Infinity, r < rows - 1 ? t[k + cols] : Infinity);
    if (a === Infinity && b === Infinity) return;
    const f = slow[k];
    let next = Math.min(a + hx * f, b + hy * f);
    if (a !== Infinity && b !== Infinity) {
      // Both neighbours known: the 2-D upwind solution, kept when it is later than both (else the 1-D one stands).
      const disc = hh * f * f - (a - b) * (a - b);
      if (disc >= 0) {
        const two = (a * hy2 + b * hx2 + hx * hy * Math.sqrt(disc)) / hh;
        if (two >= Math.max(a, b)) next = Math.min(next, two);
      }
    }
    if (next < t[k]) t[k] = next;
  };
  for (let it = 0; it < ITERATIONS; it++)
    for (let sw = 0; sw < 4; sw++) {
      const c0i = sw & 1 ? cols - 1 : 0, c1 = sw & 1 ? -1 : cols, dc = sw & 1 ? -1 : 1;
      const r0 = sw & 2 ? rows - 1 : 0, r1 = sw & 2 ? -1 : rows, dr = sw & 2 ? -1 : 1;
      for (let r = r0; r !== r1; r += dr)
        for (let c = c0i; c !== c1; c += dc) {
          const k = r * cols + c;
          if (!fixed[k]) update(k, c, r);
        }
    }

  const u = new Float32Array(N);
  for (let k = 0; k < N; k++) u[k] = fixed[k] === 2 || !Number.isFinite(t[k]) ? NaN : t[k] / periodS;
  return { cols, rows, lon0: w, lat0: n, step: stepDeg, periodS, toDeg, u, depth: dep, ks };
}

/** Travel heading (compass degrees) of the crests at a cell, from the gradient of U; null on land or at the edge. */
export function headingAt(f: CrestField, c: number, r: number): number | null {
  if (c < 1 || r < 1 || c >= f.cols - 1 || r >= f.rows - 1) return null;
  const k = r * f.cols + c;
  const gx = (f.u[k + 1] - f.u[k - 1]) / 2; // per cell eastward
  const gy = (f.u[k - f.cols] - f.u[k + f.cols]) / 2; // per cell northward
  if (!Number.isFinite(gx) || !Number.isFinite(gy)) return null;
  const midLat = f.lat0 - (f.rows * f.step) / 2;
  const hx = f.step * M_PER_DEG_LNG * Math.cos(midLat * RAD), hy = f.step * M_PER_DEG_LAT;
  return ((Math.atan2(gx / hx, gy / hy) / RAD) % 360 + 360) % 360;
}

/** Which crests to draw at a zoom: every `n`th, a power of two, so they sit at least `minPx` apart on screen. */
export function crestStride(wavelengthM: number, metresPerPx: number, minPx = 52): number {
  const px = wavelengthM / metresPerPx;
  if (!(px > 0)) return 1;
  return Math.min(64, 2 ** Math.max(0, Math.ceil(Math.log2(minPx / px))));
}
