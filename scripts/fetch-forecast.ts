/**
 * The forecast data build (docs/DATA.md): fetches each model grid once and publishes packed
 * series in public/data/forecast/ for the app to load. Run by the Pages workflow on a
 * schedule and on every deploy; run it locally to get real data in `npm run dev`.
 *
 *   npm run data:forecast            # all feeds
 *   npm run data:forecast -- wind    # just one
 *   npm run data:forecast -- --force # refetch even if the published copy is recent
 *
 * If a feed fails and FALLBACK_URL is set (the live site's data/forecast/ URL), the
 * previously published files are copied back, so a bad run shows older data with an amber
 * DATA AGE instead of none. Needs Node 22.18+. No dependencies.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { get } from './forecast/common.ts';
import { buildWind } from './forecast/wind.ts';
import { buildWaves } from './forecast/waves.ts';
import { buildStorms } from './forecast/storms.ts';
import { buildCurrents } from './forecast/currents.ts';
import { buildMetar } from './forecast/metar.ts';
import { buildEffort } from './forecast/effort.ts';
import { buildCoral } from './forecast/coral.ts';
import { buildChl, buildChlPass, buildKd490, buildMld, buildSargassum, buildScatPass, buildSst, buildSstPass } from './forecast/satellite.ts';

const OUT = 'public/data/forecast';
/**
 * `refreshH`: how often the source's model actually updates. The workflow runs every 6 h, and
 * a feed whose published copy is younger than this is copied forward instead of refetched,
 * which keeps the build well under Open-Meteo's daily call limit (docs/DATA.md).
 */
/** `stale`: also refetch a published copy younger than refreshH when this says its content is unusable. */
const FEEDS: Record<string, { build: (dir: string) => Promise<string>; refreshH: number; series?: string[]; stale?: (prev: { sources?: { name?: string }[] }) => boolean }> = {
  wind: { build: buildWind, refreshH: 6 },
  waves: { build: buildWaves, refreshH: 12 },
  // NHC advisories come every 6 h in season and it sends no CORS headers, so the build relays them.
  storms: { build: buildStorms, refreshH: 3 },
  currents: { build: buildCurrents, refreshH: 12, series: ['currents', 'currents-coast'] },
  // Limón airport METAR, hourly while the airport is open; no CORS, so relayed.
  metar: { build: buildMetar, refreshH: 0.5 },
  // CoastWatch ERDDAP satellite maps (no CORS, so relayed). Daily products, a few days late.
  sst: { build: buildSst, refreshH: 12, series: ['sst', 'sst-coast'] },
  chl: { build: buildChl, refreshH: 12 },
  kd490: { build: buildKd490, refreshH: 24 },
  // Raw passes with their cloud holes (PLAN 2.12): two SST passes a day, one chlorophyll pass.
  'sst-pass': { build: buildSstPass, refreshH: 6 },
  'chl-pass': { build: buildChlPass, refreshH: 12 },
  // ASCAT wind passes (PLAN 2.14), Copernicus Marine; needs the account secrets and the Python toolbox.
  'scat-pass': { build: buildScatPass, refreshH: 6 },
  // Mixed-layer depth (PLAN 7.18), Copernicus Marine global model, daily; same account and toolbox.
  mld: { build: buildMld, refreshH: 24 },
  // Fishing effort (PLAN 7.19), Global Fishing Watch, last year; needs the GFW_TOKEN secret. Slow-moving, so daily.
  // An empty copy (no fishing found, or an unread response) is retried every run rather than kept for a day.
  effort: { build: buildEffort, refreshH: 24, stale: (prev) => !/ [1-9]\d* cells with fishing/.test(prev.sources?.[0]?.name ?? '') },
  // Sargassum detections from the daily USF AFAI map (PLAN 7.1), NOAA AOML ERDDAP (no CORS, so relayed).
  sargassum: { build: buildSargassum, refreshH: 12 },
  // Coral bleaching heat stress (PLAN 7.23), NOAA Coral Reef Watch daily 5 km via CoastWatch ERDDAP (no CORS, so relayed).
  coral: { build: buildCoral, refreshH: 12 },
};

const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = wanted.length ? wanted : Object.keys(FEEDS);
const fallback = process.env.FALLBACK_URL;
mkdirSync(OUT, { recursive: true });

/** Copy the live site's published files for a feed's series into OUT. Returns the oldest fetchedAt. */
async function keepPrevious(name: string): Promise<string> {
  let oldest = '';
  for (const series of FEEDS[name].series ?? [name]) {
    const meta = await (await get(`${fallback}${series}.json`, {}, 2)).json();
    writeFileSync(`${OUT}/${series}.json`, JSON.stringify(meta));
    // Packed grids have a binary beside the manifest; plain JSON feeds (storms) do not.
    if (meta.file) writeFileSync(`${OUT}/${meta.file}`, new Uint8Array(await (await get(`${fallback}${meta.file}`, {}, 2)).arrayBuffer()));
    if (!oldest || meta.fetchedAt < oldest) oldest = meta.fetchedAt;
  }
  return oldest;
}

const force = process.argv.includes('--force');
let failed = 0;
for (const name of names) {
  const feed = FEEDS[name];
  if (!feed) throw new Error(`unknown feed ${name}; have ${Object.keys(FEEDS).join(', ')}`);
  console.log(`${name}…`);
  if (fallback && !force) {
    try {
      const prev = await (await get(`${fallback}${name}.json`, {}, 1)).json();
      const ageH = (Date.now() - Date.parse(prev.fetchedAt)) / 3.6e6;
      if (ageH < feed.refreshH - 0.5 && !feed.stale?.(prev)) {
        console.log(`${name}: published copy is ${ageH.toFixed(1)} h old, under ${feed.refreshH} h; kept ${await keepPrevious(name)}`);
        continue;
      }
    } catch {
      // Nothing published yet: build it.
    }
  }
  try {
    console.log(await feed.build(OUT));
  } catch (err) {
    failed++;
    console.error(`${name} FAILED: ${err instanceof Error ? err.message : err}`);
    if (!fallback) continue;
    try {
      console.log(`${name}: kept the previous files, fetched ${await keepPrevious(name)}`);
    } catch (e) {
      console.error(`${name}: no previous files either (${e instanceof Error ? e.message : e})`);
    }
  }
}
// A failed feed must not block the deploy (the app falls back); the verify tool reports it.
if (failed) console.warn(`${failed} feed(s) failed`);
