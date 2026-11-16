/**
 * NAVAREA IV navigational warnings from NGA Maritime Safety Information (PLAN 7.93). The service sends
 * no CORS headers, so the build relays the warnings that concern this coast as data/forecast/navwarn.json.
 * Public domain (US government). An empty list is a valid answer.
 */
import { writeFileSync } from 'node:fs';
import { get } from './common.ts';
import { parseNavWarnings } from '../../src/adapters/navwarn-parse.ts';

export async function buildNavWarn(dir: string): Promise<string> {
  const res = await get('https://msi.nga.mil/api/publications/broadcast-warn?navArea=4&status=active&output=json');
  const out = parseNavWarnings(await res.json(), Date.now());
  writeFileSync(`${dir}/navwarn.json`, JSON.stringify(out));
  return `navwarn: ${out.warnings.length} active near the coast, fetched ${out.fetchedAt}`;
}
