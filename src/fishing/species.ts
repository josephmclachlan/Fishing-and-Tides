/**
 * Shore and kayak target species (PLAN 4.5): edible fish only, from the 2026-11 eating-fish audit
 * (local catch: jurel, pargo, macarela, róbalo, small reef groupers, pez león; barracuda kept with a
 * ciguatera warning; tarpon dropped as a release-only sport fish). Plain data for the habitat score in habitat.ts.
 * Names are i18n keys (`fish.<id>`). The numbers are angling-guide rules of thumb. The structure
 * weights `w` are only the prior: fit.ts updates them from the OBIS/GBIF records (PLAN 4.4).
 * Depth range, mouth reach and season are used as written.
 */
export type SpeciesId = 'snook' | 'jack' | 'snapper' | 'mackerel' | 'grouper' | 'barracuda' | 'lionfish';

export interface Species {
  id: SpeciesId;
  /** Water depth, m: [absolute min, ideal from, ideal to, absolute max]. Score is 0 outside min..max. */
  depthM: readonly [number, number, number, number];
  /** Prior weights of the structure terms (sum to 1): river mouth, reef, drop-off. Fitted in fit.ts. */
  w: { mouth: number; reef: number; drop: number };
  /** How far, km, a river mouth's pull reaches (score falls off as a Gaussian of this width). */
  mouthReachKm: number;
  /** Season factor per month (Jan..Dec), 0.7 (off) to 1 (peak). Kept narrow so a wrong guess costs little. */
  season: readonly number[];
  /**
   * Water the species feeds best in (PLAN 7.11, fishing/water.ts), each [floor from, ideal from, ideal to, floor from]:
   * visibility, m (river-mouth hunters like stained water, reef sight-hunters clear), and sea temperature, °C.
   */
  water: { visM: readonly [number, number, number, number]; sstC: readonly [number, number, number, number] };
  /**
   * Ciguatera beside the picker: `true` is the red warning (large fish of these species often carry it); 'caution' is a
   * gentle amber note, for fish where it is uncommon but has been found (lionfish: Robertson et al. 2014, Toxicon 91:
   * 102-110, found toxin in some Caribbean lionfish; Costa Rica has no published cases).
   */
  ciguatera?: boolean | 'caution';
}

export const SPECIES: readonly Species[] = [
  { id: 'snook', depthM: [0.3, 0.5, 4, 10], w: { mouth: 0.8, reef: 0.1, drop: 0.1 }, mouthReachKm: 0.9, season: [0.85, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1, 1, 1, 0.95], water: { visM: [0.2, 0.5, 2.5, 6], sstC: [18, 24, 30, 33] } },
  { id: 'jack', depthM: [1, 2, 18, 40], w: { mouth: 0.5, reef: 0.25, drop: 0.25 }, mouthReachKm: 1.5, season: [0.9, 0.95, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 0.95, 0.9], water: { visM: [0.3, 1, 6, 15], sstC: [20, 24, 30, 33] } },
  { id: 'snapper', depthM: [4, 8, 30, 50], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 0.95, 0.9, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1], water: { visM: [1, 3, 15, 30], sstC: [20, 24, 29, 32] } },
  // Spanish mackerel (macarela): schools along reef edges and drop-offs in clear water. No local season data: flat.
  { id: 'mackerel', depthM: [1, 3, 25, 45], w: { mouth: 0.15, reef: 0.35, drop: 0.5 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [1.5, 3, 15, 30], sstC: [22, 25, 30, 33] } },
  // Small reef groupers (cabrilla, coney, hinds, black grouper): reef and rock, hand line or spear. Season not known locally: flat.
  { id: 'grouper', depthM: [2, 5, 40, 60], w: { mouth: 0.05, reef: 0.7, drop: 0.25 }, mouthReachKm: 0.8, season: Array(12).fill(0.95), water: { visM: [2, 4, 20, 40], sstC: [22, 24, 30, 33] }, ciguatera: true },
  { id: 'barracuda', depthM: [1.5, 3, 18, 40], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.9, 0.95, 1, 1], water: { visM: [1.5, 4, 20, 40], sstC: [20, 24, 30, 33] }, ciguatera: true },
  // Lionfish (pez león): invasive, eaten locally and its catch is encouraged; reef only, by spear, so clear water matters. All year.
  { id: 'lionfish', depthM: [1, 4, 40, 60], w: { mouth: 0, reef: 0.9, drop: 0.1 }, mouthReachKm: 0.5, season: Array(12).fill(1), water: { visM: [2, 6, 25, 40], sstC: [22, 24, 31, 33] }, ciguatera: 'caution' },
];

/** PEAK at 0.97 or more, GOOD from 0.88, else OFF: a coarse word for the season factor. */
export function seasonOf(sp: Species, month: number): 'peak' | 'good' | 'off' {
  const f = sp.season[((month % 12) + 12) % 12];
  return f >= 0.97 ? 'peak' : f >= 0.88 ? 'good' : 'off';
}

export const speciesById = (id: SpeciesId): Species => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
