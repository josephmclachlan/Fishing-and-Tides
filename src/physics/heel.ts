/**
 * Point of sail and heel for a boat sailing along the coast (the FORECAST page's SAIL hero, PLAN 7.69). Pure, no DOM.
 *
 * The forecast does not know the sailor's course, so the hero assumes the usual trip here: along the coast, one way
 * or the other (REGION.coastTrendDeg). Of the two legs it shows the harder one, the one closer to the wind, because
 * that is the leg that heels the boat most and decides the day; the other leg's point of sail is given beside it.
 * A leg inside the no-go zone is sailed close-hauled on the tack nearest to it (a beat).
 *
 * Heel is a rule of thumb for a ~9 m (30 ft) cruising keelboat under full sail, not a stability calculation:
 *   heeling moment ∝ q·A·C_side ∝ V² · f(TWA)
 *   f(TWA) = 1 up to 45° (close-hauled, all the sail force is sideways), falling as ½(1 + cos(π(TWA − 45)/135)) to 0
 *            dead downwind (the force is all forward); 0.75 on a beam reach, 0.25 on a broad reach
 *   heel  = H_MAX · (1 − exp(−K · V² · f / H_MAX)), the righting moment growing with heel so it saturates
 * with V the true wind in knots, K = 0.1 °/kt² and H_MAX = 45°. That gives about 9° at 10 kt close-hauled, 18° at 15,
 * 27° at 20 and 34° at 25: crews here reef from about 25° (REEF_HEEL_DEG). True wind stands in for the apparent wind
 * (the apparent is stronger upwind, weaker downwind; f's shape takes some of that in).
 */
import { windAngle, type PointOfSail } from '../boat/route';

/** Closest a yacht points to the true wind, degrees (the same no-go zone as boat/route.ts windAngle). */
export const NO_GO_DEG = 40;
/** Close-hauled angle a beat is drawn at, degrees off the wind. */
export const BEAT_DEG = 45;
/** Heel past which a cruising keelboat should reef, degrees. */
export const REEF_HEEL_DEG = 25;
const K = 0.1;
const H_MAX = 45;

const norm = (d: number) => ((d % 360) + 360) % 360;

/** Share of the sail force that heels the boat, 0..1, at a true wind angle 0..180°. */
export function sideForce(twa: number): number {
  const a = Math.min(180, Math.max(0, Math.abs(twa)));
  return a <= 45 ? 1 : 0.5 * (1 + Math.cos((Math.PI * (a - 45)) / 135));
}

/** Rule-of-thumb heel, degrees, for a cruising keelboat under full sail (see the header). */
export function heelDeg(windKt: number, twa: number): number {
  const v = Math.max(0, windKt);
  return H_MAX * (1 - Math.exp((-K * v * v * sideForce(twa)) / H_MAX));
}

/** How far the boom is eased off the centreline, degrees: sheeted in close-hauled, nearly square on a run. */
export function boomDeg(twa: number): number {
  return Math.min(85, Math.max(6, 0.6 * (Math.abs(twa) - 28)));
}

export interface SailPose {
  /** Heading drawn, degrees true. */
  headingDeg: number;
  /** The coast course the leg follows, degrees true (equals the heading unless beating). */
  courseDeg: number;
  /** True wind angle off the bow, 0..180°. */
  twa: number;
  sail: PointOfSail;
  /** The coast course is inside the no-go zone: the boat beats (tacks) close-hauled at BEAT_DEG. */
  beat: boolean;
  /** Wind over the starboard side (starboard tack) or the port side. The boat heels and the boom swings the other way. */
  tack: 'port' | 'starboard';
  /** The other coast leg: its course and point of sail. */
  other: { courseDeg: number; twa: number; sail: PointOfSail };
}

/** The harder of the two coast legs for a wind from `windFromDeg`, as the boat would sail it. */
export function coastPose(windFromDeg: number, coastDeg: number): SailPose {
  const c1 = norm(coastDeg), c2 = norm(coastDeg + 180);
  const a1 = windAngle(c1, windFromDeg), a2 = windAngle(c2, windFromDeg);
  const [course, hard, otherC, other] = a1.twa <= a2.twa ? [c1, a1, c2, a2] : [c2, a2, c1, a1];
  // Signed angle from the course to the wind, −180..180: positive = wind on the starboard side.
  let rel = norm(windFromDeg - course);
  if (rel > 180) rel -= 360;
  const tack = rel >= 0 ? 'starboard' : 'port';
  const beat = hard.twa < NO_GO_DEG;
  const headingDeg = beat ? norm(windFromDeg - (tack === 'starboard' ? BEAT_DEG : -BEAT_DEG)) : course;
  const twa = beat ? BEAT_DEG : hard.twa;
  return { headingDeg, courseDeg: course, twa, sail: beat ? 'closeHauled' : hard.sail, beat, tack, other: { courseDeg: otherC, twa: other.twa, sail: other.sail } };
}
