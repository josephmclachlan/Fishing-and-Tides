/** Zoom tier state with hysteresis. Pure; no DOM. */
import { TIERS, TIER_HYSTERESIS, tierForZoom, type Tier } from './region';

/**
 * Tier to show at `zoom`, given the tier shown now.
 * Stays on `current` while zoom is within `band` of its edges, so a pinch that
 * hovers on a boundary doesn't fire the transition over and over. Large jumps
 * (fly-to, double-tap) go straight to the tier the zoom is in.
 */
export function nextTier(current: Tier, zoom: number, band = TIER_HYSTERESIS): Tier {
  const lo = TIERS.indexOf(tierForZoom(zoom - band));
  const hi = TIERS.indexOf(tierForZoom(zoom + band));
  const cur = TIERS.indexOf(current);
  return cur >= lo && cur <= hi ? current : tierForZoom(zoom);
}

/** +1 when moving to a finer tier (zooming in), -1 when moving out, 0 if unchanged. */
export function tierDirection(from: Tier, to: Tier): -1 | 0 | 1 {
  return Math.sign(TIERS.indexOf(to) - TIERS.indexOf(from)) as -1 | 0 | 1;
}

/**
 * Pixel block size for the "lock-on" sharpen, CSS px, at progress t in 0..1.
 * Stepped (not smooth) so it reads as a digital sensor resolving, ending at 1 (sharp).
 * Powers of two so every level tiles a RESOLVE_CELL_PX cell exactly.
 */
export const LOCK_STEPS = [32, 16, 8, 4, 2, 1] as const;
export function pixelBlockAt(t: number): number {
  if (Number.isNaN(t)) return 1;
  const i = Math.floor(Math.min(1, Math.max(0, t)) * (LOCK_STEPS.length - 1));
  return LOCK_STEPS[i];
}

/** The screen resolves in square cells of this size, each on its own random schedule. */
export const RESOLVE_CELL_PX = 96;
/** Fraction of the acquire time one cell takes to go from coarse to sharp. */
export const CELL_SPAN = 0.4;

/**
 * Block size for one cell at overall progress t, where the cell starts resolving at
 * `delay` (0..1-CELL_SPAN). Gives the "detail comes in piece by piece" look.
 */
export function cellBlockAt(t: number, delay: number, span = CELL_SPAN): number {
  return pixelBlockAt((t - delay) / span);
}
