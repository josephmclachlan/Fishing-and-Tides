/**
 * Snorkel spot catalog (PLAN 6.11): the named places the guides send snorkellers, tied to the
 * modelled `SPOTS` in region.ts so the outing score (physics/outing.ts) can rate each one live.
 * Advisory only. The guides disagree on access and rules, so every entry is `check` until the
 * park office or a local confirms it (Cahuita park office +506 2755-0302).
 *
 * - `spot`: the SPOTS name whose swell, wind and tide the rating uses; `lngLat` is that spot's pin.
 * - `access`: 'shore' swim from the beach, 'guide' a licensed guide is required, 'boat' reached by boat.
 * - `facing`: bearing in degrees true that the shore faces: the spot's measured `facing` (region.ts, from the
 *   OSM coastline, 2026-11-10). It feeds the on-shore wind stinger guess (±60°).
 * - Text is in i18n (`snk.<id>.note`). Sources are the guides it came from (searched 2026-11-04).
 */
export type SnorkelAccess = 'shore' | 'guide' | 'boat';

export interface SnorkelSpot {
  id: string;
  spot: string;
  lngLat: [number, number];
  access: SnorkelAccess;
  facing: number;
  confidence: 'ok' | 'check';
  sources: readonly { name: string; url: string }[];
}

export const SNORKEL_SPOTS: readonly SnorkelSpot[] = [
  {
    id: 'cahuita',
    spot: 'PUNTA CAHUITA',
    lngLat: [-82.8156, 9.7495],
    access: 'guide',
    facing: 347,
    confidence: 'check', // sources disagree: one says walk in from Punta Cahuita, most say a licensed guide is required
    sources: [
      { name: 'Vamos Rent-A-Car', url: 'https://vamosrentacar.com/blog/cahuita-national-park-caribbean/' },
      { name: 'Travelers and Dreamers', url: 'https://travelersanddreamers.com/cahuita-national-park/' },
    ],
  },
  {
    id: 'playa-chiquita',
    spot: 'PLAYA CHIQUITA WEST',
    lngLat: [-82.711, 9.6413],
    access: 'shore',
    facing: 18,
    confidence: 'check', // reef pools and coves described as calm, but no guide gives depth or best tide; unconfirmed
    sources: [{ name: 'Only Beaches', url: 'https://onlybeaches.com/costa-rica/limon/puerto-viejo-de-talamanca/playa-chiquita-puerto-viejo-de-talamanca' }],
  },
  {
    id: 'punta-uva',
    spot: 'PUNTA UVA',
    lngLat: [-82.6871, 9.6432],
    access: 'shore',
    facing: 355,
    confidence: 'check', // one guide: reef close enough to snorkel from the beach on flat days
    sources: [{ name: 'Tico Travel', url: 'https://ticotravel.com/diving-the-caribbean-coast-of-costa-rica/' }],
  },
  {
    id: 'manzanillo',
    spot: 'MANZANILLO',
    lngLat: [-82.6569, 9.634],
    access: 'boat',
    facing: 335,
    confidence: 'check', // reef is offshore; sources do not say how far
    sources: [{ name: 'Culture Trip', url: 'https://theculturetrip.com/central-america/costa-rica/articles/the-best-snorkeling-and-diving-spots-in-costa-rica/' }],
  },
  {
    id: 'gandoca',
    spot: 'GANDOCA',
    lngLat: [-82.6045, 9.5965],
    access: 'boat',
    facing: 45,
    confidence: 'check', // refuge reefs; dive boats run there from Punta Uva
    sources: [{ name: 'Tico Travel', url: 'https://ticotravel.com/diving-the-caribbean-coast-of-costa-rica/' }],
  },
  {
    id: 'rocking-js',
    spot: 'SALSA BRAVA',
    lngLat: [-82.7524, 9.6582],
    access: 'shore',
    facing: 342,
    confidence: 'check', // Joseph's local knowledge (2026-11-13): reef-protected beach; no guide gives depth or best tide. Shares the Salsa Brava reading
    sources: [],
  },
  {
    id: 'playa-chino',
    spot: 'SALSA BRAVA',
    lngLat: [-82.7524, 9.6582],
    access: 'shore',
    facing: 342,
    confidence: 'check', // Joseph's local knowledge (2026-11-13): reef-protected corals in Puerto Viejo; shares the Salsa Brava reading
    sources: [],
  },
  {
    id: 'arrecife',
    spot: 'PUNTA UVA',
    lngLat: [-82.6871, 9.6432],
    access: 'shore',
    facing: 355,
    confidence: 'check', // Joseph (2026-11-13): the next beach east of Punta Uva; shares the Punta Uva reading
    sources: [],
  },
];
