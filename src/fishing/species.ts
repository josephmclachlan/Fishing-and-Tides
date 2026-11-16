/**
 * Shore and kayak target species (PLAN 4.5): edible fish only, from the 2026-11 eating-fish audit
 * (local catch: jurel, pargo, macarela, róbalo, small reef groupers, pez león; barracuda kept with a
 * ciguatera warning; tarpon dropped as a release-only sport fish). Plain data for the habitat score in habitat.ts.
 * Names are i18n keys (`fish.<id>`). The numbers are angling-guide rules of thumb. The structure
 * weights `w` are only the prior: fit.ts updates them from the OBIS/GBIF records (PLAN 4.4).
 * Depth range, mouth reach and season are used as written.
 *
 * Two modes (PLAN 7.120, Joseph 2026-11-16): EAT, fish to keep and eat (the default and the old set), and SPORT, fish to
 * catch and release (barracuda moved here: no size of it is safe to eat). A species is in exactly one mode.
 */
export type SpeciesId = 'snook' | 'jack' | 'snapper' | 'mackerel' | 'grouper' | 'grunt' | 'pompano' | 'barracuda' | 'lionfish' | 'permit' | 'bonefish';

/** EAT: fish to keep and eat. SPORT: fish to catch and release. */
export type FishMode = 'eat' | 'sport';
export const MODES: readonly FishMode[] = ['eat', 'sport'];

export interface Species {
  id: SpeciesId;
  mode: FishMode;
  /**
   * 'low' tags the species RULE OF THUMB in the panel: fewer than about 20 records near this coast to fit the weights
   * (OBIS and GBIF, Limón to Sixaola, 2026-11-16: mackerel about 6, barracuda about 6), so the map is the hand-written
   * rules more than the records.
   */
  confidence?: 'low';
  /**
   * No mapped record between Gandoca and Cahuita (the species guide's local test). The HUD's RULE OF THUMB row then
   * says so in its own words, from the i18n key `fish.low.<id>`.
   */
  noLocalRecord?: true;
  /** Water depth, m: [absolute min, ideal from, ideal to, absolute max]. Score is 0 outside min..max. */
  depthM: readonly [number, number, number, number];
  /**
   * Prior weights of the structure terms (sum to 1): river mouth, reef, drop-off, and (PLAN 7.122) sand, seagrass and the
   * beach's surf strip (missing = 0). Fitted in fit.ts.
   */
  w: { mouth: number; reef: number; drop: number; sand?: number; grass?: number; surf?: number };
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
   * Surf feeders (PLAN 7.122): the offshore wave height, m, they feed best in, as [floor from, ideal from, ideal to,
   * floor from]. Some surf stirs up the sand crabs and clams they eat; flat water or a heavy shore break doesn't.
   * Read by the BITE water term (fishing/water.ts surfFit). Missing: waves only count through the calm term.
   */
  surfHsM?: readonly [number, number, number, number];
  /**
   * Ciguatera beside the picker: `true` is the red warning (large fish of these species often carry it); 'caution' is a
   * gentle amber note, for fish where it is uncommon but has been found (lionfish: Robertson et al. 2014, Toxicon 91:
   * 102-110, found toxin in some Caribbean lionfish; Costa Rica has no published cases).
   */
  ciguatera?: boolean | 'caution';
}

export const SPECIES: readonly Species[] = [
  // Snook: river mouths first, and the surf line beside them (PLAN 7.122 moved 0.15 of the mouth weight there).
  { id: 'snook', mode: 'eat', depthM: [0.3, 0.5, 4, 10], w: { mouth: 0.65, reef: 0.1, drop: 0.1, surf: 0.15 }, mouthReachKm: 0.9, season: [0.85, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1, 1, 1, 0.95], water: { visM: [0.2, 0.5, 2.5, 6], sstC: [18, 24, 30, 33] } },
  { id: 'jack', mode: 'eat', depthM: [1, 2, 18, 40], w: { mouth: 0.5, reef: 0.25, drop: 0.25 }, mouthReachKm: 1.5, season: [0.9, 0.95, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 0.95, 0.9], water: { visM: [0.3, 1, 6, 15], sstC: [20, 24, 30, 33] } },
  { id: 'snapper', mode: 'eat', depthM: [4, 8, 30, 50], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 0.95, 0.9, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1], water: { visM: [1, 3, 15, 30], sstC: [20, 24, 29, 32] } },
  // Spanish mackerel (macarela): schools along reef edges and drop-offs in clear water. No local season data: flat.
  { id: 'mackerel', mode: 'eat', confidence: 'low', depthM: [1, 3, 25, 45], w: { mouth: 0.15, reef: 0.35, drop: 0.5 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [1.5, 3, 15, 30], sstC: [22, 25, 30, 33] } },
  // Small reef groupers (cabrilla, coney, hinds, black grouper): reef and rock, hand line or spear. Season not known locally: flat.
  { id: 'grouper', mode: 'eat', depthM: [2, 5, 40, 60], w: { mouth: 0.05, reef: 0.7, drop: 0.25 }, mouthReachKm: 0.8, season: Array(12).fill(0.95), water: { visM: [2, 4, 20, 40], sstC: [22, 24, 30, 33] }, ciguatera: true },
  // Grunts (ronco, plus porkfish and black margate, burro): small reef fish eaten here, caught on hand lines from rocks and
  // reef edges. The most recorded eating fish on this coast (about 140 Haemulon records Limón to Sixaola, OBIS 2026-11-16).
  // They school over reef and rubble by day and feed over sand and seagrass at night. No local season data: flat.
  { id: 'grunt', mode: 'eat', depthM: [1, 2, 20, 35], w: { mouth: 0.1, reef: 0.7, drop: 0.2 }, mouthReachKm: 0.8, season: Array(12).fill(0.95), water: { visM: [1, 2, 20, 40], sstC: [22, 24, 30, 33] } },
  // Florida pompano (pámpano) and palometa: the surf strip of sandy beaches, eating mole crabs and coquina clams in the
  // wash. Rare here (1 or 2 records), so RULE OF THUMB. The species guide marks it as excellent eating. No local season.
  { id: 'pompano', mode: 'eat', confidence: 'low', noLocalRecord: true, depthM: [0.2, 0.4, 3, 8], w: { mouth: 0.1, reef: 0, drop: 0, sand: 0.3, surf: 0.6 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [0.3, 0.8, 6, 15], sstC: [20, 24, 30, 33] }, surfHsM: [0.1, 0.4, 1.5, 2.5] },
  // Barracuda: SPORT, catch and release (the guide's ciguatera advice: no size is lower risk; CDC: never eat it).
  { id: 'barracuda', mode: 'sport', confidence: 'low', depthM: [1.5, 3, 18, 40], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.9, 0.95, 1, 1], water: { visM: [1.5, 4, 20, 40], sstC: [20, 24, 30, 33] }, ciguatera: true },
  // Permit (pámpano, SPORT): catch and release by custom; sand and seagrass beside reef and the surf line. About 3 records.
  { id: 'permit', mode: 'sport', confidence: 'low', depthM: [0.3, 1, 12, 25], w: { mouth: 0, reef: 0.25, drop: 0.1, sand: 0.3, grass: 0.1, surf: 0.25 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [0.5, 1.5, 15, 30], sstC: [22, 24, 30, 33] }, surfHsM: [0, 0.2, 1.5, 2.5] },
  // Bonefish (macabí, SPORT): shallow sand and seagrass, often near mangrove creek mouths. This coast has no wide flats
  // (the tide moves a few tens of centimetres), which is why it is rare here (about 6 records). Calm water: no surf term.
  { id: 'bonefish', mode: 'sport', confidence: 'low', depthM: [0.1, 0.3, 2, 6], w: { mouth: 0.2, reef: 0, drop: 0, sand: 0.45, grass: 0.35 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [0.5, 1.5, 15, 30], sstC: [22, 25, 31, 34] } },
  // Lionfish (pez león): invasive, eaten locally and its catch is encouraged; reef only, by spear, so clear water matters. All year.
  { id: 'lionfish', mode: 'eat', depthM: [1, 4, 40, 60], w: { mouth: 0, reef: 0.9, drop: 0.1 }, mouthReachKm: 0.5, season: Array(12).fill(1), water: { visM: [2, 6, 25, 40], sstC: [22, 24, 31, 33] }, ciguatera: 'caution' },
];

/** PEAK at 0.97 or more, GOOD from 0.88, else OFF: a coarse word for the season factor. */
export function seasonOf(sp: Species, month: number): 'peak' | 'good' | 'off' {
  const f = sp.season[((month % 12) + 12) % 12];
  return f >= 0.97 ? 'peak' : f >= 0.88 ? 'good' : 'off';
}

/** The species of one mode, in list order. */
export const speciesIn = (mode: FishMode): readonly Species[] => SPECIES.filter((s) => s.mode === mode);

export const speciesById = (id: SpeciesId): Species => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
