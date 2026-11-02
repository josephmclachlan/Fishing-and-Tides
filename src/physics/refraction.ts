/**
 * Wave refraction over bathymetry by ray tracing (PLAN 3.3). Pure, no DOM. SI units;
 * positions are [lng, lat] degrees, directions are compass degrees the wave travels
 * TOWARD (0 = north, 90 = east) unless named `from`.
 *
 * Rays (wave orthogonals) bend toward slower water. With φ the compass heading, x east,
 * y north and c(x, y) the local phase speed from the dispersion relation (3.2):
 *
 *   dx/ds = sin φ,   dy/ds = cos φ,   dφ/ds = −(1/c)(∂c/∂x cos φ − ∂c/∂y sin φ)
 *
 * which is Snell's law (sin θ / c = const) for straight parallel contours (Dean &
 * Dalrymple 1991, §4.4). ∂c/∂x = (dc/dh)(∂h/∂x), with dc/dh exact from the dispersion
 * relation and ∂h/∂x by central differences on the depth grid. Integrated with RK4.
 *
 * Wave height at a point comes from BACKWARD spectral ray tracing (Longuet-Higgins 1957;
 * O'Reilly & Guza 1991): a fan of rays leaves the point toward the sea; each one that
 * reaches deep water picks up the offshore directional spectrum D(θ0) at its arrival
 * direction. The spectrum times c·cg is conserved along a ray, so
 *
 *   K² = (H / H0)² = Σ_rays D(θ0(α)) · (c0 cg0) / (c cg) · Δα
 *
 * K is shoaling × refraction together (Ks·Kr). Rays that hit land carry nothing, so
 * headlands and reefs shelter the spot naturally, and focusing over shoals shows up as
 * K > Ks. This is far more robust over a coarse grid than tracking ray spacing, which
 * blows up at caustics. For straight parallel contours it reduces to
 * Ks·√(cos θ0 / cos θ) (tested).
 */
import { M_PER_DEG_LAT, M_PER_DEG_LNG, sample, cellAt, type Grid } from './bathy';
import { deepWavelength, kinematics, shoalingCoefficient } from './waves';

const RAD = Math.PI / 180;
const TWO_PI = 2 * Math.PI;

/** Water depth (m, positive down) at a point; ≤ 0 is dry, NaN is outside the data. */
export type DepthFn = (lng: number, lat: number) => number;

/**
 * Depth from the seafloor grids: the OSM land mask says dry where it covers, then the
 * 15″ region grid, then the 1′ macro grid outside it. Elevations are positive up.
 */
export function seafloorDepth(region: Grid, macro: Grid, land?: Grid): DepthFn {
  return (lng, lat) => {
    if (land && cellAt(land, lng, lat) === 1) return 0;
    let z = sample(region, lng, lat);
    if (Number.isNaN(z)) z = sample(macro, lng, lat);
    return -z;
  };
}

/** Phase speed c and dc/dh at depth h for period T (h > 0). */
function speedAndSlope(T: number, h: number): [number, number] {
  const kin = kinematics(T, h);
  const { k, c, kh } = kin;
  if (kh > 20) return [c, 0];
  const sech2 = 1 / Math.cosh(kh) ** 2;
  // From ω² = g k tanh(kh) at fixed ω: dk/dh = −k² sech²(kh) / (tanh(kh) + kh sech²(kh)); c = ω/k.
  const dkdh = (-k * k * sech2) / (Math.tanh(kh) + kh * sech2);
  return [c, (-c / k) * dkdh];
}

export interface RayOptions {
  /** Stop below this depth (m): the ray has reached the beach or a reef top. Default 0.5. */
  minDepth?: number;
  /** Stop once h ≥ deepFactor · L0: deep water, where the bed no longer bends waves (tanh 2π ≈ 1). Default 1. */
  deepFactor?: number;
  /** Safety cap on integration steps. Default 4000. */
  maxSteps?: number;
  /** Keep the path (for drawing). Default false. */
  keepPath?: boolean;
  /** Finite-difference half-width for depth gradients, m. Default 120 (about a quarter of a 15″ cell). */
  gradStep?: number;
}

export type RayEnd = 'deep' | 'land' | 'edge' | 'steps';

export interface Ray {
  end: RayEnd;
  /** Heading (toward) at the end of the ray. */
  endDir: number;
  endDepth: number;
  /** Length travelled, m. */
  length: number;
  path?: [number, number][];
}

/**
 * Trace one ray from `start` heading `dirDeg` (toward) for waves of period T. Rays are
 * reversible, so tracing seaward from a point and reversing the end heading gives the
 * offshore direction a wave must come from to reach the point.
 */
export function traceRay(depth: DepthFn, start: [number, number], dirDeg: number, T: number, opts: RayOptions = {}): Ray {
  const minDepth = opts.minDepth ?? 0.5;
  const deep = (opts.deepFactor ?? 1) * deepWavelength(T);
  const maxSteps = opts.maxSteps ?? 4000;
  const gs = opts.gradStep ?? 120;
  let [lng, lat] = start;
  let phi = dirDeg * RAD;
  const path: [number, number][] | undefined = opts.keepPath ? [[lng, lat]] : undefined;
  let length = 0;

  // Derivative of (x, y, φ) w.r.t. arclength at a point; NaN if dry or off the grid.
  const deriv = (lo: number, la: number, p: number, out: Float64Array): boolean => {
    const mx = M_PER_DEG_LNG * Math.cos(la * RAD);
    const h = depth(lo, la);
    if (!(h > minDepth * 0.5)) return false;
    const dlo = gs / mx;
    const dla = gs / M_PER_DEG_LAT;
    const hx1 = depth(lo + dlo, la), hx0 = depth(lo - dlo, la);
    const hy1 = depth(lo, la + dla), hy0 = depth(lo, la - dla);
    // One-sided at the edge of the data or the shore (clamped to dry = 0).
    const cl = (v: number) => (Number.isNaN(v) ? h : Math.max(v, 0));
    const hx = (cl(hx1) - cl(hx0)) / (2 * gs);
    const hy = (cl(hy1) - cl(hy0)) / (2 * gs);
    const [c, dcdh] = speedAndSlope(T, h);
    const cx = dcdh * hx;
    const cy = dcdh * hy;
    out[0] = Math.sin(p) / mx; // dlng/ds
    out[1] = Math.cos(p) / M_PER_DEG_LAT; // dlat/ds
    out[2] = -(cx * Math.cos(p) - cy * Math.sin(p)) / c;
    return true;
  };

  const k1 = new Float64Array(3), k2 = new Float64Array(3), k3 = new Float64Array(3), k4 = new Float64Array(3);
  let end: RayEnd = 'steps';
  let h = depth(lng, lat);
  for (let i = 0; i < maxSteps; i++) {
    if (Number.isNaN(h)) { end = 'edge'; break; }
    if (h <= minDepth) { end = 'land'; break; }
    if (h >= deep) { end = 'deep'; break; }
    // Step: short near shore where depth (and so bending) changes fast, long offshore.
    const ds = Math.min(250, Math.max(25, 4 * h));
    if (!deriv(lng, lat, phi, k1)) { end = 'land'; break; }
    if (!deriv(lng + (ds / 2) * k1[0], lat + (ds / 2) * k1[1], phi + (ds / 2) * k1[2], k2) ||
        !deriv(lng + (ds / 2) * k2[0], lat + (ds / 2) * k2[1], phi + (ds / 2) * k2[2], k3) ||
        !deriv(lng + ds * k3[0], lat + ds * k3[1], phi + ds * k3[2], k4)) {
      // Stepped onto dry land or off the data mid-step: fall back to an Euler step to find out which.
      lng += ds * k1[0];
      lat += ds * k1[1];
      length += ds;
      h = depth(lng, lat);
      path?.push([lng, lat]);
      continue;
    }
    lng += (ds / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    lat += (ds / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    phi += (ds / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    length += ds;
    h = depth(lng, lat);
    path?.push([lng, lat]);
  }
  return { end, endDir: (((phi / RAD) % 360) + 360) % 360, endDepth: h, length, path };
}

/** Offshore sea state for one swell partition (or a whole sea): direction FROM and spread. */
export interface Offshore {
  /** Direction the waves come FROM, compass degrees (the meteorological convention Open-Meteo uses). */
  fromDeg: number;
  /** Directional spread, one standard deviation, degrees. Long swell ~10–15°, wind sea ~25–35°. */
  spreadDeg: number;
}

/** Wrapped-normal directional distribution, normalised to 1 over 2π (per radian). */
export function spreading(deltaRad: number, sigmaRad: number): number {
  const d = ((((deltaRad + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
  // Three wraps are plenty for σ up to ~60°.
  let s = 0;
  for (const w of [-TWO_PI, 0, TWO_PI]) s += Math.exp(-((d + w) ** 2) / (2 * sigmaRad * sigmaRad));
  return s / (sigmaRad * Math.sqrt(TWO_PI));
}

export interface RefractionResult {
  /** H / H0 at the point: shoaling × refraction (and sheltering). */
  K: number;
  /** Linear shoaling alone at the point's depth. */
  Ks: number;
  /** Refraction (incl. sheltering) alone, K / Ks. Multiplies H0 to give the "refracted deep-water height" for breaker formulas. */
  Kr: number;
  /** Mean direction the waves arrive FROM at the point, compass degrees (NaN if none arrive). */
  fromDeg: number;
  /** Depth at the point, m. */
  depth: number;
  /** Rays traced, and how many reached deep water. */
  rays: number;
  reachedDeep: number;
}

export interface RefractOptions extends RayOptions {
  /** Fan resolution, degrees between rays. Default 0.5. */
  fanStepDeg?: number;
}

/**
 * Shoaling + refraction coefficient at `point` for waves of period T arriving from
 * `offshore`, by backward spectral ray tracing (see the file header).
 */
export function refractAt(depth: DepthFn, point: [number, number], T: number, offshore: Offshore, opts: RefractOptions = {}): RefractionResult {
  const h = depth(point[0], point[1]);
  const step = opts.fanStepDeg ?? 0.5;
  const sigma = Math.max(offshore.spreadDeg, 1) * RAD;
  // Offshore heading (toward) is from + 180.
  const toward0 = (offshore.fromDeg + 180) * RAD;
  if (!(h > (opts.minDepth ?? 0.5))) return { K: 0, Ks: NaN, Kr: 0, fromDeg: NaN, depth: h, rays: 0, reachedDeep: 0 };
  const here = kinematics(T, h);
  const ccgHere = here.c * here.cg;
  let K2 = 0;
  let sx = 0;
  let sy = 0;
  let rays = 0;
  let reached = 0;
  for (let a = 0; a < 360; a += step) {
    rays++;
    // Trace seaward along heading a; the wave arriving here travels toward a + 180.
    const r = traceRay(depth, point, a, T, opts);
    // Leaving the data (the macro grid reaches far into the Caribbean) counts as offshore;
    // so does running out of steps in fairly deep water.
    const ok = r.end === 'deep' || r.end === 'edge' || (r.end === 'steps' && r.endDepth > 0.25 * deepWavelength(T));
    if (!ok) continue;
    reached++;
    const endToward = (r.endDir + 180) * RAD;
    const hEnd = Number.isFinite(r.endDepth) && r.endDepth > 0 ? r.endDepth : Infinity;
    const end = kinematics(T, hEnd);
    const w = spreading(endToward - toward0, sigma) * ((end.c * end.cg) / ccgHere) * step * RAD;
    K2 += w;
    const arrive = (a + 180) * RAD;
    sx += w * Math.sin(arrive);
    sy += w * Math.cos(arrive);
  }
  const K = Math.sqrt(K2);
  const Ks = shoalingCoefficient(T, h);
  const toward = Math.atan2(sx, sy) / RAD;
  return { K, Ks, Kr: K / Ks, fromDeg: K2 > 0 ? (((toward + 180) % 360) + 360) % 360 : NaN, depth: h, rays, reachedDeep: reached };
}

/**
 * The nearest point offshore of a shoreline pin with at least `targetDepth` of water,
 * searched along 72 headings out to `maxKm`. This is where the spot's waves are read
 * before they start to break (3.4 takes them the rest of the way in).
 */
export function nearshorePoint(depth: DepthFn, pin: [number, number], targetDepth = 10, maxKm = 6): [number, number] | null {
  let best: [number, number] | null = null;
  let bestD = Infinity;
  const mx = M_PER_DEG_LNG * Math.cos(pin[1] * RAD);
  for (let i = 0; i < 72; i++) {
    const a = i * 5 * RAD;
    const at = (d: number): [number, number] => [pin[0] + (Math.sin(a) * d) / mx, pin[1] + (Math.cos(a) * d) / M_PER_DEG_LAT];
    for (let d = 25; d <= maxKm * 1000 && d < bestD + 25; d += 25) {
      if (!(depth(...at(d)) >= targetDepth)) continue;
      // Bisect the last 25 m to about a metre so ties between headings resolve to the truly nearest.
      let lo = d - 25;
      let hi = d;
      while (hi - lo > 1) {
        const mid = (lo + hi) / 2;
        if (depth(...at(mid)) >= targetDepth) hi = mid;
        else lo = mid;
      }
      if (hi < bestD) {
        best = at(hi);
        bestD = hi;
      }
      break;
    }
  }
  return best;
}

/** Celerity used by the ray equations, exported for tests: c and dc/dh at depth h. */
export const _speedAndSlope = speedAndSlope;