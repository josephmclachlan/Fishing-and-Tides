/**
 * MUD WEEKS history (PLAN 7.39): each reef's clear baseline Kd490 (20th percentile of the whole record)
 * and its highest MUD WEEKS per year since the record starts (2018), into
 * public/data/climatology/mud-history.json (committed, precached). Re-run once a year:
 *
 *   npm run data:mud-history
 *
 * Reads the record in 90-step chunks by index (a date range over the whole record times out
 * upstream; ~7 s a chunk, ~5 minutes in all). MUD WEEKS for the history uses REEF_DEPTH_M.
 */
import { writeFileSync } from 'node:fs';
import { CORAL_REEFS } from '../src/region.ts';
import { MUD_LICENCE, mudFromTable, mudQuery, type MudHistory } from '../src/adapters/mud-parse.ts';
import type { ErddapTable } from '../src/adapters/coral-parse.ts';
import { baselineKd, mudWeeksSeries, REEF_DEPTH_M } from '../src/physics/mud.ts';
import { get } from './forecast/common.ts';

const STEP = 90;
const timesUrl = `https://coastwatch.noaa.gov/erddap/griddap/noaacwNPPN20S3AkdSCIDINEOF2kmDaily.json?time%5B0:1:last%5D`;
const nSteps = ((await (await get(timesUrl, {}, 4)).json()) as { table: ErddapTable }).table.rows.length;
const days: number[] = [];
const kd: Record<string, (number | null)[]> = Object.fromEntries(CORAL_REEFS.map((r) => [r.id, []]));
for (let a = 0; a < nSteps; a += STEP) {
  const b = Math.min(nSteps - 1, a + STEP - 1);
  const table = ((await (await get(mudQuery(CORAL_REEFS, `${a}:1:${b}`), {}, 5)).json()) as { table: ErddapTable }).table;
  const d = mudFromTable(table, CORAL_REEFS, '', '');
  days.push(...d.days);
  for (const r of d.reefs) kd[r.id].push(...r.kd);
  console.log(`steps ${a}..${b}: ${new Date(d.days[0]).toISOString().slice(0, 10)}..${new Date(d.days[d.days.length - 1]).toISOString().slice(0, 10)}`);
}
const years = [...new Set(days.map((t) => new Date(t).getUTCFullYear()))].sort();
const reefs = CORAL_REEFS.map((r) => {
  const base = baselineKd(kd[r.id]);
  const mw = mudWeeksSeries(days, kd[r.id], base, REEF_DEPTH_M);
  const peak: (number | null)[] = years.map(() => null);
  const peakDay: (string | null)[] = years.map(() => null);
  mw.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const y = years.indexOf(new Date(days[i]).getUTCFullYear());
    if (peak[y] === null || v > peak[y]!) (peak[y] = Math.round(v * 100) / 100), (peakDay[y] = new Date(days[i]).toISOString().slice(0, 10));
  });
  console.log(r.id, 'baseline', base.toFixed(3), years.map((y, i) => `${y} ${peak[i] ?? '-'}`).join(', '));
  return { id: r.id, pixel: r.kdPixel, baselineKd: Math.round(base * 1e4) / 1e4, peak, peakDay };
});
const out: MudHistory = {
  fetchedAt: new Date().toISOString(),
  from: new Date(days[0]).toISOString().slice(0, 10),
  to: new Date(days[days.length - 1]).toISOString().slice(0, 10),
  years,
  reefs,
  method: `MUD WEEKS at ${REEF_DEPTH_M} m: src/physics/mud.ts. Baseline: 20th percentile of daily Kd490 over the record.`,
  licence: MUD_LICENCE,
};
writeFileSync('public/data/climatology/mud-history.json', JSON.stringify(out));
console.log(`mud-history: ${reefs.length} reefs, ${out.from}..${out.to}`);
