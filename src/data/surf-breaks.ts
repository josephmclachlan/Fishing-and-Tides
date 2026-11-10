/**
 * Surf break catalog for Gandoca to Limón (PLAN 6.4). Pure data; the quality model that scores
 * each break against swell and wind is PLAN 6.3, which reads `facing` and `type`.
 *
 * - `lngLat`: a point on the beach at the break, from `SPOTS` (region.ts) where there is one,
 *   otherwise placed on the shoreline of the OSM land mask (2026-11-02); good to ~150 m.
 * - `facing`: bearing in degrees true that the shore faces (the seaward normal), measured from the
 *   land mask over ~1 km and rounded to 5°, good to about ±15°. Swell is best from this side.
 * - Text (type, hazards, notes) comes from the surf guides in `sources`, which disagree at times.
 *   `confidence` is 'check' for anything we could not confirm from two independent guides:
 *   the app shows a CHECK tag and the guides' links.
 * OSM has no `sport=surfing` objects here, so nothing was taken from it.
 */
export type BreakType = 'reef' | 'beach' | 'point';
export type Hazard = 'reef' | 'rip' | 'shorebreak' | 'crowd' | 'urchin';
export type BreakShape = 'right' | 'left' | 'peaks';

export interface SurfBreak {
  /** i18n suffix: `surf.<id>.note`. The name is a proper noun, kept here. */
  id: string;
  name: string;
  lngLat: [number, number];
  type: BreakType;
  shape: BreakShape;
  facing: number;
  hazards: readonly Hazard[];
  /** Guides report it works with swell from these compass bearings (from), when they agree. */
  swellFrom?: readonly [number, number];
  /** Best months per the guides (1 = Jan), when stated. */
  bestMonths?: readonly number[];
  /**
   * Soft tide preference (PLAN 7.25): 'high' = wants water over the reef or bar, 'mid' = best between the
   * extremes, 'any' = no effect. The guides disagree, so it is a nudge worth at most 12%, never a gate.
   */
  tidePref?: 'high' | 'mid' | 'any';
  confidence: 'ok' | 'check';
  sources: readonly { name: string; url: string }[];
}

export const SURF_BREAKS: readonly SurfBreak[] = [
  {
    id: 'salsa-brava',
    name: 'SALSA BRAVA',
    lngLat: [-82.7524, 9.6582],
    type: 'reef',
    shape: 'right',
    facing: 340,
    hazards: ['reef', 'urchin', 'rip', 'crowd'],
    swellFrom: [45, 135],
    tidePref: 'high', // shallow reef: more water over it is safer and cleaner (physical reasoning, no guide agrees)
    bestMonths: [11, 12, 1, 2, 3, 4],
    confidence: 'check', // the guides disagree on the season (Nov-Apr vs Jan-Mar for the big days)
    sources: [
      { name: 'Mondo Surf', url: 'https://www.mondo.surf/surf-spot/salsa-brava/guide/11910' },
      { name: 'Surfnerd', url: 'https://surfnerd.com/surf-forecast/salsa-brava' },
      { name: 'Culture Trip', url: 'https://www.theculturetrip.com/central-america/costa-rica/articles/the-best-surfing-spots-on-costa-ricas-caribbean-coast' },
    ],
  },
  {
    id: 'cocles',
    name: 'PLAYA COCLES',
    lngLat: [-82.7368, 9.6507],
    type: 'beach',
    shape: 'peaks',
    facing: 40,
    hazards: ['shorebreak', 'rip'],
    tidePref: 'mid', // steep shorebreak at the extremes (generic beach-break rule, not from a guide)
    bestMonths: [12, 1, 2, 3],
    confidence: 'ok',
    sources: [
      { name: 'Lonely Planet', url: 'https://www.lonelyplanet.com/points-of-interest/playa-cocles/1084501' },
      { name: 'Mondo Surf', url: 'https://www.mondo.surf/surf-spot/playa-cocles/guide/11907' },
    ],
  },
  {
    id: 'playa-negra',
    name: 'PLAYA NEGRA',
    lngLat: [-82.7789, 9.6633],
    type: 'beach',
    shape: 'peaks',
    facing: 40,
    hazards: ['rip'],
    confidence: 'check', // only one guide mentions it, as mellow on small swell
    sources: [{ name: 'Costa Rica Journeys', url: 'https://costaricajourneys.com/?p=4812' }],
  },
  {
    id: 'playa-grande',
    name: 'PLAYA GRANDE',
    lngLat: [-82.6698, 9.6325], // on the OSM shoreline (2026-11-10: the old pin sat 1 m in the sea); OSM has no node for this beach
    type: 'beach',
    shape: 'peaks',
    facing: 15,
    hazards: ['rip', 'shorebreak'],
    confidence: 'check', // one guide (Mondo Surf: rips and undertow, alternative when Cocles is too big); no second source, no tide or season data
    sources: [{ name: 'Mondo Surf', url: 'https://www.mondo.surf/surf-spot/playa-grande-2/guide/11908' }],
  },
  {
    id: 'playa-negra-cahuita',
    name: 'PLAYA NEGRA CAHUITA',
    lngLat: [-82.8535, 9.744],
    type: 'beach',
    shape: 'peaks',
    facing: 45,
    hazards: ['rip', 'reef'],
    tidePref: 'high', // Surfnerd: rising tide better, easy rollers at high tide; Surf-Forecast gives no tide
    confidence: 'check', // two guides agree on a NE-swell beach break, lefts and rights, SW wind offshore; tide and reef patches from Surfnerd only
    sources: [
      { name: 'Surfnerd', url: 'https://surfnerd.com/surf-forecast/playa-negra-limon' },
      { name: 'Surf-Forecast', url: 'https://www.surf-forecast.com/breaks/Playa-Negra_1' },
    ],
  },
];
