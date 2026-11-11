/**
 * Spearfishing areas (Joseph, 2026-11-11): where a breath-hold hunter can work and where the law lets them. Pure: no DOM.
 *
 * Targets are the edible reef fish a spearfisher takes here: small reef groupers, snapper, jack and lionfish (pez león, a
 * cull the authorities encourage). Barracuda is left out (ciguatera), mackerel (open-water schooler) and snook (river-mouth
 * ambusher, a line fish). Each cell's SPEAR score is its best target's habitat score (fishing/habitat.ts) times a depth window:
 *   0 below 1.5 m of water, 1 from 3 to 15 m, back to 0 at 22 m
 * (a breath-hold hunter works 3 to 15 m; shallow-water blackout risk climbs with depth and effort; our guidance, not a standard).
 * The law is spearStatus (rules.ts): a national park or closed water bans it (the layer shades what would otherwise be good
 * water red), a refuge with no marine rule found is marked CHECK and gets no circled zone, the rest is open to the permit holder.
 */
import type { SpeciesId } from './species';

export const SPEAR_SPECIES: readonly SpeciesId[] = ['grouper', 'snapper', 'jack', 'lionfish'];

const ramp = (x: number, lo: number, hi: number) => Math.min(1, Math.max(0, (x - lo) / (hi - lo)));

/** 0..1: how workable this depth is for a breath-hold hunter. */
export const spearWindow = (depthM: number): number => (Number.isFinite(depthM) ? ramp(depthM, 1.5, 3) * (1 - ramp(depthM, 15, 22)) : 0);

/** The cell's spear score from its target species' habitat scores (0..1 each) and its depth. */
export function spearScore(byTarget: Readonly<Partial<Record<SpeciesId, number>>>, depthM: number): number {
  let best = 0;
  for (const id of SPEAR_SPECIES) best = Math.max(best, byTarget[id] ?? 0);
  return best * spearWindow(depthM);
}
