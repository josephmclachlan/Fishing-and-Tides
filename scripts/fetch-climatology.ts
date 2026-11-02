/**
 * Builds the OUTLOOK band's climatology (docs/DATA.md): monthly means for each calendar month,
 * stored as 12 frames stamped mid-month in the year 2000 (the app re-stamps them onto the
 * current year). Static and small, committed in public/data/climatology/ and precached, so
 * the 16 to 30 day view works offline. Re-run rarely (it only shifts as the years roll).
 *
 *   npm run data:climatology
 *
 * Wind: NOAA NCEI Blended Sea Surface Winds v2 monthly, 0.25°, 2015 to 2024 (scatterometer
 * passes blended with reanalysis), via CoastWatch ERDDAP, one request per year.
 * Waves: ERA5 ocean waves (0.5°) via Open-Meteo Marine, total Hs, mean period and direction
 * (ERA5 has no swell partitions there). To stay inside Open-Meteo's call limits it samples
 * days 8 to 21 of every month of 2020 to 2024 on a 1° grid at sea points.
 *
 *   npm run data:climatology -- wind   # or waves; default both
 * Needs Node 22.18+. No dependencies.
 */
import type { SeriesMeta } from '../src/adapters/pack.ts';
import { REGION } from '../src/region.ts';
import { get, gridOver, gridPoints, openMeteoGrid, seaMask, sleep, unitFrom, writeSeries } from './forecast/common.ts';

const OUT = 'public/data/climatology';
const YEARS = [2015, 2024] as const;

async function windClimatology(): Promise<string> {
  const grid = gridOver(REGION.maxBounds, 0.25);
  const n = grid.cols * grid.rows;
  const [[w, s], [e, nn]] = REGION.maxBounds;
  const sum = { u: [...Array(12)].map(() => new Float64Array(n)), v: [...Array(12)].map(() => new Float64Array(n)) };
  const cnt = [...Array(12)].map(() => new Uint16Array(n));
  for (let y = YEARS[0]; y <= YEARS[1]; y++) {
    const sel = `[(${y}-01-01):1:(${y}-12-31)][(10.0)][(${s}):1:(${nn})][(${w + 360}):1:(${e + 360})]`;
    const url = `https://coastwatch.noaa.gov/erddap/griddap/noaacwBlendedWindsMonthly.csv?u_wind${encodeURIComponent(sel)},v_wind${encodeURIComponent(sel)}`;
    const csv = await (await get(url)).text();
    for (const line of csv.split('\n').slice(2)) {
      const [time, , lat, lon, u, v] = line.split(',');
      if (!time || u === 'NaN' || v === 'NaN') continue;
      const m = new Date(time).getUTCMonth();
      const c = Math.round((Number(lon) - 360 - grid.lon0) / grid.dlon);
      const r = Math.round((grid.lat0 - Number(lat)) / grid.dlat);
      if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) continue;
      const i = r * grid.cols + c;
      sum.u[m][i] += Number(u);
      sum.v[m][i] += Number(v);
      cnt[m][i]++;
    }
    console.log(`  ${y}`);
    await sleep(500);
  }
  const mean = (k: 'u' | 'v') => sum[k].map((f, m) => Float32Array.from(f, (x, i) => (cnt[m][i] ? x / cnt[m][i] : NaN)));
  const times = [...Array(12)].map((_, m) => Date.UTC(2000, m, 15, 12));
  const meta: Omit<SeriesMeta, 'file'> = {
    feed: 'wind-clim',
    kind: 'climatology',
    fetchedAt: new Date().toISOString(),
    grid,
    times,
    vars: [
      { name: 'u', unit: 'm/s', scale: 0.01, offset: 0 },
      { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 },
    ],
    sources: [{ id: 'ncei-blended-winds-v2', name: `NOAA NCEI Blended Sea Surface Winds v2, monthly means ${YEARS[0]}–${YEARS[1]}`, fromMs: Date.UTC(YEARS[0], 0, 1), toMs: Date.UTC(YEARS[1], 11, 31) }],
    licence: 'NOAA NCEI, public domain',
  };
  const bytes = writeSeries(OUT, meta, { u: mean('u'), v: mean('v') });
  return `wind-clim: ${grid.cols}×${grid.rows} × 12 months, ${(bytes / 1024).toFixed(0)} KB`;
}

async function wavesClimatology(): Promise<string> {
  const grid = gridOver(REGION.maxBounds, 1);
  const all = gridPoints(grid);
  const sea = seaMask(grid, 0.4);
  const cells = all.map((_, i) => i).filter((i) => sea[i]);
  const n = grid.cols * grid.rows;
  const names = ['hs', 'tm', 'du', 'dv'] as const;
  const sum = Object.fromEntries(names.map((k) => [k, [...Array(12)].map(() => new Float64Array(n))])) as Record<(typeof names)[number], Float64Array[]>;
  const cnt = [...Array(12)].map(() => new Uint32Array(n));
  for (let y = 2020; y <= 2024; y++)
    for (let m = 0; m < 12; m++) {
      const d = (day: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const om = await openMeteoGrid(
        'https://marine-api.open-meteo.com/v1/marine',
        `hourly=wave_height,wave_period,wave_direction&models=era5_ocean&start_date=${d(8)}&end_date=${d(21)}&cell_selection=sea`,
        cells.map((i) => all[i]),
        100,
        0,
      );
      om.forEach((p, j) => {
        const i = cells[j];
        p.hourly.wave_height.forEach((h, t) => {
          const tm = p.hourly.wave_period[t], dir = p.hourly.wave_direction[t];
          if (h == null || tm == null || dir == null) return;
          const [du, dv] = unitFrom(dir);
          sum.hs[m][i] += h; sum.tm[m][i] += tm; sum.du[m][i] += du; sum.dv[m][i] += dv;
          cnt[m][i]++;
        });
      });
      await sleep(4000);
    }
  const frames = Object.fromEntries(names.map((k) => [k, sum[k].map((f, m) => Float32Array.from(f, (x, i) => (cnt[m][i] ? x / cnt[m][i] : NaN)))]));
  const meta: Omit<SeriesMeta, 'file'> = {
    feed: 'waves-clim',
    kind: 'climatology',
    fetchedAt: new Date().toISOString(),
    grid,
    times: [...Array(12)].map((_, m) => Date.UTC(2000, m, 15, 12)),
    vars: [
      { name: 'hs', unit: 'm', scale: 0.01, offset: 0 },
      { name: 'tm', unit: 's', scale: 0.01, offset: 0 },
      { name: 'du', unit: '1', scale: 0.0001, offset: 0 },
      { name: 'dv', unit: '1', scale: 0.0001, offset: 0 },
    ],
    sources: [{ id: 'era5-ocean', name: 'ECMWF ERA5 ocean waves via Open-Meteo, days 8–21 of each month 2020–2024', fromMs: Date.UTC(2020, 0, 1), toMs: Date.UTC(2024, 11, 31) }],
    licence: 'Copernicus Climate Change Service (ERA5), via Open-Meteo CC BY 4.0',
  };
  const bytes = writeSeries(OUT, meta, frames);
  return `waves-clim: ${cells.length} sea points on a 1° grid × 12 months, ${(bytes / 1024).toFixed(0)} KB`;
}

const BUILDS: Record<string, () => Promise<string>> = { wind: windClimatology, waves: wavesClimatology };
const which = process.argv.slice(2);
for (const name of which.length ? which : Object.keys(BUILDS)) console.log(await BUILDS[name]());
