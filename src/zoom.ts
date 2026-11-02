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

/** Zoom the enhance fly-to lands on: close enough to see the beach and its breakers. */
export const ENHANCE_ZOOM = 14;
/** Most zoom levels one enhance hop covers; the box drawn is 1 / 2^step of the screen. */
export const ENHANCE_MAX_STEP = 2.5;
export const ENHANCE_MAX_HOPS = 4;
/** Most zoomed-in the enhance's opening pull-back may stop at (it also backs off until the region fits). */
export const ENHANCE_WIDE_ZOOM = 9;

/**
 * Zoom levels for each hop of the enhance sequence, from `z0` up to `zf`, evenly spaced,
 * at most `maxStep` apart (but never more than `maxHops` hops). Always ends at `zf`.
 */
export function planHops(z0: number, zf: number, maxStep = ENHANCE_MAX_STEP, maxHops = ENHANCE_MAX_HOPS): number[] {
  const dz = zf - z0;
  if (!(dz > 0.25)) return [zf];
  const n = Math.min(maxHops, Math.max(1, Math.ceil(dz / maxStep - 1e-9)));
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? zf : z0 + (dz * (i + 1)) / n));
}

/** Coarsest block, CSS px, reached when an enhance hop's zoom lands. */
export const MAX_BLOCK = LOCK_STEPS[0];

/**
 * Block size while zooming from `z0` to `z1`: sharp (1 px) at the start, coarsest on arrival,
 * growing in proportion to the zoom travelled (size = MAX_BLOCK^f, f = fraction of the way,
 * so each equal step in zoom multiplies the block by the same factor). Snapped down to a
 * LOCK_STEPS size so blocks tile the resolve cells.
 */
export function zoomBlock(z: number, z0: number, z1: number): number {
  const span = z1 - z0;
  const f = span > 0 ? Math.min(1, Math.max(0, (z - z0) / span)) : 1;
  const size = MAX_BLOCK ** f;
  return LOCK_STEPS.find((b) => b <= size + 1e-9) ?? 1;
}

/**
 * Zoom levels to pull back, keeping the centre fixed, so a point at screen offset (dx, dy) px
 * from the centre lands within `margin` of the half-viewport (w, h). Pulling back k levels
 * shrinks screen offsets by 2^k, so k = log2(offset / allowed), at least 0.
 */
export function zoomOutToFit(dx: number, dy: number, w: number, h: number, margin = 0.8): number {
  const need = Math.max(Math.abs(dx) / ((w / 2) * margin), Math.abs(dy) / ((h / 2) * margin));
  return need > 1 ? Math.log2(need) : 0;
}

/**
 * Easing that moves in `n` discrete jumps instead of a glide, like an old tracking system
 * stepping its optics. Holds each step, lands exactly on 1.
 */
export function steppedEase(n: number): (x: number) => number {
  return (x) => (x >= 1 ? 1 : Math.floor(Math.max(0, x) * n) / n);
}

/**
 * Leg durations, ms, for the ENHANCE-off sequence: the same zoom out, pan, zoom in as ENHANCE on,
 * but every leg is one smooth eased move. The pan is judged at the wide view, where it covers
 * `distM` of ground; the zoom in grows with the number of zoom levels `dz` it crosses.
 */
export function plainPanMs(distM: number): number {
  return Math.round(Math.min(2800, Math.max(1000, 900 + 250 * Math.sqrt(Math.max(0, distM) / 1000))));
}
export function plainZoomMs(dz: number): number {
  return Math.round(Math.min(4500, Math.max(1500, 1200 + 450 * Math.abs(dz))));
}
