/**
 * Satellite rain over the river catchments (PLAN 7.51): NASA GPM IMERG Early Run, half-hourly, 0.1°,
 * from GES DISC. Each run lists the last IMERG_DAYS days, reads only the half hours the published
 * copy doesn't have yet (one OPeNDAP subset of the catchment cells each, under 1 KB), averages each
 * river's `rainBox` and writes data/forecast/rain-imerg.json (src/adapters/imerg-parse.ts). Needs the
 * free NASA Earthdata account in EARTHDATA_USERNAME and EARTHDATA_PASSWORD (scripts/forecast/earthdata.ts).
 */
import { writeFileSync } from 'node:fs';
import { PLUME_RIVERS } from '../../src/region.ts';
import {
  boxCells, catchmentMeans, IMERG_DATASET, IMERG_LICENCE, IMERG_NAME, listingFiles, mergeHalfHours, parseImergAscii, subsetOf, subsetQuery,
  type RainImerg,
} from '../../src/adapters/imerg-parse.ts';
import { get } from './common.ts';
import { earthdata, type Earthdata } from './earthdata.ts';

/** Days kept: the 7 the catchment-rain model reads back, plus one so its first hours are covered too. */
export const IMERG_DAYS = 8;
/**
 * Time a run may spend reading, ms. Each read takes GES DISC about 5 s, so a first run (about 380 half
 * hours) can't finish in one go: it reads the newest first, stops here and publishes what it has, and
 * the next hourly runs fill the older half hours. Later runs need two or three reads.
 */
export const IMERG_BUDGET_MS = 4 * 60e3;
const PARALLEL = 4;
const HOST = 'https://gpm1.gesdisc.eosdis.nasa.gov';

const dayPath = (ms: number) => {
  const d = new Date(ms);
  const doy = Math.floor((ms - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1;
  return `GPM_L3/${IMERG_DATASET}/${d.getUTCFullYear()}/${String(doy).padStart(3, '0')}/`;
};

async function previous(): Promise<RainImerg | null> {
  const base = process.env.FALLBACK_URL;
  if (!base) return null;
  try {
    const j = (await (await get(`${base}rain-imerg.json`, {}, 2)).json()) as RainImerg;
    return Array.isArray(j.times) && j.byRiver ? j : null;
  } catch {
    return null;
  }
}

export async function buildRainImerg(dir: string, now = Date.now(), ed?: Earthdata, prevFeed?: RainImerg | null, budgetMs = IMERG_BUDGET_MS): Promise<string> {
  const deadline = Date.now() + budgetMs;
  const user = process.env.EARTHDATA_USERNAME, pass = process.env.EARTHDATA_PASSWORD;
  if (!ed && (!user || !pass)) throw new Error('EARTHDATA_USERNAME and EARTHDATA_PASSWORD are not set');
  const session = ed ?? earthdata(user!, pass!);
  const prev = prevFeed === undefined ? await previous() : prevFeed;
  const fromMs = Math.floor(now / 864e5) * 864e5 - (IMERG_DAYS - 1) * 864e5;
  const have = new Set(prev?.times ?? []);

  const listed: { name: string; start: number; path: string }[] = [];
  for (let d = fromMs; d <= now; d += 864e5) {
    const path = dayPath(d);
    try {
      listed.push(...listingFiles(await session.text(`${HOST}/data/${path}`)).map((f) => ({ ...f, path })));
    } catch (err) {
      // Today's folder doesn't exist until its first file does.
      if (d + 864e5 <= now - 12 * 3.6e6) throw err;
    }
  }
  // Newest first: the recent hours matter most to the plume.
  const todo = listed.filter((f) => f.start >= fromMs && !have.has(f.start)).sort((a, b) => b.start - a.start);

  const box = subsetOf(PLUME_RIVERS);
  const nLon = box.i1 - box.i0 + 1, nLat = box.j1 - box.j0 + 1;
  const got: { start: number; means: Record<string, number | null> }[] = [];
  let failed = 0, firstErr = '';
  const read = async (f: (typeof todo)[number]) => {
    try {
      const text = await session.text(`${HOST}/opendap/${f.path}${f.name}.ascii?${subsetQuery(box)}`);
      got.push({ start: f.start, means: catchmentMeans(parseImergAscii(text, nLon, nLat), box, PLUME_RIVERS) });
    } catch (err) {
      if ((err as { fatal?: boolean }).fatal && !got.length) throw err;
      failed++;
      firstErr ||= err instanceof Error ? err.message : String(err);
    }
  };
  // The first one alone, so the login happens once and a bad login stops the run.
  if (todo.length) await read(todo[0]);
  // The first read failing means the rest would too (a login or format problem): stop and say why.
  if (todo.length && !got.length) throw new Error(`rain-imerg: the first half hour failed (${firstErr})`);
  let k = 1;
  for (; k < todo.length && Date.now() < deadline; k += PARALLEL) await Promise.all(todo.slice(k, k + PARALLEL).map(read));
  const left = Math.max(0, todo.length - k);
  if (todo.length && !got.length) throw new Error(`rain-imerg: none of ${todo.length} half hours read (${firstErr})`);

  const merged = mergeHalfHours(prev, got, PLUME_RIVERS, fromMs);
  if (!merged.times.length) throw new Error('rain-imerg: no half hours listed');
  const out: RainImerg = {
    feed: 'rain-imerg',
    fetchedAt: new Date(now).toISOString(),
    source: { id: IMERG_DATASET, name: IMERG_NAME },
    licence: IMERG_LICENCE,
    cells: Object.fromEntries(PLUME_RIVERS.map((r) => [r.name, boxCells(r.rainBox).length])),
    ...merged,
  };
  writeFileSync(`${dir}/rain-imerg.json`, JSON.stringify(out));
  const newest = new Date(merged.times[merged.times.length - 1]).toISOString().slice(0, 16);
  return `rain-imerg: ${merged.times.length} half hours to ${newest}Z, ${got.length} new${failed ? `, ${failed} failed (${firstErr})` : ''}${left ? `, ${left} left for the next runs` : ''}`;
}
