/**
 * MUD WEEKS feed (PLAN 7.39): daily Kd490 at each reef's pixel for the last 90 time steps (more than the
 * 84-day window, because the product skips days), from NOAA CoastWatch ERDDAP (no CORS, so relayed).
 * One box request around the reef pixels answers in a few seconds; data/forecast/mud.json.
 */
import { writeFileSync } from 'node:fs';
import { CORAL_REEFS } from '../../src/region.ts';
import { MUD_LICENCE, mudFromTable, mudQuery } from '../../src/adapters/mud-parse.ts';
import type { ErddapTable } from '../../src/adapters/coral-parse.ts';
import { get } from './common.ts';

export const MUD_STEPS = 90;

export async function buildMud(dir: string): Promise<string> {
  const fetchedAt = new Date().toISOString();
  const table = ((await (await get(mudQuery(CORAL_REEFS, `last-${MUD_STEPS - 1}:1:last`), {}, 4)).json()) as { table: ErddapTable }).table;
  const d = mudFromTable(table, CORAL_REEFS, fetchedAt, MUD_LICENCE);
  writeFileSync(`${dir}/mud.json`, JSON.stringify(d));
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const filled = d.reefs.map((r) => `${r.id} ${r.kd.filter((x) => x !== null).length}/${d.days.length}`).join(', ');
  return `mud: ${d.reefs.length} reefs, ${day(d.days[0])}..${day(d.days[d.days.length - 1])}, days with Kd: ${filled}`;
}
