/**
 * Shore and kayak target species (PLAN 4.5): edible fish only, from the 2026-11 eating-fish audit
 * (local catch: jurel, pargo, macarela, róbalo, small reef groupers, pez león; barracuda kept with a
 * ciguatera warning; tarpon dropped as a release-only sport fish). Plain data for the habitat score in habitat.ts.
 * Names are i18n keys (`fish.<id>`). The numbers are angling-guide rules of thumb. The structure
 * weights `w` are only the prior: fit.ts updates them from the OBIS/GBIF records (PLAN 4.4).
 * Depth range, mouth reach and season are used as written.
 *
 * Two modes (PLAN 7.120, Joseph 2026-11-16): EAT, fish to keep and eat (the default and the old set), and SPORT, fish to
 * catch and release (barracuda moved here: no size of it is safe to eat). A species can be in both (permit).
 */
import type { CiguaTier } from './cigua';

export type SpeciesId = 'snook' | 'jack' | 'snapper' | 'mackerel' | 'grouper' | 'grunt' | 'pompano' | 'corvina' | 'mullet' | 'mojarra' | 'goatfish' | 'squid' | 'flounder' | 'squirrelfish' | 'spadefish' | 'barracuda' | 'lionfish' | 'permit' | 'bonefish' | 'tarpon' | 'lobster' | 'octopus' | 'cigua';

/** EAT: fish to keep and eat. SPORT: fish to catch and release. */
export type FishMode = 'eat' | 'sport';
export const MODES: readonly FishMode[] = ['eat', 'sport'];

export interface Species {
  id: SpeciesId;
  /**
   * EAT, SPORT or both (Joseph 2026-11-16: overlap is allowed for a sport fish that is genuinely eaten here, such as
   * permit). The panel holds the mode the user is in; the species only says where it is listed.
   */
  modes: readonly FishMode[];
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
  /**
   * Season factor per month (Jan..Dec), 0.7 (off) to 1 (peak). Kept narrow so a wrong guess costs little. 0 is a closed
   * season (lobster, 1 March to 30 June): nothing is drawn for it and the panel says CLOSED SEASON.
   */
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
   * Ciguatera beside the picker and on the forecast (fishing/cigua.ts): 'never' and 'high' are red, 'listed' and 'rare'
   * amber; the panel shows the size to keep for each species of the kind from the species guide.
   */
  ciguatera?: CiguaTier;
  /**
   * Taken by hand, not hook or spear (PLAN 7.125: lobster, octopus, cigua): freediving or wading. A spearfishing permit
   * covers fish only, so the panel says so, and like lionfish none is circled in any protected area.
   */
  byHand?: boolean;
}

export const SPECIES: readonly Species[] = [
  // Snook: river mouths first, and the surf line beside them (PLAN 7.122 moved 0.15 of the mouth weight there).
  { id: 'snook', modes: ['eat'], depthM: [0.3, 0.5, 4, 10], w: { mouth: 0.65, reef: 0.1, drop: 0.1, surf: 0.15 }, mouthReachKm: 0.9, season: [0.85, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1, 1, 1, 0.95], water: { visM: [0.2, 0.5, 2.5, 6], sstC: [18, 24, 30, 33] } },
  { id: 'jack', modes: ['eat'], depthM: [1, 2, 18, 40], w: { mouth: 0.5, reef: 0.25, drop: 0.25 }, mouthReachKm: 1.5, season: [0.9, 0.95, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 0.95, 0.9], water: { visM: [0.3, 1, 6, 15], sstC: [20, 24, 30, 33] }, ciguatera: 'high' },
  { id: 'snapper', modes: ['eat'], depthM: [4, 8, 30, 50], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 0.95, 0.9, 0.85, 0.8, 0.8, 0.85, 0.9, 0.95, 1, 1], water: { visM: [1, 3, 15, 30], sstC: [20, 24, 29, 32] }, ciguatera: 'high' },
  // Spanish mackerel (macarela): schools along reef edges and drop-offs in clear water. No local season data: flat.
  { id: 'mackerel', modes: ['eat'], confidence: 'low', depthM: [1, 3, 25, 45], w: { mouth: 0.15, reef: 0.35, drop: 0.5 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [1.5, 3, 15, 30], sstC: [22, 25, 30, 33] }, ciguatera: 'listed' },
  // Small reef groupers (cabrilla, coney, hinds, black grouper): reef and rock, hand line or spear. Season not known locally: flat.
  { id: 'grouper', modes: ['eat'], depthM: [2, 5, 40, 60], w: { mouth: 0.05, reef: 0.7, drop: 0.25 }, mouthReachKm: 0.8, season: Array(12).fill(0.95), water: { visM: [2, 4, 20, 40], sstC: [22, 24, 30, 33] }, ciguatera: 'high' },
  // Grunts (ronco, plus porkfish and black margate, burro): small reef fish eaten here, caught on hand lines from rocks and
  // reef edges. The most recorded eating fish on this coast (about 140 Haemulon records Limón to Sixaola, OBIS 2026-11-16).
  // They school over reef and rubble by day and feed over sand and seagrass at night. No local season data: flat.
  { id: 'grunt', modes: ['eat'], depthM: [1, 2, 20, 35], w: { mouth: 0.1, reef: 0.7, drop: 0.2 }, mouthReachKm: 0.8, season: Array(12).fill(0.95), water: { visM: [1, 2, 20, 40], sstC: [22, 24, 30, 33] }, ciguatera: 'listed' },
  // Florida pompano (pámpano) and palometa: the surf strip of sandy beaches, eating mole crabs and coquina clams in the
  // wash. No record between Gandoca and Cahuita (the nearest are at Limón and in Bocas del Toro), so RULE OF THUMB. The species guide marks it as excellent eating. No local season.
  { id: 'pompano', modes: ['eat'], confidence: 'low', noLocalRecord: true, depthM: [0.2, 0.4, 3, 8], w: { mouth: 0.1, reef: 0, drop: 0, sand: 0.3, surf: 0.6 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [0.3, 0.8, 6, 15], sstC: [20, 24, 30, 33] }, surfHsM: [0.1, 0.4, 1.5, 2.5], ciguatera: 'listed' },
  // Corvina (green and Jamaica weakfish, PLAN 7.124, and the croakers and drums sold as corvina, PLAN 7.147): eaten here and rated excellent by the guide. Soft sand and mud
  // bottom off river mouths, feeding in the stained plume; caught from boats on bottom rigs. Few records (57 in the
  // occurrence box with the croakers, about 10 near this coast), so RULE OF THUMB: the river mouth reaches 4 km (the plume) and the BITE water term rewards a river
  // running above its median (fishing/water.ts riverTerm, as for snook). No local season.
  { id: 'corvina', modes: ['eat'], confidence: 'low', depthM: [3, 6, 30, 50], w: { mouth: 0.55, reef: 0, drop: 0.15, sand: 0.3 }, mouthReachKm: 4, season: Array(12).fill(0.95), water: { visM: [0.2, 0.5, 4, 10], sstC: [22, 24, 30, 33] } },
  // Mullet (lisa and lisa blanca, PLAN 7.124): schools along the beach and in river mouths, taken with a cast net more
  // than a hook. 45 records in the occurrence box, about 17 near this coast. Stained, shallow water by the mouths and the surf strip. No season.
  { id: 'mullet', modes: ['eat'], confidence: 'low', depthM: [0.1, 0.3, 3, 6], w: { mouth: 0.5, reef: 0, drop: 0, sand: 0.2, surf: 0.3 }, mouthReachKm: 1.5, season: Array(12).fill(0.95), water: { visM: [0.2, 0.5, 5, 12], sstC: [20, 24, 31, 34] } },
  // Well-recorded eating fish from the species guide (PLAN 7.147; OBIS and GBIF records Limón to Sixaola, 2026-11-16,
  // first number in the occurrence box, second near this coast). Habitat from the guide; numbers are rules of thumb.
  // Mojarras (mojarra blanca, rayada, guacha, caitipa, mojarrita: about 130 and 25 records): sand and seagrass beside
  // mangroves and river mouths, 0 to 10 m, taken with a cast net or a small hook. Calm, shallow water; no season known.
  { id: 'mojarra', modes: ['eat'], depthM: [0.2, 0.5, 6, 12], w: { mouth: 0.35, reef: 0.05, drop: 0, sand: 0.35, grass: 0.25 }, mouthReachKm: 1.5, season: Array(12).fill(0.95), water: { visM: [0.3, 0.8, 8, 20], sstC: [20, 24, 31, 34] }, ciguatera: 'listed' },
  // Goatfish (salmonete amarillo and manchado, about 40 and 11 records): root in the sand beside the reef with their chin
  // barbels, 1 to 30 m; bottom hand line with small bait. Few records near this coast: RULE OF THUMB.
  { id: 'goatfish', modes: ['eat'], confidence: 'low', depthM: [1, 2, 20, 35], w: { mouth: 0, reef: 0.35, drop: 0.1, sand: 0.45, grass: 0.1 }, mouthReachKm: 0.5, season: Array(12).fill(0.95), water: { visM: [1.5, 3, 20, 40], sstC: [22, 24, 30, 33] }, ciguatera: 'listed' },
  // Caribbean reef squid (calamar de arrecife, about 45 and 5 records): over reef and seagrass, 1 to 8 m, in clear water;
  // taken with a small jig, mostly at dusk and night. A spearfishing permit covers fish only. RULE OF THUMB.
  { id: 'squid', modes: ['eat'], confidence: 'low', depthM: [0.5, 1, 8, 15], w: { mouth: 0, reef: 0.5, drop: 0.1, grass: 0.4 }, mouthReachKm: 0.5, season: Array(12).fill(0.95), water: { visM: [2, 4, 20, 40], sstC: [22, 24, 30, 33] } },
  // Spear targets the guide marks as eaten here (PLAN 7.147). Peacock flounder (lenguado, about 15 and 5 records): lies on
  // sand and rubble beside the reef, 1 to 20 m; a spear or bottom hand line. Clear water to see it. RULE OF THUMB.
  { id: 'flounder', modes: ['eat'], confidence: 'low', depthM: [0.5, 1, 15, 25], w: { mouth: 0, reef: 0.25, drop: 0, sand: 0.55, grass: 0.2 }, mouthReachKm: 0.5, season: Array(12).fill(0.95), water: { visM: [2, 4, 20, 40], sstC: [22, 24, 30, 33] } },
  // Squirrelfish (candil, about 45 and 14 records): red night fish that hide in reef holes by day, 1 to 30 m; spear or
  // night hand line. Ciguatera reported: keep under 30 cm. RULE OF THUMB.
  { id: 'squirrelfish', modes: ['eat'], confidence: 'low', depthM: [1, 2, 20, 35], w: { mouth: 0, reef: 0.85, drop: 0.15 }, mouthReachKm: 0.5, season: Array(12).fill(0.95), water: { visM: [2, 4, 25, 40], sstC: [22, 24, 30, 33] }, ciguatera: 'listed' },
  // Atlantic spadefish (paguala, about 24 and 3 records): schools over reef, wrecks and mangrove edges near river mouths,
  // 3 to 25 m; hand line or spear. Ciguatera reported: keep under 50 cm. RULE OF THUMB.
  { id: 'spadefish', modes: ['eat'], confidence: 'low', depthM: [2, 3, 20, 30], w: { mouth: 0.2, reef: 0.4, drop: 0.2, sand: 0.2 }, mouthReachKm: 1.5, season: Array(12).fill(0.95), water: { visM: [1, 2, 15, 30], sstC: [22, 24, 30, 33] }, ciguatera: 'listed' },
  // Barracuda: SPORT, catch and release (the guide's ciguatera advice: no size is lower risk; CDC: never eat it).
  { id: 'barracuda', modes: ['sport'], confidence: 'low', depthM: [1.5, 3, 18, 40], w: { mouth: 0.1, reef: 0.55, drop: 0.35 }, mouthReachKm: 1, season: [1, 1, 1, 0.95, 0.9, 0.85, 0.85, 0.9, 0.9, 0.95, 1, 1], water: { visM: [1.5, 4, 20, 40], sstC: [20, 24, 30, 33] }, ciguatera: 'never' },
  // Permit (pámpano): in both EAT and SPORT (Joseph 2026-11-16: overlap is allowed where a sport fish is genuinely eaten;
  // the guide rates it good eating). Released by sport anglers. Sand and seagrass beside reef and the surf line. About 3 records.
  { id: 'permit', modes: ['eat', 'sport'], confidence: 'low', depthM: [0.3, 1, 12, 25], w: { mouth: 0, reef: 0.25, drop: 0.1, sand: 0.3, grass: 0.1, surf: 0.25 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [0.5, 1.5, 15, 30], sstC: [22, 24, 30, 33] }, surfHsM: [0, 0.2, 1.5, 2.5], ciguatera: 'listed' },
  // Tarpon (sábalo, SPORT, PLAN 7.123): catch and release (Vulnerable, poor eating). Rolls at river mouths and along the
  // surf line in stained water. 12 records in the occurrence box, about 3 near this coast, so RULE OF THUMB. Season from the Caribbean tarpon fishery to the
  // north (Barra del Colorado: best January to May and September to October), kept narrow.
  { id: 'tarpon', modes: ['sport'], confidence: 'low', depthM: [0.5, 1, 10, 25], w: { mouth: 0.6, reef: 0.1, drop: 0.1, surf: 0.2 }, mouthReachKm: 1.5, season: [1, 1, 1, 1, 0.95, 0.85, 0.85, 0.9, 1, 1, 0.95, 0.95], water: { visM: [0.2, 0.5, 4, 10], sstC: [22, 25, 31, 34] }, ciguatera: 'listed' },
  // Bonefish (macabí, SPORT): shallow sand and seagrass, often near mangrove creek mouths. This coast has no wide flats
  // (the tide moves a few tens of centimetres), which is why it is rare here (about 6 records). Calm water: no surf term.
  { id: 'bonefish', modes: ['sport'], confidence: 'low', depthM: [0.1, 0.3, 2, 6], w: { mouth: 0.2, reef: 0, drop: 0, sand: 0.45, grass: 0.35 }, mouthReachKm: 1, season: Array(12).fill(0.95), water: { visM: [0.5, 1.5, 15, 30], sstC: [22, 25, 31, 34] }, ciguatera: 'listed' },
  // By hand (PLAN 7.125, Joseph 2026-11-16: "lobster and other similar suggestions"): eaten here and living on reef and
  // rock the map measures. Caribbean spiny lobster (langosta, and the spotted lobster): reef and rock 1 to 30 m, about 30
  // records near this coast; closed 1 March to 30 June (OSPESCA OSP-02-09, applied by INCOPESCA), 140 mm tail minimum,
  // never females with eggs, no scuba. Octopus (pulpo): reef, rock and rubble 0.5 to 25 m, about 13 records, no rule found.
  // Cigua (West Indian top shell, Cittarium pica): wave-washed rock at the waterline, gathered at low tide; no Costa Rican
  // rule found (a 2002 study recommended 40 mm shell width). Few records for octopus and cigua: RULE OF THUMB.
  { id: 'lobster', modes: ['eat'], byHand: true, depthM: [1, 3, 20, 30], w: { mouth: 0, reef: 0.8, drop: 0.2 }, mouthReachKm: 0.5, season: [1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], water: { visM: [1.5, 3, 20, 40], sstC: [22, 24, 30, 33] } },
  { id: 'octopus', modes: ['eat'], byHand: true, confidence: 'low', depthM: [0.5, 1, 15, 25], w: { mouth: 0, reef: 0.8, drop: 0.1, grass: 0.1 }, mouthReachKm: 0.5, season: Array(12).fill(0.95), water: { visM: [1.5, 3, 20, 40], sstC: [22, 24, 30, 33] } },
  { id: 'cigua', modes: ['eat'], byHand: true, confidence: 'low', depthM: [0.05, 0.2, 2, 5], w: { mouth: 0, reef: 0.9, drop: 0.1 }, mouthReachKm: 0.5, season: Array(12).fill(0.95), water: { visM: [0.3, 1, 20, 40], sstC: [20, 24, 31, 34] } },
  // Lionfish (pez león): invasive, eaten locally and its catch is encouraged; reef only, by spear, so clear water matters. All year.
  { id: 'lionfish', modes: ['eat'], depthM: [1, 4, 40, 60], w: { mouth: 0, reef: 0.9, drop: 0.1 }, mouthReachKm: 0.5, season: Array(12).fill(1), water: { visM: [2, 6, 25, 40], sstC: [22, 24, 31, 33] }, ciguatera: 'rare' },
];

/** PEAK at 0.97 or more, GOOD from 0.88, else OFF: a coarse word for the season factor. */
export function seasonOf(sp: Species, month: number): 'peak' | 'good' | 'off' | 'closed' {
  const f = sp.season[((month % 12) + 12) % 12];
  return f === 0 ? 'closed' : f >= 0.97 ? 'peak' : f >= 0.88 ? 'good' : 'off';
}

/** The species of one mode, in list order. */
export const speciesIn = (mode: FishMode): readonly Species[] => SPECIES.filter((s) => s.modes.includes(mode));

export const speciesById = (id: SpeciesId): Species => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
