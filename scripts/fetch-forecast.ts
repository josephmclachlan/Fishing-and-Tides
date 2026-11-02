/**
 * The forecast data build (docs/DATA.md): fetches each model grid once and publishes packed
 * series in public/data/forecast/ for the app to load. Run by the Pages workflow on a
 * schedule and on every deploy; run it locally to get real data in `npm run dev`.
 *
 *   npm run data:forecast            # all feeds
 *   npm run data:forecast -- wind    # just one
 *
 * If a feed fails and FALLBACK_URL is set (the live site's data/forecast/ URL), the
 * previously published files are copied back, so a bad run shows older data with an amber
 * DATA AGE instead of none. Needs Node 22.18+. No dependencies.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { get } from './forecast/common.ts';
import { buildWind } from './forecast/wind.ts';

const OUT = 'public/data/forecast';
const FEEDS: Record<string, (dir: string) => Promise<string>> = { wind: buildWind };

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = wanted.length ? wanted : Object.keys(FEEDS);
const fallback = process.env.FALLBACK_URL;
mkdirSync(OUT, { recursive: true });

let failed = 0;
for (const name of names) {
  const build = FEEDS[name];
  if (!build) throw new Error(`unknown feed ${name}; have ${Object.keys(FEEDS).join(', ')}`);
  console.log(`${name}…`);
  try {
    console.log(await build(OUT));
  } catch (err) {
    failed++;
    console.error(`${name} FAILED: ${err instanceof Error ? err.message : err}`);
    if (!fallback) continue;
    try {
      const meta = await (await get(`${fallback}${name}.json`, {}, 2)).json();
      const bin = await (await get(`${fallback}${meta.file}`, {}, 2)).arrayBuffer();
      writeFileSync(`${OUT}/${name}.json`, JSON.stringify(meta));
      writeFileSync(`${OUT}/${meta.file}`, new Uint8Array(bin));
      console.log(`${name}: kept the previous files, fetched ${meta.fetchedAt}`);
    } catch (e) {
      console.error(`${name}: no previous files either (${e instanceof Error ? e.message : e})`);
    }
  }
}
// A failed feed must not block the deploy (the app falls back); the verify tool reports it.
if (failed) console.warn(`${failed} feed(s) failed`);
