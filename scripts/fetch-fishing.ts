/**
 * Builds public/data/fishing/mouths.geojson: river and creek mouths on the coast (PLAN 4.5).
 *
 *   npm run data:fishing
 *
 * Source: OpenStreetMap named waterways and coastline, via Overpass. A mouth is the downstream end of
 * a waterway (OSM draws them downstream) that is within 300 m of the coastline. Mouths closer than
 * 300 m to each other merge. Rivers weigh 1, creeks 0.5. Needs Node 22.18+; no dependencies.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { REGION } from '../src/region.ts';

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
const OUT = 'public/data/fishing';
const [[w, s], [e0, n]] = REGION.bounds;
/** Stop at the Sixaola: the rivers further east are in Panama. */
const e = Math.min(e0, -82.55);

interface El { tags: Record<string, string>; geometry: { lat: number; lon: number }[] }

async function overpass(query: string): Promise<El[]> {
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(110_000) });
      if (res.ok) return ((await res.json()) as { elements: El[] }).elements;
      console.warn(`${url}: ${res.status}`);
    } catch (err) {
      console.warn(`${url}: ${(err as Error).message}`);
    }
  }
  throw new Error('no Overpass mirror answered');
}

const els = await overpass(
  `[out:json][timeout:120];(way["waterway"~"^(river|stream|canal)$"]["name"](${s - 0.05},${w - 0.05},${n + 0.05},${e + 0.05});way["natural"="coastline"](${s - 0.1},${w - 0.1},${n + 0.1},${e + 0.1}););out geom tags;`,
);

const M_LAT = 110574;
const m = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180), (a[1] - b[1]) * M_LAT);

// Coastline densified to ~35 m so "near the coast" is a point-to-point test.
const coast: [number, number][] = [];
for (const el of els.filter((x) => x.tags.natural === 'coastline'))
  for (let i = 1; i < el.geometry.length; i++) {
    const a = el.geometry[i - 1], b = el.geometry[i];
    const k = Math.max(1, Math.ceil(m([a.lon, a.lat], [b.lon, b.lat]) / 35));
    for (let j = 0; j <= k; j++) coast.push([a.lon + ((b.lon - a.lon) * j) / k, a.lat + ((b.lat - a.lat) * j) / k]);
  }

const ways = els.filter((x) => x.tags.waterway);
const key = (p: { lat: number; lon: number }) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`;
const starts = new Set(ways.map((x) => key(x.geometry[0])));
const mouths: { name: string; rank: number; at: [number, number] }[] = [];
for (const wy of ways) {
  const last = wy.geometry[wy.geometry.length - 1];
  if (starts.has(key(last))) continue; // flows on into another way
  const at: [number, number] = [last.lon, last.lat];
  if (at[0] < w || at[0] > e || at[1] < s || at[1] > n) continue;
  if (!coast.some((c) => m(at, c) < 300)) continue;
  const rank = wy.tags.waterway === 'river' ? 1 : 0.5;
  const near = mouths.find((x) => m(x.at, at) < 300);
  if (near) {
    if (rank > near.rank || (rank === near.rank && /^R[ií]o/i.test(wy.tags.name))) Object.assign(near, { name: wy.tags.name, rank, at });
  } else mouths.push({ name: wy.tags.name, rank, at });
}

mkdirSync(OUT, { recursive: true });
const features = mouths.map((x) => ({ type: 'Feature', properties: { name: x.name, rank: x.rank }, geometry: { type: 'Point', coordinates: [Math.round(x.at[0] * 1e5) / 1e5, Math.round(x.at[1] * 1e5) / 1e5] } }));
writeFileSync(`${OUT}/mouths.geojson`, JSON.stringify({ type: 'FeatureCollection', features, fetchedAt: new Date().toISOString(), attribution: '© OpenStreetMap contributors (ODbL)' }));
console.log(`wrote ${features.length} mouths`);
