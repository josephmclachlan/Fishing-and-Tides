/**
 * Coral bleaching heat stress (PLAN 7.23) from NOAA Coral Reef Watch v3.1 daily 5 km, CoastWatch ERDDAP
 * (no CORS, so relayed). Five products over CORAL_BOX for the last 84 days (the DHW window, so the
 * panel can draw the 12-week build-up), then one pixel per reef in CORAL_REEFS. Plain JSON,
 * data/forecast/coral.json, parsed by src/adapters/coral-parse.ts. Products are about 2 to 5 days late.
 *
 * Index-based time ranges (`last-83:1:last`) are used because ERDDAP answers them in about a second,
 * while date ranges over a box time out at the upstream server.
 */
import { writeFileSync } from 'node:fs';
import { CORAL_BOX, CORAL_REEFS } from '../../src/region.ts';
import { coralFromTables, type ErddapTable } from '../../src/adapters/coral-parse.ts';
import { get } from './common.ts';

const CW = 'https://coastwatch.noaa.gov/erddap/griddap/';
export const CORAL_DAYS = 84;
export const CORAL_LICENCE = 'NOAA Coral Reef Watch v3.1 (CoastWatch ERDDAP), public domain; credit NOAA Coral Reef Watch';

const PRODUCTS = {
  dhw: ['noaacrwdhwDaily', 'degree_heating_week'],
  hotspot: ['noaacrwhotspotDaily', 'hotspot'],
  sstAnomaly: ['noaacrwsstanomalyDaily', 'sea_surface_temperature_anomaly'],
  sst: ['noaacrwsstDaily', 'analysed_sst'],
  baa: ['noaacrwbaa7dDaily', 'bleaching_alert_area'],
} as const;

/** griddap query for one product; CRW stores latitude north to south. */
export function coralQuery(id: string, v: string, days = CORAL_DAYS): string {
  const [[w, s], [e, n]] = CORAL_BOX;
  const sel = `${v}[last-${days - 1}:1:last][(${n}):1:(${s})][(${w}):1:(${e})]`;
  return `${CW}${id}.json?${sel.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`;
}

export async function buildCoral(dir: string): Promise<string> {
  const fetchedAt = new Date().toISOString();
  const tables = {} as Record<keyof typeof PRODUCTS, ErddapTable>;
  for (const [k, [id, v]] of Object.entries(PRODUCTS) as [keyof typeof PRODUCTS, readonly [string, string]][]) {
    tables[k] = ((await (await get(coralQuery(id, v), {}, 4)).json()) as { table: ErddapTable }).table;
  }
  const d = coralFromTables(tables, CORAL_REEFS, fetchedAt, CORAL_LICENCE);
  writeFileSync(`${dir}/coral.json`, JSON.stringify(d));
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const last = (xs: (number | null)[]) => [...xs].reverse().find((x) => x !== null);
  return `coral: ${d.reefs.length} reefs, ${day(d.days[0])}..${day(d.days[d.days.length - 1])}, DHW now ${d.reefs.map((r) => `${r.id} ${last(r.dhw)}`).join(', ')}`;
}
