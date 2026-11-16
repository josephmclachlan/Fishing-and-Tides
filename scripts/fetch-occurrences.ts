/**
 * Builds public/data/fishing/occurrences.json: where our target fish have been recorded (PLAN 4.7).
 *
 *   npm run data:occurrences
 *
 * Sources: OBIS (api.obis.org) and GBIF (api.gbif.org) occurrence records for the shore, kayak and
 * boat species, in a box around the region. The two overlap, so records are merged when species,
 * position (rounded to ~100 m) and year match. Records are sparse here (tens, not thousands), so
 * the app uses them as a modest nudge to the habitat score, never as the score. Needs Node 22.18+.
 *
 *   OCC_ONLY=grunt,snapper npm run data:occurrences
 *
 * refetches only those species and keeps the rest of the existing file (GBIF answers 429 to cloud machines after a
 * burst, so a full run there can fail; calls are paced and a 429 waits longer before the retry). Behind an HTTPS proxy
 * (cloud sessions) run it with NODE_USE_ENV_PROXY=1, or Node fetches directly and GBIF answers 429.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { REGION } from '../src/region.ts';
import { OCCURRENCE_TAXA, type OccurrenceFile } from '../src/species/kinds.ts';

const PAD = 0.5;
const [[w0, s0], [e0, n0]] = REGION.bounds;
const BOX = { w: w0 - PAD, s: s0 - PAD, e: e0 + PAD, n: n0 + PAD };
const OUT = 'public/data/fishing';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function json(url: string, tries = 5): Promise<any> {
  for (let i = 0; ; i++) {
    await sleep(400);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(40_000) });
      if (!res.ok) throw Object.assign(new Error(`${res.status} ${url}`), { status: res.status });
      return await res.json();
    } catch (err) {
      if (i >= tries - 1) throw err;
      await sleep(((err as { status?: number }).status === 429 ? 15_000 : 1500) * (i + 1));
    }
  }
}

const poly = `POLYGON((${BOX.w} ${BOX.s},${BOX.e} ${BOX.s},${BOX.e} ${BOX.n},${BOX.w} ${BOX.n},${BOX.w} ${BOX.s}))`;
type Rec = { lng: number; lat: number; year: number | null };

async function obis(name: string): Promise<Rec[]> {
  const out: Rec[] = [];
  for (let after = ''; ; ) {
    const r = await json(`https://api.obis.org/v3/occurrence?scientificname=${encodeURIComponent(name)}&geometry=${encodeURIComponent(poly)}&size=1000${after}`);
    for (const o of r.results) if (Number.isFinite(o.decimalLongitude) && Number.isFinite(o.decimalLatitude)) out.push({ lng: o.decimalLongitude, lat: o.decimalLatitude, year: o.date_year ?? null });
    if (r.results.length < 1000) return out;
    after = `&after=${r.results[r.results.length - 1].id}`;
  }
}

async function gbif(name: string): Promise<Rec[]> {
  const out: Rec[] = [];
  for (let offset = 0; ; offset += 300) {
    const r = await json(`https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(name)}&hasCoordinate=true&hasGeospatialIssue=false&decimalLatitude=${BOX.s},${BOX.n}&decimalLongitude=${BOX.w},${BOX.e}&limit=300&offset=${offset}`);
    for (const o of r.results) out.push({ lng: o.decimalLongitude, lat: o.decimalLatitude, year: o.year ?? null });
    if (r.endOfRecords) return out;
  }
}

const only = (process.env.OCC_ONLY ?? '').split(',').filter(Boolean);
const old: OccurrenceFile | null = only.length && existsSync(`${OUT}/occurrences.json`) ? JSON.parse(readFileSync(`${OUT}/occurrences.json`, 'utf8')) : null;
const species: OccurrenceFile['species'] = {};
for (const [id, names] of Object.entries(OCCURRENCE_TAXA)) {
  if (old && !only.includes(id) && old.species[id]) {
    species[id] = old.species[id];
    continue;
  }
  const seen = new Set<string>();
  const pts: [number, number, number | null][] = [];
  for (const name of names)
    for (const rec of [...(await obis(name)), ...(await gbif(name))]) {
      const k = `${rec.lng.toFixed(3)},${rec.lat.toFixed(3)},${rec.year}`;
      if (seen.has(k)) continue;
      seen.add(k);
      pts.push([Math.round(rec.lng * 1e4) / 1e4, Math.round(rec.lat * 1e4) / 1e4, rec.year]);
    }
  species[id] = pts;
  console.log(`${id}: ${pts.length}`);
}

mkdirSync(OUT, { recursive: true });
const file: OccurrenceFile = { fetchedAt: new Date().toISOString(), box: [BOX.w, BOX.s, BOX.e, BOX.n], sources: ['OBIS', 'GBIF'], species };
writeFileSync(`${OUT}/occurrences.json`, JSON.stringify(file));
