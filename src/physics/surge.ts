/**
 * Dive surge (PLAN 6.2): the back-and-forth water motion at the bottom under waves, which
 * throws divers and snorkellers onto the reef. Pure, no DOM, SI units.
 *
 *   H(h)  = H10 · Ks(h) / Ks(h10), capped at γ·h      shoal the spot's 10 m wave (3.3 K·Hs) to depth h
 *   ub    = π H / (T sinh kh)                         linear-theory peak bed velocity (waves.ts)
 *   A     = ub · T / 2π                               how far the water swings each way
 *
 * The band uses the significant height (the bigger third of the waves), so it errs on the
 * side of caution: CALM below 0.25 m/s, SURGY to 0.6 m/s, DANGEROUS above. A diver can hold
 * position against roughly 0.3 to 0.5 m/s, and swings of a metre or more near coral are where
 * injuries happen (cf. Soulsby 1997 for bed velocities; bands are our guidance, not a standard).
 */
import { GAMMA_DEFAULT, depthLimited } from './breaking';
import { bottomOrbitalVelocity, shoalingCoefficient } from './waves';

export type SurgeBand = 'CALM' | 'SURGY' | 'DANGEROUS';

export const SURGE_THRESHOLDS = { SURGY: 0.25, DANGEROUS: 0.6 } as const;

export interface Surge {
  /** Depth, m. */
  depth: number;
  /** Significant wave height at that depth, m. */
  H: number;
  /** Peak bed velocity, m/s. */
  uMs: number;
  /** Water swing each way, m. */
  excursionM: number;
  band: SurgeBand;
}

export function surgeBand(uMs: number): SurgeBand {
  if (uMs >= SURGE_THRESHOLDS.DANGEROUS) return 'DANGEROUS';
  if (uMs >= SURGE_THRESHOLDS.SURGY) return 'SURGY';
  return 'CALM';
}

/** Surge at depth h from the significant height Href at reference depth hRef (both > 0). */
export function surgeAt(Href: number, hRef: number, T: number, h: number): Surge {
  const H = depthLimited((Href * shoalingCoefficient(T, h)) / shoalingCoefficient(T, hRef), h, GAMMA_DEFAULT);
  const uMs = H > 0 ? bottomOrbitalVelocity(H, T, h) : 0;
  return { depth: h, H, uMs, excursionM: (uMs * T) / (2 * Math.PI), band: surgeBand(uMs) };
}

/** Typical dive and snorkel depths shown at a spot, m. */
export const DIVE_DEPTHS = [3, 6, 12] as const;

/**
 * Surge profile at a spot from its offshore Hs and the 3.3 result at the read point
 * (K = H/H0 there, at `readDepth`).
 */
export function surgeProfile(Hs: number, T: number, K: number, readDepth: number, depths: readonly number[] = DIVE_DEPTHS): Surge[] {
  return depths.map((h) => surgeAt(Hs * K, readDepth, T, h));
}
