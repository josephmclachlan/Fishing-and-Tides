/**
 * Clear-water Kd490 baseline (PLAN 7.45): each 2 km pixel's 20th percentile (`kd490`, the clear state)
 * and median (`kd490Med`, the usual state) of daily Kd490 per calendar month over the whole record
 * (2018 on), on the same grid as the `kd490` feed, into
 * public/data/climatology/kd490-clim.json + .i16.gz (committed, precached). The clarity model falls
 * back to it once the newest satellite map is a few days old (src/physics/clarity-baseline.ts).
 * Re-run once a year:
 *
 *   npm run data:kd490-clim
 *
 * Reads every third day of the record in 180-index chunks (a date range over the whole record times
 * out upstream; ERDDAP often answers 502 at first, so each chunk retries). That is about 1,060 days,
 * ~90 a calendar month, plenty for a percentile. Chunks are cached in KD_CLIM_CACHE (default
 * .cache/kd490-clim, not committed), so an interrupted run picks up where it stopped.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { erddapToGrid } from '../src/adapters/erddap-parse.ts';
import { CLEAR_QUANTILE, monthlyQuantile } from '../src/physics/clarity-baseline.ts';
import { COAST_BOX, KD490_DATASET } from './forecast/satellite.ts';
import { get, writeSeries } from './forecast/common.ts';

const STRIDE = 3;
const CHUNK = 180;
const CACHE = process.env.KD_CLIM_CACHE ?? '.cache/kd490-clim';
const ERDDAP = 'https://coastwatch.noaa.gov/erddap/griddap/';
mkdirSync(CACHE, { recursive: true });

const enc = (s: string) => s.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
const nSteps = ((await (await get(`${ERDDAP}${KD490_DATASET}.json?${enc('time[0:1:last]')}`, {}, 4)).json()) as { table: { rows: unknown[] } }).table.rows.length;
const [[w, s], [e, n]] = COAST_BOX;
const times: number[] = [];
const frames: Float32Array[] = [];
let grid: ReturnType<typeof erddapToGrid>['grid'] | null = null;
for (let a = 0; a < nSteps; a += CHUNK) {
  const b = Math.min(nSteps - 1, a + CHUNK - 1);
  const file = `${CACHE}/d_${a}.json`;
  if (!existsSync(file)) {
    const url = `${ERDDAP}${KD490_DATASET}.json?${enc(`kd_490[${a}:${STRIDE}:${b}][0][(${n}):1:(${s})][(${w}):1:(${e})]`)}`;
    writeFileSync(file, await (await get(url, {}, 6)).text());
  }
  const g = erddapToGrid((JSON.parse(readFileSync(file, 'utf8')) as { table: Parameters<typeof erddapToGrid>[0] }).table, 0.01, 6);
  if (grid && (g.grid.cols !== grid.cols || g.grid.rows !== grid.rows)) throw new Error(`chunk ${a}: grid ${g.grid.cols}×${g.grid.rows}, expected ${grid.cols}×${grid.rows}`);
  grid ??= g.grid;
  times.push(...g.times);
  frames.push(...g.frames);
  console.log(`steps ${a}..${b}: ${new Date(g.times[0]).toISOString().slice(0, 10)}..${new Date(g.times[g.times.length - 1]).toISOString().slice(0, 10)}`);
}
if (!grid) throw new Error('no data');
const clim = monthlyQuantile(times, frames, CLEAR_QUANTILE);
const med = monthlyQuantile(times, frames, 0.5);
const from = new Date(times[0]).toISOString().slice(0, 10), to = new Date(times[times.length - 1]).toISOString().slice(0, 10);
const bytes = writeSeries('public/data/climatology', {
  feed: 'kd490-clim', kind: 'climatology', fetchedAt: new Date().toISOString(), grid,
  times: [...Array(12)].map((_, m) => Date.UTC(2000, m, 15, 12)),
  vars: [{ name: 'kd490', unit: '1/m', scale: 0.0002, offset: 0 }, { name: 'kd490Med', unit: '1/m', scale: 0.0002, offset: 0 }],
  sources: [{ id: KD490_DATASET, name: `VIIRS + OLCI Kd490, gap-filled (DINEOF), 2 km: ${CLEAR_QUANTILE * 100}th percentile and median per calendar month, every ${STRIDE}rd day ${from}..${to}`, fromMs: times[0], toMs: times[times.length - 1] }],
  licence: 'NOAA CoastWatch ERDDAP, public domain; credit NOAA/NESDIS',
}, { kd490: clim, kd490Med: med });
console.log(`kd490-clim: ${grid.cols}×${grid.rows}, ${times.length} days ${from}..${to}, ${Math.round(bytes / 1024)} KB`);
