/**
 * AIS ships near the coast (PLAN 7.97) from AISStream. Each build listens for about two minutes in AIS_BOX
 * and merges what it hears into the vessels published by the last build, so the file holds every ship seen in
 * the last 24 h with its last known position. Needs the AISSTREAM_API_KEY repo secret; without it the
 * feed fails and keeps its previous file. No CORS and a secret key, so it is relayed, never fetched by the app.
 */
import { writeFileSync } from 'node:fs';
import { get } from './common.ts';
import { AIS_BOX } from '../../src/region.ts';
import { recentVessels, type AisData, type Vessel } from '../../src/adapters/ais-parse.ts';
import { listenAis } from './ais-listen.ts';

const LISTEN_S = 120;

export async function buildAis(dir: string): Promise<string> {
  const table = new Map<number, Vessel>();
  const base = process.env.FALLBACK_URL;
  if (base) {
    try {
      const prev = (await (await get(`${base}ais.json`, {}, 1)).json()) as AisData;
      for (const v of prev.vessels) table.set(v.mmsi, v);
    } catch {
      // Nothing published yet.
    }
  }
  const { heard, positions } = await listenAis(AIS_BOX, LISTEN_S, table);
  const now = Date.now();
  const out: AisData = { vessels: recentVessels(table.values(), now), fetchedAt: new Date(now).toISOString(), listenedS: LISTEN_S, heard };
  writeFileSync(`${dir}/ais.json`, JSON.stringify(out));
  return `ais: heard ${heard} messages (${positions} positions) in ${LISTEN_S} s, ${out.vessels.length} vessels in the last 24 h`;
}
