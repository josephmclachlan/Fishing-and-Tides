/**
 * Bed stirring by waves and currents (PLAN 7.45), for the resuspension term of the clarity model.
 * Pure, SI units, no DOM. Formulas from Soulsby (1997), Dynamics of Marine Sands, Thomas Telford,
 * with equation numbers, and van Rijn (1984, J. Hydraulic Eng. 110: 1613-1641).
 *
 * The water clouds when the bed moves. Below the threshold of motion the sand sits still and the
 * water stays as clear as the rest of the sea. Past it, the moving sand lets go of the fine grains
 * caught between it, and the load in the water grows with the excess shear: van Rijn's reference
 * concentration goes as the transport stage T^1.5, with T = τ/τcr − 1. By the time the sand itself
 * is lifted into suspension (shear velocity equal to its settling velocity, Bagnold's criterion),
 * the water near the bed is fully stirred.
 *
 * Waves and current both shear the bed. Their combined peak stress is Soulsby's eq. 69 to 70. The app
 * does not track the angle between them, so this takes them at right angles, the middle case.
 */
import { bottomOrbitalVelocitySea } from './waves';

export const G = 9.81;
/** Seawater density, kg/m³, and kinematic viscosity at about 28 °C, m²/s (warm Caribbean water). */
export const RHO = 1024;
export const NU = 0.87e-6;
/** Sediment grain density over water density (quartz and coral sand, about 2.65). */
export const SAND_S = 2.65;
/**
 * Median grain size of the bed at the snorkel spots, m. No grain-size survey has been found for
 * Cahuita to Manzanillo; fine to medium sand (0.25 mm, the Wentworth boundary) is assumed, and the
 * threshold scales only weakly with it.
 */
export const SAND_D50_M = 0.25e-3;
const KAPPA = 0.4;

/** Dimensionless grain size D* (Soulsby eq. 75). */
export const dStar = (d: number, s = SAND_S, nu = NU) => d * Math.cbrt((G * (s - 1)) / (nu * nu));

/** Critical Shields parameter for the threshold of motion (Soulsby eq. 77). */
export const shieldsCritical = (dStarV: number) => 0.3 / (1 + 1.2 * dStarV) + 0.055 * (1 - Math.exp(-0.02 * dStarV));

/** Critical bed shear stress for motion, Pa: θcr·g·ρ·(s − 1)·d. */
export const tauCritical = (d = SAND_D50_M, s = SAND_S) => shieldsCritical(dStar(d, s)) * G * RHO * (s - 1) * d;

/** Settling velocity of a natural grain, m/s (Soulsby eq. 102). */
export const settlingVelocity = (d = SAND_D50_M, s = SAND_S, nu = NU) => (nu / d) * (Math.sqrt(10.36 ** 2 + 1.049 * dStar(d, s, nu) ** 3) - 10.36);

/** Bed roughness length for a flat sand bed, m: ks = 2.5·d50, z0 = ks/30 (Soulsby §3.4). */
export const roughness = (d = SAND_D50_M) => (2.5 * d) / 30;

/** Wave bed shear stress amplitude, Pa, rough turbulent: fw = 1.39·(A/z0)^−0.52, A = Ub·T/2π (Soulsby eq. 62a). */
export function waveShear(ubMs: number, tpS: number, z0 = roughness()): number {
  if (!(ubMs > 0 && tpS > 0)) return 0;
  const A = (ubMs * tpS) / (2 * Math.PI);
  const fw = 1.39 * Math.pow(A / z0, -0.52);
  return 0.5 * RHO * fw * ubMs * ubMs;
}

/** Current bed shear stress, Pa, from the depth-mean speed: CD = [κ / (ln(h/z0) − 1)]² (Soulsby eq. 37). */
export function currentShear(uMs: number, depthM: number, z0 = roughness()): number {
  if (!(uMs > 0 && depthM > z0 * Math.E * 2)) return 0;
  const cd = (KAPPA / (Math.log(depthM / z0) - 1)) ** 2;
  return RHO * cd * uMs * uMs;
}

/**
 * Peak bed shear stress under waves and a current, Pa (Soulsby eqs. 69 and 70): the wave-enhanced mean
 * τm = τc·[1 + 1.2·(τw / (τc + τw))^3.2], then τmax = √((τm + τw·cos φ)² + (τw·sin φ)²), here φ = 90°.
 */
export function combinedShear(tauW: number, tauC: number): number {
  const w = Math.max(0, tauW), c = Math.max(0, tauC);
  if (w + c <= 0) return 0;
  const tm = c * (1 + 1.2 * Math.pow(w / (c + w), 3.2));
  return Math.hypot(tm, w);
}

/** Stress at which the bed sand goes into suspension, Pa: shear velocity √(τ/ρ) equal to the settling velocity. */
export const tauSuspension = (d = SAND_D50_M, s = SAND_S) => RHO * settlingVelocity(d, s) ** 2;

/**
 * How stirred the water over the bed is, 0..1: 0 below the threshold of motion, then
 * (T / T_s)^1.5 with the transport stage T = τ/τcr − 1 (van Rijn 1984), reaching 1 where the
 * sand itself is suspended (T_s = τ_susp/τcr − 1, about 8 for 0.25 mm sand).
 */
export function stirring(tau: number, d = SAND_D50_M): number {
  const tc = tauCritical(d);
  const T = tau / tc - 1;
  if (!(T > 0)) return 0;
  const Ts = tauSuspension(d) / tc - 1;
  return Math.min(1, Math.pow(T / Ts, 1.5));
}

/**
 * Stirring at a point from the sea state (Hs, peak or mean period), depth and the depth-mean current
 * speed (0 or NaN when unknown).
 */
export function bedStirring(hs: number, tp: number, depthM: number, currentMs = 0): number {
  if (!(depthM > 0)) return 0;
  const ub = hs > 0 && tp > 0 ? bottomOrbitalVelocitySea(hs, tp, depthM) : 0;
  const tauW = waveShear(ub, tp);
  const tauC = Number.isFinite(currentMs) ? currentShear(currentMs, depthM) : 0;
  return stirring(combinedShear(tauW, tauC));
}
