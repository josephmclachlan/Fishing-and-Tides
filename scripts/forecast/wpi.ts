/**
 * NGA World Port Index (PLAN 7.94), relayed for the ports near this coast as data/forecast/wpi.json.
 * Public domain; no CORS, so the build fetches it. The index changes a few times a year.
 */
import { writeFileSync } from 'node:fs';
import { get } from './common.ts';
import { parseWpi } from '../../src/adapters/wpi-parse.ts';

export async function buildWpi(dir: string): Promise<string> {
  const res = await get('https://msi.nga.mil/api/publications/world-port-index?output=json');
  const out = parseWpi(await res.json(), Date.now());
  if (!out.ports.length) throw new Error('wpi: no ports inside the region box (schema changed?)');
  writeFileSync(`${dir}/wpi.json`, JSON.stringify(out));
  return `wpi: ${out.ports.length} ports near the coast: ${out.ports.map((p) => p.name).join(', ')}`;
}
