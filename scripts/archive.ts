/**
 * Daily history archive (PLAN 8.1, docs/HISTORY.md). Run after `npm run data:forecast`: reads the
 * feeds it just wrote in public/data/forecast/, samples them at the named spots, adds the Limón
 * tide gauge and (every 6 h) each weather model at the Limón airport, and appends the rows to
 * one CSV per UTC day under $HISTORY_DIR (default `history/`). The Pages workflow commits that
 * folder to the `history` branch. Public data only: nothing from anyone's phone goes here.
 *
 *   npm run data:archive               # needs public/data/forecast from data:forecast
 *   npm run data:archive -- --models   # also fetch the per-model weather whatever the hour
 *
 * Node 22.18+, no dependencies. A feed that is missing or fails is logged and skipped.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { decodeSeries, type GridSeries, type SeriesMeta } from '../src/adapters/pack.ts';
import { scalarAt } from '../src/adapters/frames.ts';
import { predict } from '../src/physics/tide.ts';
import { LIMON_HARMONICS } from '../src/data/tides-limon.ts';
import { LIVE_GAUGE, METAR_STATION, SPOTS } from '../src/region.ts';
import {
  byDay, forecastTimes, gaugeRows, mergeDay, metarRows, modelRows, parseIocRows, sampleRows, sargassumRows, stormRows,
  type Row, type Site,
} from '../src/history/archive.ts';
import { imergDaily, type RainImerg } from '../src/adapters/imerg-parse.ts';

const IN = 'public/data/forecast';
const OUT = process.env.HISTORY_DIR ?? 'history';
const UA = 'fishing-and-tides history archive (github.com/josephmclachlan/Fishing-and-Tides)';
const now = Date.now();
const sites: Site[] = SPOTS;
const rows: Row[] = [];
const log: string[] = [];

function load(feed: string): GridSeries {
  const meta = JSON.parse(readFileSync(`${IN}/${feed}.json`, 'utf8')) as SeriesMeta;
  let buf = readFileSync(`${IN}/${meta.file}`);
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  return decodeSeries(meta, new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2));
}

function step(name: string, fn: () => Row[] | Promise<Row[]>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then((r) => {
      rows.push(...r);
      log.push(`${name}: ${r.length} rows`);
    })
    .catch((e) => log.push(`${name}: SKIPPED (${e instanceof Error ? e.message : e})`));
}

/** A forecast feed at the spots: the first 24 h of the run, 3-hourly. */
const forecast = (feed: string, vars: string[], source = feed, stepH = 3) => () => {
  const s = load(feed);
  const issued = Date.parse(s.meta.runAt ?? s.meta.fetchedAt);
  return sampleRows((v, x, y, t) => scalarAt(s, v, x, y, t), { sites, times: forecastTimes(s.meta.times, issued, 24, stepH), vars, source, issued });
};
/** An observed map feed at the spots: every map in the file (already-saved days are skipped on merge). */
const observed = (feed: string, vars: string[]) => () => {
  const s = load(feed);
  return sampleRows((v, x, y, t) => scalarAt(s, v, x, y, t), { sites, times: s.meta.times, vars, source: feed });
};

async function get(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 120)}`);
  return res.json();
}

// Ocean and weather grids. Directions are unit vectors (du/dv, u/v) so they average across north.
await step('wind', forecast('wind', ['u', 'v']));
await step('waves', forecast('waves', ['hs', 'tm', 'du', 'dv', 'swh', 'swt', 'swu', 'swv', 'wwh', 'wwt', 's2h', 's2t']));
await step('currents', () => {
  // The 1/12° coastal nest where it has sea, else the regional grid.
  const fine = load('currents-coast');
  const coarse = load('currents');
  const issued = Date.parse(fine.meta.runAt ?? fine.meta.fetchedAt);
  const at = (v: string, x: number, y: number, t: number) => {
    const a = scalarAt(fine, v, x, y, t);
    return Number.isFinite(a) ? a : scalarAt(coarse, v, x, y, t);
  };
  return sampleRows(at, { sites, times: forecastTimes(fine.meta.times, issued), vars: ['u', 'v'], source: 'currents', issued });
});
// Daily means stamped at midnight, so every hour in the window, not every third.
await step('mld', forecast('mld', ['mld'], 'mld', 1));
await step('sst', () => {
  const fine = load('sst-coast');
  const coarse = load('sst');
  const at = (v: string, x: number, y: number, t: number) => {
    const a = scalarAt(fine, v, x, y, t);
    return Number.isFinite(a) ? a : scalarAt(coarse, v, x, y, t);
  };
  return sampleRows(at, { sites, times: fine.meta.times, vars: ['sst'], source: 'sst' });
});
await step('chl', observed('chl', ['chl']));
await step('kd490', observed('kd490', ['kd490']));
await step('sargassum', () => {
  const s = load('sargassum');
  return s.meta.times.flatMap((t, i) => sargassumRows(t, s.values.cover[i], s.meta.grid));
});

// Relayed stations and advisories.
await step('metar', () => {
  const m = JSON.parse(readFileSync(`${IN}/metar.json`, 'utf8'));
  return metarRows(m.station, m.obs);
});
await step('storms', () => stormRows(JSON.parse(readFileSync(`${IN}/storms.json`, 'utf8')).storms));
// Satellite rain over each river's catchment (PLAN 7.51), per finished UTC day, stamped at the day's start.
await step('imerg', () => {
  const f = JSON.parse(readFileSync(`${IN}/rain-imerg.json`, 'utf8')) as RainImerg;
  return imergDaily(f, now).flatMap((d) => [
    { t: d.day, site: d.river, source: 'imerg', model: '', v: 'rainMm', value: d.mm },
    { t: d.day, site: d.river, source: 'imerg', model: '', v: 'halfHours', value: d.halfHours },
  ]);
});

// The tide gauge isn't relayed (the phone reads IOC directly), so fetch the last 90 minutes here.
await step('gauge', async () => {
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 16);
  const url = `https://www.ioc-sealevelmonitoring.org/service.php?query=data&code=${LIVE_GAUGE.code}&timestart=${iso(now - 90 * 60e3)}&timestop=${iso(now)}&format=json`;
  return gaugeRows(LIVE_GAUGE.code, parseIocRows(await get(url), LIVE_GAUGE.sensor, LIVE_GAUGE.mslOnSensorM), (t) => predict(LIMON_HARMONICS, t));
});

// Each weather model at the airport, next 24 h, four times a day (one Open-Meteo call each),
// for the model scoring and bias correction in PLAN 7.4 / 7.10.
const MODELS = ['gfs_seamless', 'ecmwf_ifs025', 'icon_seamless'];
const MODEL_VARS = ['temperature_2m', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'pressure_msl'];
if (process.argv.includes('--models') || new Date(now).getUTCHours() % 6 === 0) {
  await step('models', async () => {
    const [x, y] = METAR_STATION.lngLat;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${y}&longitude=${x}&hourly=${MODEL_VARS.join(',')}&models=${MODELS.join(',')}&forecast_days=2&timeformat=unixtime&timezone=GMT&wind_speed_unit=kn`;
    return modelRows(await get(url), METAR_STATION.icao, MODELS, MODEL_VARS, now);
  });
}

let added = 0;
for (const [day, dayRows] of byDay(rows)) {
  const dir = `${OUT}/data/${day.slice(0, 4)}`;
  const file = `${dir}/${day}.csv`;
  const r = mergeDay(existsSync(file) ? readFileSync(file, 'utf8') : undefined, dayRows);
  if (!r.added) continue;
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, r.text);
  added += r.added;
  log.push(`  ${file}: +${r.added}`);
}
// The format notes travel with the data.
mkdirSync(OUT, { recursive: true });
copyFileSync('docs/HISTORY.md', `${OUT}/README.md`);
console.log(log.join('\n'));
console.log(`history: ${added} new rows`);
