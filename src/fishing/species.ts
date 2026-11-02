/**
 * Shore and kayak target species (PLAN 4.5). Plain data for the rule-based habitat score in
 * habitat.ts. Names are i18n keys (`fish.<id>`). The numbers are angling-guide rules of thumb,
 * not fitted models: PLAN 4.4 / 4.7 replace them with OBIS/GBIF-fitted suitability.
 */
export type SpeciesId = 'tarpon' | 'snook' | 'jack' | 'snapper' | 'barracuda';

export interface Species {
  id: SpeciesId;
  /** Water depth, m: [absolute min, ideal from, ideal to, absolute max]. Score is 0 outside min..max. */
  depthM: readonly [number, number, number, number];
  /** Weights of the structure terms (sum to 1): river mouth, reef, drop-off. */
  w: { mouth: number; reef: number; drop: number };
  /** How far, km, a river mouth's pull reaches (score falls off as a Gaussian of this width). */
  mouthReachKm: number;
  /** Season factor per month (Jan..Dec), 0.7 (off) to 1 (peak). Kept narrow so a wrong guess costs little. */
  season: readonly number[];
}

export const SPECIES: readonly Species[] = [
  { id: 'tarpon', depthM: [0.5, 1, 8, 20], w: { mouth: 0.75, reef: 0, drop: 0.25 }, mouthReachKm: 1.2, season: [0.95, 1, 1, 1, 0.95, 0.85, 0.8, 0.8, 0.9, 1, 0.9, 0.9] },
  { id: 'snook', depthM: [0.3, 0.5, 4, 10], w: { mouth: 0.8, reef: 0.1, drop: 0.1 }, mouthReachKm: 0.9, season: [0.85, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1, 1, 1, 0.95] },
  { id: 'jack', depthM: [1, 2, 18, 40], w: { mouth: 0.5, reef: 0.25, drop: 0.25 }, mouthReachKm: 1.5, season: [0.9, 0.95, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 0.95, 0.9] },
  { id: 'snapper', depthM: [4, 8, 30, 50], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 0.95, 0.9, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1] },
  { id: 'barracuda', depthM: [1.5, 3, 18, 40], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.9, 0.95, 1, 1] },
];

/** PEAK at 0.97 or more, GOOD from 0.88, else OFF: a coarse word for the season factor. */
export function seasonOf(sp: Species, month: number): 'peak' | 'good' | 'off' {
  const f = sp.season[((month % 12) + 12) % 12];
  return f >= 0.97 ? 'peak' : f >= 0.88 ? 'good' : 'off';
}

export const speciesById = (id: SpeciesId): Species => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
