/**
 * Wind feed (PLAN 2.3): Open-Meteo best-match 10 m wind (ICON, GFS and ECMWF, picked per
 * location and lead time by Open-Meteo), 16 days, on a 0.25° grid over the macro view.
 */
import type { SeriesMeta } from '../../src/adapters/pack.ts';
import { REGION } from '../../src/region.ts';
import { gridOver, gridPoints, keepIndices, openMeteoGrid, uvFrom, writeSeries } from './common.ts';

export const WIND_GRID_STEP = 0.25;

export async function buildWind(dir: string): Promise<string> {
  const grid = gridOver(REGION.maxBounds, WIND_GRID_STEP);
  const pts = gridPoints(grid);
  const fetchedAt = new Date().toISOString();
  const om = await openMeteoGrid(
    'https://api.open-meteo.com/v1/forecast',
    'hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&forecast_days=16&cell_selection=nearest',
    pts,
  );
  const allTimes = om[0].hourly.time.map((s) => s * 1000);
  const keep = keepIndices(allTimes);
  const n = grid.cols * grid.rows;
  const u = keep.map(() => new Float32Array(n).fill(NaN));
  const v = keep.map(() => new Float32Array(n).fill(NaN));
  let lastValid = 0;
  om.forEach((p, cell) => {
    const sp = p.hourly.wind_speed_10m;
    const dir = p.hourly.wind_direction_10m;
    keep.forEach((ti, k) => {
      const s = sp[ti], d = dir[ti];
      if (s == null || d == null) return;
      [u[k][cell], v[k][cell]] = uvFrom(s, d);
      lastValid = Math.max(lastValid, allTimes[ti]);
    });
  });
  const times = keep.map((i) => allTimes[i]);
  const meta: Omit<SeriesMeta, 'file'> = {
    feed: 'wind',
    kind: 'forecast',
    fetchedAt,
    grid,
    times,
    vars: [
      { name: 'u', unit: 'm/s', scale: 0.01, offset: 0 },
      { name: 'v', unit: 'm/s', scale: 0.01, offset: 0 },
    ],
    sources: [{ id: 'open-meteo-best-match', name: 'Open-Meteo best match (ICON/GFS/ECMWF)', fromMs: times[0], toMs: lastValid }],
    licence: 'Open-Meteo, CC BY 4.0 (open-meteo.com); model data from DWD, NOAA, ECMWF',
  };
  const bytes = writeSeries(dir, meta, { u, v });
  return `wind: ${grid.cols}×${grid.rows} × ${times.length} frames to ${new Date(lastValid).toISOString().slice(0, 13)}Z, ${(bytes / 1024).toFixed(0)} KB`;
}
