/**
 * Builds public/data/zones/zones.geojson, the protected-area outlines (PLAN 4.3).
 *
 *   npm run data:zones
 *
 * Source: OpenStreetMap boundary relations, which carry SINAC's 2019 boundaries
 * (tags source=SINAC, ref:CR:SINAC). WDPA is not used: its terms bar redistribution.
 * Cahuita and Gandoca-Manzanillo include their marine parts; Limoncito is the small refuge at the Río Limoncito mouth. Needs Node 22.18+; no dependencies.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { stitchRings, type LngLat, type ZoneProps } from '../src/zones.ts';

/** Overpass mirrors, tried in order (overpass-api.de is blocked from some build sandboxes). */
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const OUT = 'public/data/zones';

/** The areas we draw: OSM relation → our id and how the zone is drawn (rules are in src/rules.ts). */
const AREAS = [
  { rel: 12582073, id: 'cahuita', status: 'restricted' },
  { rel: 11805965, id: 'gandoca', status: 'restricted' },
  { rel: 11808241, id: 'limoncito', status: 'restricted' },
] as const;

interface Member { type: string; role: string; geometry?: { lat: number; lon: number }[] }
interface Rel { id: number; tags: Record<string, string>; members: Member[] }

async function overpass(query: string): Promise<{ elements: Rel[] }> {
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(90_000) });
      if (res.ok) return (await res.json()) as { elements: Rel[] };
      console.warn(`${url}: ${res.status}`);
    } catch (e) {
      console.warn(`${url}: ${(e as Error).message}`);
    }
  }
  throw new Error('no Overpass mirror answered');
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;

const data = await overpass(`[out:json][timeout:90];(${AREAS.map((a) => `relation(${a.rel});`).join('')});out geom;`);
const features = AREAS.map((a) => {
  const rel = data.elements.find((e) => e.id === a.rel);
  if (!rel) throw new Error(`relation ${a.rel} missing`);
  const ways = rel.members.filter((m) => m.type === 'way' && m.role === 'outer' && m.geometry).map((m) => m.geometry!.map((p): LngLat => [round(p.lon), round(p.lat)]));
  const rings = stitchRings(ways);
  if (!rings.length) throw new Error(`relation ${a.rel}: boundary does not close`);
  const properties: ZoneProps = { id: a.id, status: a.status, ref: rel.tags['ref:CR:SINAC'] ?? '', iucn: rel.tags.protect_class ?? '' };
  return { type: 'Feature' as const, properties, geometry: { type: 'MultiPolygon' as const, coordinates: rings.map((r) => [r]) } };
});

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/zones.geojson`, JSON.stringify({ type: 'FeatureCollection', features, fetchedAt: new Date().toISOString(), attribution: '© OpenStreetMap contributors (ODbL); boundaries from SINAC 2019' }));
console.log(`wrote ${features.length} zones`);
