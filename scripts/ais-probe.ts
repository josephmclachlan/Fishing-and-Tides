/**
 * One-off coverage probe for AIS (PLAN 7.96): listen for N minutes over the coast and over a wider box, and print
 * how many distinct ships were heard per 0.1° of latitude, so we can say honestly where traffic shows up.
 * Run by .github/workflows/ais-probe.yml (needs AISSTREAM_API_KEY). Usage: node scripts/ais-probe.ts [minutes]
 */
import { latitudeBands, shipClass, type Vessel } from '../src/adapters/ais-parse.ts';
import { AIS_BOX } from '../src/region.ts';
import { listenAis } from './forecast/ais-listen.ts';

const minutes = Number(process.argv[2] ?? 8);
const WIDE: [[number, number], [number, number]] = [[-84.5, 8.5], [-81.0, 11.5]];
const run = async (label: string, box: typeof AIS_BOX, secs: number) => {
  const t = new Map<number, Vessel>();
  const r = await listenAis(box, secs, t);
  const v = [...t.values()].filter((x) => Number.isFinite(x.lngLat[0]));
  console.log(`\n== ${label}: ${r.heard} messages, ${r.positions} position reports, ${v.length} ships with a position`);
  console.log('ships per 0.1° of latitude (south to north):', JSON.stringify(Object.fromEntries(Object.entries(latitudeBands(v)).sort())));
  for (const x of v.sort((a, b) => a.lngLat[1] - b.lngLat[1])) console.log(`  ${x.mmsi} ${x.name || '(no name yet)'} ${shipClass(x.type)} ${x.lngLat[1].toFixed(3)},${x.lngLat[0].toFixed(3)} ${x.sogKt} kt`);
};
await run('COAST BOX (Gandoca to Limón)', AIS_BOX, Math.round(minutes * 30));
await run('WIDE BOX (Bocas del Toro to Nicaragua border region)', WIDE, Math.round(minutes * 30));
