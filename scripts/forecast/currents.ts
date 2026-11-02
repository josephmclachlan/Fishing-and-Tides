/**
 * Surface currents feed (PLAN 2.5): Météo-France SMOC (Copernicus Marine global 1/12° surface
 * currents, including tides and Stokes drift) via Open-Meteo Marine, about 9 days ahead.
 *
 * Two series: `currents` on the 0.25° macro grid (the Caribbean Current and the gyre), and
 * `currents-coast` at the model's own 1/12° over Gandoca–Limón (the coastal jet, which the
 * coarse grid would smear onto the beach). The app overlays the fine one on the coarse one.
 * Sea points only, hourly to day 7 then 3-hourly, as u/v in m/s.
 */
import type { SeriesMeta } from '../../src/adapters/pack.ts';
import type { GridGeom } from '../../src/adapters/pack.ts';
import { REGION } from '../../src/region.ts';
import { gridOver, gridPoints, keepIndices, openMeteoGrid, seaMask, uvToward, writeSeries } from './common.ts';

/** The fine grid: Gandoca–Limón plus a margin, at SMOC's 1/12°. */
export const COAST_BOUNDS = [[-83.5, 9.3], [-82.25, 10.3]] as const;
const KMH = 1 / 3.6;

async function build(dir: string, feed: string, grid: GridGeom, margin: number): Promise<string> {
  const all = gridPoints(grid);
  const sea = seaMask(grid, margin);
  const cells = all.map((_, i) => i).filter((i) => sea[i]);
  const fetchedAt = new Date().toISOString();
  const om = await openMeteoGrid(
    'https://marine-api.open-meteo.com/v1/marine',
    'hourly=ocean_current_velocity,ocean_current_direction&models=meteofrance_currents&forecast_days=10&cell_selection=sea',
    cells.map((i) => all[i]),
  );
  const allTimes = om[0].hourly.time.map((s) => s * 1000);
  // Drop the trailing hours where the model has stopped everywhere.
  let lastIdx = 0;
  for (const p of om) p.hourly.ocean_current_velocity.forEach((x, i) => x != null && (lastIdx = Math.max(lastIdx, i)));
  const keep = keepIndices(allTimes.slice(0, lastIdx + 1));
  const n = grid.cols * grid.rows;
  const u = keep.map(() => new Float32Array(n).fill(NaN));
  const v = keep.map(() => new Float32Array(n).fill(NaN));
  om.forEach((p, j) => {
    const cell = cells[j];
    keep.forEach((ti, k) => {
      const s = p.hourly.ocean_current_velocity[ti], d = p.hourly.ocean_current_direction[ti];
      if (s == null || d == null) return;
      [u[k][cell], v[k][cell]] = uvToward(s * KMH, d);
    });
  });
  const times = keep.map((i) => allTimes[i]);
  const meta: Omit<SeriesMeta, 'file'> = {
    feed,
    kind: 'forecast',
    fetchedAt,
    grid,
    times,
    vars: [
      { name: 'u', unit: 'm/s', scale: 0.001, offset: 0 },
      { name: 'v', unit: 'm/s', scale: 0.001, offset: 0 },
    ],
    sources: [{ id: 'meteofrance_currents', name: 'Météo-France SMOC 1/12° (Copernicus Marine) via Open-Meteo', fromMs: times[0], toMs: times[times.length - 1] }],
    licence: 'Open-Meteo, CC BY 4.0 (open-meteo.com); Copernicus Marine Service / Météo-France',
  };
  const bytes = writeSeries(dir, meta, { u, v });
  return `${feed}: ${cells.length} sea points of ${all.length}, ${times.length} frames to ${new Date(times[times.length - 1]).toISOString().slice(0, 13)}Z, ${(bytes / 1024).toFixed(0)} KB`;
}

export async function buildCurrents(dir: string): Promise<string> {
  const coarse = await build(dir, 'currents', gridOver(REGION.maxBounds, 0.25), 0.15);
  const fine = await build(dir, 'currents-coast', gridOver(COAST_BOUNDS, 1 / 12), 0.05);
  return `${coarse}\n${fine}`;
}
