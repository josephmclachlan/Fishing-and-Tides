/**
 * Limón airport METAR relay (PLAN 2.11). aviationweather.gov sends no CORS headers, so the data
 * build fetches the last 36 h of MRLM reports and publishes them as data/forecast/metar.json.
 */
import { writeFileSync } from 'node:fs';
import { parseMetars, type MetarFile } from '../../src/adapters/metar-parse.ts';
import { METAR_STATION } from '../../src/region.ts';
import { get } from './common.ts';

export async function buildMetar(dir: string): Promise<string> {
  const rows = await (await get(`https://aviationweather.gov/api/data/metar?ids=${METAR_STATION.icao}&format=json&hours=36`)).json();
  const out: MetarFile = { station: METAR_STATION.icao, fetchedAt: new Date().toISOString(), obs: parseMetars(rows) };
  writeFileSync(`${dir}/metar.json`, JSON.stringify(out));
  const last = out.obs[0];
  return `metar: ${out.obs.length} reports, latest ${last ? new Date(last.t).toISOString().slice(0, 16) + 'Z ' + last.raw : 'none'}`;
}
