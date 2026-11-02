/**
 * Satellite sea surface temperature and ocean colour (PLAN 2.4), from NOAA CoastWatch ERDDAP.
 * ERDDAP sends no CORS headers, so the data build relays the last week of daily maps as packed
 * series (kind 'observed') for src/adapters/satellite.ts. Datasets and why: docs/OBSERVATIONS.md.
 *
 *  - `sst`, `sst-coast`: MUR SST v4.1 (JPL), a gap-free daily analysis at 0.01°, about 2 days
 *    late. 0.05° over the macro view, full 0.01° over Gandoca–Limón.
 *  - `chl`: chlorophyll-a, gap-filled (DINEOF) VIIRS NOAA-20/S-NPP, 9 km, about 3 days late.
 *  - `kd490`: diffuse attenuation at 490 nm, gap-filled VIIRS + OLCI, 2 km over the coast,
 *    science quality so about 10 days late. Clarity (PLAN 6.1) builds on it.
 *
 * Gap-filled products are used because cloud hides this coast most afternoons; the raw passes
 * with their holes come with PLAN 2.12.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REGION, SARG_BOX, SCAT_BOX } from '../../src/region.ts';
import type { GridGeom, SourceSpan } from '../../src/adapters/pack.ts';
import { erddapToGrid, type ErddapGrid } from '../../src/adapters/erddap-parse.ts';
import { scatFrames, type ScatJson } from '../../src/adapters/scat-parse.ts';
import { aggregateCover, detectSargassum, SARG } from '../../src/adapters/sargassum-parse.ts';
import { depthGrid, get, seaMask, writeSeries } from './common.ts';

const PFEG = 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/';
const CW = 'https://coastwatch.noaa.gov/erddap/griddap/';
/** The coastal nest, the same box as the currents nest. [[w, s], [e, n]] */
export const COAST_BOX: [[number, number], [number, number]] = [[-83.5, 9.3], [-82.25, 10.3]];
const DAYS = 7;
const LICENCE = 'NOAA CoastWatch ERDDAP, public domain; credit NOAA/NESDIS, NASA JPL (MUR)';

/** griddap query for the last `DAYS` time steps over a box. `latDesc`: the dataset stores latitude north to south. */
function query(server: string, id: string, v: string, box: [[number, number], [number, number]], stride: number, opts: { altitude?: boolean; latDesc?: boolean }) {
  const [[w, s], [e, n]] = box;
  const lat = opts.latDesc ? `[(${n}):${stride}:(${s})]` : `[(${s}):${stride}:(${n})]`;
  const sel = `${v}[last-${DAYS - 1}:1:last]${opts.altitude ? '[0]' : ''}${lat}[(${w}):${stride}:(${e})]`;
  return `${server}${id}.json?${encodeURI(sel).replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`;
}

async function fetchGrid(url: string, min: number, max: number): Promise<ErddapGrid> {
  const body = (await (await get(url, {}, 4)).json()) as { table: { columnNames: string[]; rows: unknown[][] } };
  return erddapToGrid(body.table, min, max);
}

const span = (id: string, name: string, times: number[]): SourceSpan[] => [{ id, name, fromMs: times[0], toMs: times[times.length - 1] }];
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const kb = (b: number) => `${Math.round(b / 1024)} KB`;

export async function buildSst(dir: string): Promise<string> {
  const fetchedAt = new Date().toISOString();
  const out: string[] = [];
  for (const [feed, box, stride] of [['sst', REGION.maxBounds, 5], ['sst-coast', COAST_BOX, 1]] as const) {
    const g = await fetchGrid(query(PFEG, 'jplMURSST41', 'analysed_sst', box, stride, {}), -2, 40);
    const size = writeSeries(dir, {
      feed, kind: 'observed', fetchedAt, grid: g.grid, times: g.times,
      vars: [{ name: 'sst', unit: '°C', scale: 0.01, offset: 0 }],
      sources: span('jplMURSST41', 'MUR SST v4.1 (JPL), daily analysis', g.times), licence: LICENCE,
    }, { sst: g.frames });
    out.push(`${feed} ${g.grid.cols}×${g.grid.rows}, ${day(g.times[0])}..${day(g.times[g.times.length - 1])}, ${kb(size)}`);
  }
  return `sst: ${out.join('; ')}`;
}

export async function buildChl(dir: string): Promise<string> {
  const id = 'noaacwNPPN20VIIRSDINEOFDaily';
  const g = await fetchGrid(query(CW, id, 'chlor_a', REGION.maxBounds, 1, { altitude: true, latDesc: true }), 0.001, 100);
  const size = writeSeries(dir, {
    feed: 'chl', kind: 'observed', fetchedAt: new Date().toISOString(), grid: g.grid, times: g.times,
    // Linear at 0.002 mg/m³ keeps the clear-water values (0.05 to 0.2) distinct and reaches 65 in river plumes.
    vars: [{ name: 'chl', unit: 'mg/m³', scale: 0.002, offset: 0 }],
    sources: span(id, 'VIIRS chlorophyll-a, gap-filled (DINEOF), NRT 9 km', g.times), licence: LICENCE,
  }, { chl: g.frames });
  return `chl: ${g.grid.cols}×${g.grid.rows}, ${day(g.times[0])}..${day(g.times[g.times.length - 1])}, ${kb(size)}`;
}

export async function buildKd490(dir: string): Promise<string> {
  const id = 'noaacwNPPN20S3AkdSCIDINEOF2kmDaily';
  // valid_max is 6 m⁻¹; the files also carry +6.5534 where the fill should be.
  const g = await fetchGrid(query(CW, id, 'kd_490', COAST_BOX, 1, { altitude: true, latDesc: true }), 0.01, 6);
  const size = writeSeries(dir, {
    feed: 'kd490', kind: 'observed', fetchedAt: new Date().toISOString(), grid: g.grid, times: g.times,
    vars: [{ name: 'kd490', unit: '1/m', scale: 0.0002, offset: 0 }],
    sources: span(id, 'VIIRS + OLCI Kd490, gap-filled (DINEOF), science quality 2 km', g.times), licence: LICENCE,
  }, { kd490: g.frames });
  return `kd490: ${g.grid.cols}×${g.grid.rows}, ${day(g.times[0])}..${day(g.times[g.times.length - 1])}, ${kb(size)}`;
}

/**
 * Raw satellite passes (PLAN 2.12), not gap-filled, so cloud shows as holes. Gandoca–Limón only.
 *  - `sst-pass`: NOAA ACSPO super-collated L3S SST, 0.02°, the afternoon (PM day, ~19 UTC) and
 *    night (PM night, ~07 UTC) passes of the last 4 days. Each frame is stamped with its real pass
 *    time from the per-pixel `sst_dtime`.
 *  - `chl-pass`: NOAA-20 VIIRS chlorophyll, NRT 4 km, last 7 days, stamped at NOAA-20's nominal
 *    13:25 local solar overpass (about 18:57 UTC here; ERDDAP stamps the day at 12:00).
 */
const PASS_DAYS = 4;
/** NOAA-20 crosses the equator northbound at 13:25 local solar time; at 82.9° W that is 18:57 UTC. */
export const NOAA20_PASS_OFFSET_MS = (18 * 60 + 57 - 12 * 60) * 60e3;

/** Sea cells of a pass grid from the GEBCO macro grid (cells deeper than 2 m), so cloud can be told from land. */
const seaCount = (g: GridGeom) => seaMask(g, 0).reduce((a, b) => a + b, 0);

function passQuery(id: string, vars: string[], days: number, opts: { altitude?: boolean } = {}) {
  const [[w, s], [e, n]] = COAST_BOX;
  const sel = vars.map((v) => `${v}[last-${days - 1}:1:last]${opts.altitude ? '[0]' : ''}[(${n}):1:(${s})][(${w}):1:(${e})]`).join(',');
  return `${CW}${id}.json?${sel.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`;
}

export async function buildSstPass(dir: string): Promise<string> {
  const ids = ['noaacwLEOACSPOSSTL3SnrtPMDay', 'noaacwLEOACSPOSSTL3SnrtPMNight'];
  const parts: ErddapGrid[] = [];
  for (const id of ids) {
    const body = (await (await get(passQuery(id, ['sea_surface_temperature', 'sst_dtime'], PASS_DAYS), {}, 4)).json()) as { table: { columnNames: string[]; rows: unknown[][] } };
    parts.push(erddapToGrid(body.table, -2, 40, { value: 'sea_surface_temperature', dtime: 'sst_dtime' }));
  }
  const grid = parts[0].grid;
  if (parts.some((p) => p.grid.cols !== grid.cols || p.grid.rows !== grid.rows)) throw new Error('sst-pass: day and night grids differ');
  const passes = parts.flatMap((p, k) => p.frames.map((f, i) => ({ f, ms: p.passMs[i], id: ids[k] }))).sort((a, b) => a.ms - b.ms);
  const size = writeSeries(dir, {
    feed: 'sst-pass', kind: 'observed', fetchedAt: new Date().toISOString(), grid, times: passes.map((p) => p.ms), seaCells: seaCount(grid),
    vars: [{ name: 'sst', unit: '°C', scale: 0.01, offset: 0 }],
    sources: passes.map((p) => ({ id: p.id, name: p.id.endsWith('Day') ? 'ACSPO L3S SST, afternoon pass' : 'ACSPO L3S SST, night pass', fromMs: p.ms, toMs: p.ms })),
    licence: LICENCE,
  }, { sst: passes.map((p) => p.f) });
  const clear = passes.map((p) => p.f.filter(Number.isFinite).length);
  return `sst-pass: ${grid.cols}×${grid.rows}, ${passes.length} passes, clear cells ${clear.join('/')}, ${kb(size)}`;
}

export async function buildChlPass(dir: string): Promise<string> {
  const id = 'noaacwN20VIIRSchlaDaily';
  const body = (await (await get(passQuery(id, ['chlor_a'], DAYS, { altitude: true }), {}, 4)).json()) as { table: { columnNames: string[]; rows: unknown[][] } };
  const g = erddapToGrid(body.table, 0.001, 100);
  const times = g.times.map((t) => t + NOAA20_PASS_OFFSET_MS);
  const size = writeSeries(dir, {
    feed: 'chl-pass', kind: 'observed', fetchedAt: new Date().toISOString(), grid: g.grid, times, seaCells: seaCount(g.grid),
    vars: [{ name: 'chl', unit: 'mg/m³', scale: 0.002, offset: 0 }],
    sources: span(id, 'NOAA-20 VIIRS chlorophyll-a, NRT 4 km (nominal 13:25 local pass)', times), licence: LICENCE,
  }, { chl: g.frames });
  return `chl-pass: ${g.grid.cols}×${g.grid.rows}, ${times.length} passes, clear cells ${g.frames.map((f) => f.filter(Number.isFinite).length).join('/')}, ${kb(size)}`;
}

/**
 * Scatterometer wind passes (PLAN 2.14): ASCAT on Metop-B and Metop-C from Copernicus Marine
 * (WIND_GLO_PHY_L3_NRT_012_002, 0.125°), over SCAT_BOX, last 4 days, each frame stamped with its
 * median measurement time. The toolbox is Python, so scripts/scat.py fetches and this packs. It needs
 * COPERNICUSMARINE_USERNAME and COPERNICUSMARINE_PASSWORD (Actions secrets) and `pip install
 * copernicusmarine`; without them the feed fails and the previous files are kept.
 */
export async function buildScatPass(dir: string): Promise<string> {
  if (!process.env.COPERNICUSMARINE_USERNAME || !process.env.COPERNICUSMARINE_PASSWORD) throw new Error('no Copernicus Marine login (COPERNICUSMARINE_USERNAME, COPERNICUSMARINE_PASSWORD)');
  const tmp = mkdtempSync(join(tmpdir(), 'scat-'));
  try {
    const out = join(tmp, 'scat.json');
    const [[w, s], [e, n]] = SCAT_BOX;
    const r = spawnSync('python3', ['-I', 'scripts/scat.py', `--box=${w},${s},${e},${n}`, '--days', String(PASS_DAYS), '--out', out], { encoding: 'utf8', timeout: 10 * 60e3 });
    if (r.status !== 0) throw new Error(`scat.py ${r.error ? r.error.message : `exit ${r.status}`}: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ').slice(0, 400)}`);
    if (r.stderr.trim()) console.warn(r.stderr.trim());
    const f = scatFrames(JSON.parse(readFileSync(out, 'utf8')) as ScatJson);
    const size = writeSeries(dir, {
      feed: 'scat-pass', kind: 'observed', fetchedAt: new Date().toISOString(), grid: f.grid, times: f.times, seaCells: seaCount(f.grid),
      vars: [{ name: 'u', unit: 'm/s', scale: 0.01, offset: 0 }, { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 }],
      sources: f.sources,
      licence: 'E.U. Copernicus Marine Service Information (WIND_GLO_PHY_L3_NRT_012_002); EUMETSAT OSI SAF / KNMI ASCAT',
    }, { u: f.u, v: f.v });
    return `scat-pass: ${f.grid.cols}×${f.grid.rows}, ${f.times.length} passes, cells ${f.u.map((x) => x.filter(Number.isFinite).length).join('/')}, ${kb(size)}`;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Sargassum detections (PLAN 7.1): the USF Alternative Floating Algae Index, daily, from NOAA AOML's
 * OceanWatch ERDDAP (noaa_aoml_atlantic_oceanwatch_AFAI_1D, 0.015°), last 7 days over SARG_BOX.
 * Each day is flagged pixel by pixel (src/adapters/sargassum-parse.ts) and published as the share of
 * the sea surface covered by weed per 0.06° cell (mean ΔAFAI / AFAI_FULL over the judged pixels),
 * NaN where cloud, land or the coast hid it (unknown, not clear).
 * ERDDAP stamps each day at 12:00 UTC; the passes behind it are from the afternoon before that night.
 */
export async function buildSargassum(dir: string): Promise<string> {
  const id = 'noaa_aoml_atlantic_oceanwatch_AFAI_1D';
  const [[w, s], [e, n]] = SARG_BOX;
  const sel = `AFAI[last-6:1:last][(${s}):1:(${n})][(${w}):1:(${e})]`;
  const url = `https://cwcgom.aoml.noaa.gov/erddap/griddap/${id}.json?${sel.replace(/\[/g, '%5B').replace(/\]/g, '%5D')}`;
  const body = (await (await get(url, {}, 4)).json()) as { table: { columnNames: string[]; rows: unknown[][] } };
  // AFAI is clipped to -0.002..0.004 in this product; NaN is cloud.
  const g = erddapToGrid(body.table, -0.01, 0.01);
  const depth = depthGrid(g.grid);
  const agg = g.frames.map((f) => {
    const frac = new Float32Array(f.length);
    const codes = detectSargassum(f, depth, g.grid.cols, g.grid.rows, SARG, frac);
    return aggregateCover(codes, g.grid.cols, g.grid.rows, SARG.aggregate, SARG.minValid, frac);
  });
  const f = SARG.aggregate;
  const grid = { cols: agg[0].cols, rows: agg[0].rows, lon0: g.grid.lon0 + ((f - 1) / 2) * g.grid.dlon, lat0: g.grid.lat0 - ((f - 1) / 2) * g.grid.dlat, dlon: f * g.grid.dlon, dlat: f * g.grid.dlat };
  const size = writeSeries(dir, {
    feed: 'sargassum', kind: 'observed', fetchedAt: new Date().toISOString(), grid, times: g.times, seaCells: seaCount(grid),
    // Mat cover is small (a 1 km pixel flagged at the cut is ~4% weed), so store it finely.
    vars: [{ name: 'cover', unit: '1', scale: 0.00002, offset: 0 }],
    sources: span(id, 'USF AFAI (Hu, USF) via NOAA AOML OceanWatch, daily 1 km; detection here', g.times),
    licence: 'USF Optical Oceanography Lab AFAI via NOAA AOML OceanWatch ERDDAP, free use and redistribution',
  }, { cover: agg.map((a) => a.cover) });
  const stat = agg.map((a) => {
    let seen = 0, hit = 0;
    for (const x of a.cover) if (Number.isFinite(x)) (seen++, x > 0 && hit++);
    return `${hit}/${seen}`;
  });
  return `sargassum: ${grid.cols}×${grid.rows}, ${day(g.times[0])}..${day(g.times[g.times.length - 1])}, cells with mats/seen ${stat.join(' ')}, ${kb(size)}`;
}
