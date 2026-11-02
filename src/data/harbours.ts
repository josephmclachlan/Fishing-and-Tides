/**
 * Harbours, piers and anchorages for Gandoca to Limón (PLAN 6.7). Pure data.
 *
 * Positions of harbours and piers are OpenStreetMap objects (ids in `osm`); the anchorage position
 * is an approximate area, drawn from a cruiser's account, and says so. Nothing here is a chart:
 * depths, holding and port rules change, and the sources are old. The shelter rows in the HUD
 * (physics/fetch.ts) are computed from the coastline, not taken from these entries.
 * NGA's World Port Index was unreachable when this was built (HTTP 503), so it is not used yet.
 */
export type PlaceKind = 'harbour' | 'marina' | 'pier' | 'anchorage';

export interface Place {
  id: string;
  name: string;
  lngLat: [number, number];
  kind: PlaceKind;
  /** OSM element this position comes from, e.g. 'node/5533468940'. */
  osm?: string;
  /** 'check' when the name, position or facts could not be confirmed from two places. */
  confidence: 'ok' | 'check';
  sources: readonly { name: string; url: string }[];
}

export const PLACES: readonly Place[] = [
  {
    id: 'puerto-limon',
    name: 'PUERTO LIMÓN',
    lngLat: [-83.0252, 9.9909],
    kind: 'harbour',
    osm: 'node/5533468940',
    confidence: 'ok',
    sources: [
      { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/node/5533468940' },
      { name: 'CruisersWiki: Puerto Limon', url: 'https://www.CruisersWiki.org/wiki/Puerto_Limon' },
    ],
  },
  {
    id: 'limon-anchorage',
    name: 'LIMÓN ANCHORAGE (APPROX)',
    lngLat: [-83.0215, 9.9955],
    kind: 'anchorage',
    confidence: 'check', // 2010 account: yachts anchor off the commercial port, not south of Pier 5, ~16 ft with good holding, exposed to wind and swell
    sources: [
      { name: 'Noonsite: Costa Rica, December 2010', url: 'https://www.noonsite.com/?p=55220' },
      { name: 'CruisersWiki: Puerto Limon', url: 'https://www.CruisersWiki.org/wiki/Puerto_Limon' },
    ],
  },
  {
    id: 'moin-boat-terminal',
    name: 'MOÍN BOAT TERMINAL',
    lngLat: [-83.0787, 9.9986],
    kind: 'marina',
    osm: 'way/199855890',
    confidence: 'check', // name and piers from OSM only
    sources: [{ name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/way/199855890' }],
  },
  {
    id: 'portete-pier',
    name: 'PORTETE PIER',
    lngLat: [-83.0667, 10.0113],
    kind: 'pier',
    osm: 'way/523787147',
    confidence: 'check', // an unnamed pier in OSM; the name is the nearby place
    sources: [{ name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/way/523787147' }],
  },
];
