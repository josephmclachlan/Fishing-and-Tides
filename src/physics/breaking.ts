/**
 * Breaking waves, energy and force (PLAN 3.4). Pure, no DOM, SI units.
 *
 *   Breaker height     Hb = 0.39 g^⅕ (T H0′²)^⅖            Komar & Gaughan (1972)
 *                      H0′ = Kr·H0, the refracted (unshoaled) deep-water height from 3.3
 *   Breaker index      γ = Hb/hb = b − a Hb/(g T²)           Weggel (1972), slope m = tan β
 *                      a = 43.8 (1 − e^(−19m)),  b = 1.56 / (1 + e^(−19.5m)); γ = 0.78 with no slope
 *   Surf similarity    ξ0 = tan β / √(H0/L0)                 Iribarren; Battjes (1974) classes:
 *                      spilling < 0.5 ≤ plunging < 3.3 ≤ surging/collapsing
 *   Energy density     E = ρ g H² / 8 (regular), ρ g Hs² / 16 (sea state), J/m²
 *   Energy flux        P = E Cg, W per metre of crest (the "wave power" readout)
 *   Breaking speed     cb = √(g (hb + Hb))                    solitary-wave celerity at the break
 *   Impact pressure    p = ½ ρ cb², Pa                         what a breaking crest pushes with
 *   Longshore current  V = 1.17 √(g Hb) sin αb cos αb         Longuet-Higgins (1970) / CEM II-4
 *
 * Sea states use Hs in place of H throughout (Komar & Gaughan with Hs gives the significant
 * breaker height). References: CEM (2002) II-4; Dean & Dalrymple (2002) Coastal Processes ch. 4.
 */
import { G, RHO_SEA, deepWavelength, kinematics } from './waves';

const RAD = Math.PI / 180;

/** Default depth-limited breaker index (McCowan's solitary-wave limit). */
export const GAMMA_DEFAULT = 0.78;

/** Komar & Gaughan breaker height (m) from the refracted deep-water height H0′ (m) and period T (s). */
export function breakerHeight(H0r: number, T: number): number {
  if (!(H0r > 0)) return 0;
  return 0.39 * G ** 0.2 * (T * H0r * H0r) ** 0.4;
}

/** Weggel breaker index γ = Hb/hb for beach slope tan β (null → 0.78). */
export function breakerIndex(Hb: number, T: number, slope: number | null): number {
  if (slope == null || !(slope > 0)) return GAMMA_DEFAULT;
  const m = Math.min(slope, 0.1); // Weggel fitted slopes up to 1:10.
  const a = 43.8 * (1 - Math.exp(-19 * m));
  const b = 1.56 / (1 + Math.exp(-19.5 * m));
  return Math.max(0.5, b - (a * Hb) / (G * T * T));
}

/** Iribarren number from deep-water height, period and slope. */
export function iribarren(H0: number, T: number, slope: number): number {
  return slope / Math.sqrt(H0 / deepWavelength(T));
}

export type BreakerType = 'spilling' | 'plunging' | 'surging';

/** Battjes (1974) breaker classes on the deep-water Iribarren number. */
export function breakerType(xi0: number): BreakerType {
  if (xi0 < 0.5) return 'spilling';
  if (xi0 < 3.3) return 'plunging';
  return 'surging';
}

/** Energy density, J/m², of a regular wave of height H. */
export const energyDensity = (H: number) => (RHO_SEA * G * H * H) / 8;
/** Energy density, J/m², of a sea state with significant height Hs. */
export const energyDensitySea = (Hs: number) => (RHO_SEA * G * Hs * Hs) / 16;

/** Energy flux (power) per metre of crest, W/m, of a sea state (Hs, T) at depth h. */
export function waveFlux(Hs: number, T: number, h: number): number {
  return energyDensitySea(Hs) * kinematics(T, h).cg;
}

/** Height after shoaling, capped where the depth can no longer hold it (H ≤ γ h). */
export function depthLimited(H: number, h: number, gamma = GAMMA_DEFAULT): number {
  return Math.min(H, gamma * Math.max(h, 0));
}

/** Longshore current at mid-surf, m/s, from breaker height and breaker angle to the shore normal. */
export function longshoreCurrent(Hb: number, angleDeg: number): number {
  const a = angleDeg * RAD;
  return 1.17 * Math.sqrt(G * Hb) * Math.sin(a) * Math.cos(a);
}

export interface BreakerInput {
  /** Offshore significant height, m. */
  H0: number;
  /** Peak period, s. */
  T: number;
  /** Refraction coefficient from 3.3 (1 = straight coast, no shelter). */
  Kr: number;
  /** Beach or reef slope tan β, or null if unknown. */
  slope: number | null;
  /** Wave angle to the shore normal at the break, degrees (0 = straight in), if known. */
  angleDeg?: number;
}

export interface Breaker {
  /** Breaker height, m. */
  Hb: number;
  /** Depth where it breaks, m. */
  hb: number;
  gamma: number;
  /** Deep-water surf similarity (NaN when the slope is unknown). */
  xi0: number;
  /** Null when the slope is unknown. */
  type: BreakerType | null;
  /** Wave power arriving at the break, kW per metre of beach. */
  powerKWm: number;
  /** Crest speed at the break, m/s. */
  speedMs: number;
  /** Impact pressure of the breaking crest, kPa (≈ tonnes-force per m² × 9.81). */
  impactKPa: number;
  /** Longshore current, m/s (signed with the angle; 0 if the angle is unknown). */
  longshoreMs: number;
}

/** Everything 4.2 shows for a spot's surf zone, from the offshore forecast and the 3.3 refraction. */
export function breaker(inp: BreakerInput): Breaker {
  const H0r = inp.H0 * Math.max(inp.Kr, 0);
  const Hb = breakerHeight(H0r, inp.T);
  const gamma = breakerIndex(Hb, inp.T, inp.slope);
  const hb = Hb / gamma;
  const xi0 = inp.slope != null && inp.slope > 0 && H0r > 0 ? iribarren(H0r, inp.T, inp.slope) : NaN;
  const speedMs = Math.sqrt(G * (hb + Hb));
  // Flux is conserved from offshore to the break (refraction spreads it along the coast by Kr²).
  const P = energyDensitySea(inp.H0) * kinematics(inp.T, Infinity).cg * inp.Kr * inp.Kr;
  return {
    Hb,
    hb,
    gamma,
    xi0,
    type: Number.isNaN(xi0) ? null : breakerType(xi0),
    powerKWm: P / 1000,
    speedMs,
    impactKPa: (0.5 * RHO_SEA * speedMs * speedMs) / 1000,
    longshoreMs: inp.angleDeg == null ? 0 : longshoreCurrent(Hb, inp.angleDeg),
  };
}

/**
 * Mean nearshore slope between a shoreline pin and a point offshore of it (e.g. the 3.3
 * `nearshorePoint`), tan β = depth / distance. Coarse on GEBCO, but it separates steep
 * reef-fronted spots from flat sand beaches.
 */
export function meanSlope(depthAtPoint: number, distanceM: number): number | null {
  if (!(depthAtPoint > 0) || !(distanceM > 0)) return null;
  return depthAtPoint / distanceM;
}
