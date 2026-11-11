/**
 * How good the fishing water is at a spot (PLAN 7.83, Joseph 2026-11-11: "Blend in the spot's water"): the mean of the
 * best `top` cells within `radiusKm`, each cell's value being its best eating fish (habitat × season, nudged by the
 * records). The mean of a few best cells, not the single best, so one lucky cell doesn't carry a spot. Pure.
 */
export const SPOT_WATER_KM = 1.5;
export const SPOT_WATER_TOP = 6;

/** The share of the FISH score that is the spot's water; the rest is BITE, the coast-wide timing (tide, light, moon, weather). */
export const WATER_SHARE = 0.35;
/** Water this good or better is named as a reason on the spot card; below WATER_THIN it is named as thin. */
export const WATER_RICH = 0.7, WATER_THIN = 0.45;

export function spotWater(cells: readonly { lng: number; lat: number }[], best: ArrayLike<number>, lng: number, lat: number, radiusKm = SPOT_WATER_KM, top = SPOT_WATER_TOP): number | null {
  const kx = Math.cos((lat * Math.PI) / 180) * 111.32, r2 = radiusKm * radiusKm;
  const vs: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const dx = (cells[i].lng - lng) * kx, dy = (cells[i].lat - lat) * 111.32;
    if (dx * dx + dy * dy <= r2 && best[i] === best[i]) vs.push(best[i]);
  }
  if (!vs.length) return null;
  vs.sort((a, b) => b - a);
  const n = Math.min(top, vs.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += vs[i];
  return s / n;
}

/** The FISH score: BITE (0..100) blended with the spot's water (0..1); BITE alone where the water is not known. Pure. */
export const fishScore = (bite: number, water: number | null | undefined): number =>
  typeof water === 'number' && Number.isFinite(water) ? Math.round((1 - WATER_SHARE) * bite + WATER_SHARE * 100 * Math.min(1, Math.max(0, water))) : bite;
