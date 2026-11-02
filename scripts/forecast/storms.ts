/**
 * Active tropical cyclones from the National Hurricane Center (PLAN 7.3). NHC's CurrentStorms.json
 * has no CORS headers, so the data build relays it as data/forecast/storms.json. Quiet seasons give an
 * empty list, which is a valid answer. Only the Atlantic basin matters for the Caribbean coast.
 */
import { writeFileSync } from 'node:fs';
import { get } from './common.ts';
import { parseStorms } from '../../src/adapters/storms-parse.ts';

export async function buildStorms(dir: string): Promise<string> {
  const res = await get('https://www.nhc.noaa.gov/CurrentStorms.json');
  const out = parseStorms(await res.json(), Date.now());
  writeFileSync(`${dir}/storms.json`, JSON.stringify(out));
  return `storms: ${out.storms.length} active, fetched ${out.fetchedAt}`;
}
