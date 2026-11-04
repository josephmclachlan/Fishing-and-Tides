/**
 * Coral heat history (PLAN 7.32): yearly peak DHW per reef since 1985 from NOAA Coral Reef Watch,
 * into public/data/climatology/coral-history.json (committed, precached). Re-run once a year:
 *
 *   npm run data:coral-history
 *
 * Reef pixels are read from the live feed's choice (data/forecast/coral.json, run
 * `npm run data:forecast -- coral` first) so history and today use the same 5 km pixel.
 * One request per year, weekly samples over CORAL_BOX (date ranges over a box this small answer in
 * ~10 s; the whole record in one request times out upstream). Needs Node 22.18+.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { CORAL_BOX } from '../src/region.ts';
import type { CoralData, ErddapTable } from '../src/adapters/coral-parse.ts';
import { yearPeaks, type CoralHistory } from '../src/coral/history.ts';
import { get } from './forecast/common.ts';

const live = JSON.parse(readFileSync('public/data/forecast/coral.json', 'utf8')) as CoralData;
const pixels = live.reefs.map((r) => ({ id: r.id, pixel: r.pixel }));
const [[w, s], [e, n]] = CORAL_BOX;
const first = 1985, last = new Date().getUTCFullYear() - 1;
const years: number[] = [];
const peaks: ReturnType<typeof yearPeaks>[] = [];
for (let y = first; y <= last; y++) {
  // DHW starts on 25 March 1985.
  const from = y === 1985 ? '1985-03-25' : `${y}-01-01`;
  const sel = `degree_heating_week[(${from}T12:00:00Z):7:(${y}-12-31T12:00:00Z)][(${n}):1:(${s})][(${w}):1:(${e})]`;
  const url = `https://coastwatch.noaa.gov/erddap/griddap/noaacrwdhwDaily.json?${sel.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`;
  const table = ((await (await get(url, {}, 5)).json()) as { table: ErddapTable }).table;
  const p = yearPeaks(table, pixels);
  years.push(y);
  peaks.push(p);
  console.log(y, Object.entries(p).map(([id, v]) => `${id} ${v?.peak ?? '-'}`).join(', '));
}
const out: CoralHistory = {
  fetchedAt: new Date().toISOString(),
  years,
  reefs: pixels.map((p) => ({ id: p.id, pixel: p.pixel, peak: peaks.map((x) => x[p.id]?.peak ?? null), peakDay: peaks.map((x) => x[p.id]?.day ?? null) })),
  licence: live.licence,
};
writeFileSync('public/data/climatology/coral-history.json', JSON.stringify(out));
console.log(`coral-history: ${pixels.length} reefs, ${first}..${last}`);
