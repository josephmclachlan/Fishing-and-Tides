/**
 * Clear-water Kd490 baseline (PLAN 7.45, 7.47): each 4 km pixel's 20th percentile (`kd490`, the clear
 * state) and median (`kd490Med`, the usual state) of daily Kd490 per calendar month over the whole
 * Copernicus GlobColour multi-year record (OCEANCOLOUR_GLO_BGC_L4_MY_009_104, 1997 on). Same
 * algorithm and grid as the `kd490-nrt` feed the clarity model reads, so a fresh map and its baseline
 * agree on what clear water looks like. Writes public/data/climatology/kd490-clim.json + .i16.gz
 * (committed, precached). Re-run once a year:
 *
 *   COPERNICUSMARINE_USERNAME=… COPERNICUSMARINE_PASSWORD=… npm run data:kd490-clim
 *
 * scripts/oc.py --clim reads the record (about 10,700 days, a few minutes). KD_CLIM_JSON=path packs a
 * file it wrote earlier instead of fetching again.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ocFrames, type OcJson } from '../src/adapters/oc-parse.ts';
import { CLEAR_QUANTILE, monthlyQuantile } from '../src/physics/clarity-baseline.ts';
import { COAST_BOX, OC_LICENCE } from './forecast/satellite.ts';
import { writeSeries } from './forecast/common.ts';

function fetchRecord(): OcJson {
  const tmp = mkdtempSync(join(tmpdir(), 'oc-clim-'));
  try {
    const out = join(tmp, 'clim.json');
    const [[w, s], [e, n]] = COAST_BOX;
    const r = spawnSync('python3', ['-I', 'scripts/oc.py', `--box=${w},${s},${e},${n}`, '--clim', '--out', out], { encoding: 'utf8', timeout: 60 * 60e3, stdio: ['ignore', 'inherit', 'pipe'] });
    if (r.status !== 0) throw new Error(`oc.py ${r.error ? r.error.message : `exit ${r.status}`}: ${(r.stderr || '').trim().split('\n').slice(-3).join(' | ').slice(0, 400)}`);
    return JSON.parse(readFileSync(out, 'utf8')) as OcJson;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const src = process.env.KD_CLIM_JSON;
const f = ocFrames(src ? (JSON.parse(readFileSync(src, 'utf8')) as OcJson) : fetchRecord());
const clim = monthlyQuantile(f.times, f.kd490, CLEAR_QUANTILE);
const med = monthlyQuantile(f.times, f.kd490, 0.5);
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const from = day(f.times[0]), to = day(f.times[f.times.length - 1]);
const bytes = writeSeries('public/data/climatology', {
  feed: 'kd490-clim', kind: 'climatology', fetchedAt: new Date().toISOString(), grid: f.grid,
  times: [...Array(12)].map((_, m) => Date.UTC(2000, m, 15, 12)),
  vars: [{ name: 'kd490', unit: '1/m', scale: 0.0002, offset: 0 }, { name: 'kd490Med', unit: '1/m', scale: 0.0002, offset: 0 }],
  sources: [{ id: f.sources[0].id, name: `${f.sources[0].name}: ${CLEAR_QUANTILE * 100}th percentile and median per calendar month, ${f.times.length} days ${from}..${to}`, fromMs: f.times[0], toMs: f.times[f.times.length - 1] }],
  licence: OC_LICENCE,
}, { kd490: clim, kd490Med: med });
console.log(`kd490-clim: ${f.grid.cols}×${f.grid.rows}, ${f.times.length} days ${from}..${to}, ${Math.round(bytes / 1024)} KB`);
