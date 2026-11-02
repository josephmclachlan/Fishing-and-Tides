/**
 * One spot's surf zone from the offshore forecast (PLAN 3.4): refraction (3.3) to a point
 * just outside the break, then the breaker model. Pure, no DOM, SI units.
 */
import { M_PER_DEG_LAT, M_PER_DEG_LNG } from './bathy';
import { angleAtBreak, breaker, meanSlope, type Breaker } from './breaking';
import { nearshorePoint, refractAt, type DepthFn, type RefractionResult, type RefractOptions } from './refraction';

const RAD = Math.PI / 180;

/** Offshore sea state (one swell partition, or the total sea). */
export interface SeaState {
  /** Significant height, m. */
  Hs: number;
  /** Peak period, s. */
  Tp: number;
  /** Direction the waves come FROM, compass degrees. */
  fromDeg: number;
  /** Directional spread (1σ), degrees. Default from the period: see `defaultSpread`. */
  spreadDeg?: number;
}

/**
 * Typical spread when the forecast gives none (Open-Meteo doesn't): long swell is narrow,
 * wind sea is broad. Roughly the cos-2s spreads of Goda (2000) for s = 75, 25, 10.
 */
export function defaultSpread(Tp: number): number {
  if (Tp >= 12) return 12;
  if (Tp >= 8) return 20;
  return 30;
}

/** Wrap an angle to (−180, 180]. */
const wrap180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

export interface SpotWaves {
  /** Where the waves were read (≥ readDepth of water), [lng, lat]. */
  point: [number, number];
  /** Bearing from the pin out to sea, compass degrees: the shore normal (waves from here come straight in). */
  normalDeg: number;
  /** Mean nearshore slope tan β between the pin and the read point. */
  slope: number | null;
  refraction: RefractionResult;
  breaker: Breaker;
  /** Arrival angle to the shore normal at the read point, degrees (+ = coming from the right, looking out to sea). */
  angleDeg: number;
}

/** Where and how a shoreline pin meets the sea; depends only on the seafloor, so callers cache it per spot. */
export interface SpotGeometry {
  pin: [number, number];
  /** Read point with at least `readDepth` of water, [lng, lat]. */
  point: [number, number];
  /** Seaward shore normal, compass degrees. */
  normalDeg: number;
  /** Mean nearshore slope tan β between the pin and the read point. */
  slope: number | null;
}

export function spotGeometry(depth: DepthFn, pin: [number, number], readDepth = 10): SpotGeometry | null {
  const point = nearshorePoint(depth, pin, readDepth);
  if (!point) return null;
  const mx = M_PER_DEG_LNG * Math.cos(pin[1] * RAD);
  const dx = (point[0] - pin[0]) * mx;
  const dy = (point[1] - pin[1]) * M_PER_DEG_LAT;
  const normalDeg = (((Math.atan2(dx, dy) / RAD) % 360) + 360) % 360;
  return { pin, point, normalDeg, slope: meanSlope(depth(point[0], point[1]), Math.hypot(dx, dy)) };
}

/** Refraction for a spot: depends on period, direction and spread but not height, so it caches well. */
export function spotRefraction(depth: DepthFn, geom: SpotGeometry, sea: SeaState, opts: RefractOptions = {}): RefractionResult {
  return refractAt(depth, geom.point, sea.Tp, { fromDeg: sea.fromDeg, spreadDeg: sea.spreadDeg ?? defaultSpread(sea.Tp) }, opts);
}

/** The breaker for a sea state, from the spot's geometry and refraction. Cheap. */
export function spotWavesFrom(geom: SpotGeometry, refraction: RefractionResult, sea: SeaState): SpotWaves {
  const angleDeg = Number.isNaN(refraction.fromDeg) ? 0 : wrap180(refraction.fromDeg - geom.normalDeg);
  const inp = { H0: sea.Hs, T: sea.Tp, Kr: refraction.Kr || 0, slope: geom.slope };
  // The arrival angle is at the read point; waves turn further in before they break.
  const atRead = Math.abs(angleDeg) < 90 ? angleDeg : 0;
  const b = breaker({ ...inp, angleDeg: angleAtBreak(atRead, sea.Tp, refraction.depth, breaker(inp).hb) });
  return { point: geom.point, normalDeg: geom.normalDeg, slope: geom.slope, refraction, breaker: b, angleDeg };
}

/** Refraction + breaking for a shoreline pin; null when there's no water deep enough nearby. */
export function spotWaves(depth: DepthFn, pin: [number, number], sea: SeaState, opts: RefractOptions & { readDepth?: number } = {}): SpotWaves | null {
  const geom = spotGeometry(depth, pin, opts.readDepth);
  if (!geom) return null;
  return spotWavesFrom(geom, spotRefraction(depth, geom, sea, opts), sea);
}
